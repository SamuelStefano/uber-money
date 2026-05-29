import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'
import { isValidCpf } from '../_shared/cpf.ts'
import { createCharge, WOOVI_MODE } from '../_shared/woovi.ts'
import { connection, deriveVaultPda, PublicKey } from '../_shared/anchor-signer.ts'
import { cappedBRL, brlToUsdc } from '../_shared/limits.ts'

const PROGRAM_ID = new PublicKey(Deno.env.get('PROGRAM_ID') ?? '6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N')
const VAULT_TOKEN_SEED = new TextEncoder().encode('vault_token')

interface Body {
  loanId: string
  cashOutTxSig: string
  pixKey: string
  pixKeyType: 'cpf' | 'email' | 'phone' | 'evp'
  clientIntentId: string
}

function deriveVaultTokenAccount(): PublicKey {
  const [vault] = deriveVaultPda()
  const [vta] = PublicKey.findProgramAddressSync([VAULT_TOKEN_SEED, vault.toBuffer()], PROGRAM_ID)
  return vta
}

// D5: verificação on-chain barata mas honesta. Prova que a tx assinada pelo
// motorista chamou nosso programa E o vault token account recebeu >= amount.
async function verifyCashOut(sig: string, borrowerWallet: string, amountUSDC: bigint): Promise<string | null> {
  const conn = connection()
  const tx = await conn.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })
  if (!tx) return 'tx not found on-chain (devnet)'
  if (tx.meta?.err) return `tx failed on-chain: ${JSON.stringify(tx.meta.err)}`

  const keys = tx.transaction.message.staticAccountKeys.map((k) => k.toBase58())
  if (!keys.includes(PROGRAM_ID.toBase58())) return 'tx does not call uber_money program'
  if (keys[0] !== borrowerWallet) return 'tx fee payer is not the borrower wallet'

  const vta = deriveVaultTokenAccount().toBase58()
  const vtaIndex = keys.indexOf(vta)
  if (vtaIndex < 0) return 'vault token account not in tx'

  const pre = tx.meta?.preTokenBalances?.find((b) => b.accountIndex === vtaIndex)
  const post = tx.meta?.postTokenBalances?.find((b) => b.accountIndex === vtaIndex)
  const preAmt = BigInt(pre?.uiTokenAmount.amount ?? '0')
  const postAmt = BigInt(post?.uiTokenAmount.amount ?? '0')
  if (postAmt - preAmt < amountUSDC) return `vault received ${postAmt - preAmt}, expected >= ${amountUSDC}`

  return null
}

serve((req) => withAuth(req, async (req, user) => {
  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, req) }
  if (!body.loanId || !body.cashOutTxSig || !body.pixKey || !body.pixKeyType || !body.clientIntentId) {
    return json({ error: 'loanId, cashOutTxSig, pixKey, pixKeyType, clientIntentId required' }, 400, req)
  }

  const { data: loan, error: loanErr } = await admin
    .from('loans')
    .select('id, status, principal_brl, loan_requests!inner(user_id)')
    .eq('id', body.loanId)
    .maybeSingle()
  if (loanErr || !loan) return json({ error: 'Loan not found' }, 404, req)
  if ((loan as { loan_requests: { user_id: string } }).loan_requests.user_id !== user.id) {
    return json({ error: 'Forbidden' }, 403, req)
  }
  if (loan.status !== 'open') return json({ error: 'Loan not open' }, 400, req)

  if (body.pixKeyType === 'cpf') {
    const { data: cnhDoc } = await admin
      .from('documents').select('ocr_data').eq('user_id', user.id).eq('kind', 'cnh').maybeSingle()
    const ocrCpf = (cnhDoc?.ocr_data as { cpf?: string } | null)?.cpf
    const norm = (s: string) => s.replace(/\D/g, '')
    if (!ocrCpf || norm(ocrCpf) !== norm(body.pixKey)) {
      return json({ error: 'pixKey CPF does not match CNH on file' }, 403, req)
    }
  }

  const amountBRL = cappedBRL(Number(loan.principal_brl))
  const amountUSDC = brlToUsdc(Number(loan.principal_brl))

  const { data: userRow } = await admin.from('users').select('wallet').eq('id', user.id).maybeSingle()
  if (!userRow?.wallet) return json({ error: 'User wallet not registered' }, 400, req)

  // CRIT-1: uma tx cash_out vira Pix uma vez; um loan saca uma vez. Retry com
  // mesmo client_intent_id passa (upsert idempotente); intent diferente = replay.
  const { data: sigDup } = await admin.from('cashout_intents')
    .select('id').eq('source', 'uber_money').eq('solana_signature', body.cashOutTxSig)
    .neq('status', 'failed').neq('client_intent_id', body.clientIntentId).limit(1)
  if (sigDup?.length) return json({ error: 'cash_out tx already consumed' }, 409, req)
  const { data: loanDup } = await admin.from('cashout_intents')
    .select('id').eq('source', 'uber_money').eq('loan_id', body.loanId)
    .neq('status', 'failed').neq('client_intent_id', body.clientIntentId).limit(1)
  if (loanDup?.length) return json({ error: 'loan already cashed out' }, 409, req)

  const verifyErr = await verifyCashOut(body.cashOutTxSig, userRow.wallet, amountUSDC)
  if (verifyErr) {
    await admin.from('cashout_intents').upsert({
      source: 'uber_money', client_intent_id: body.clientIntentId, user_id: user.id,
      loan_id: body.loanId, amount_usdc: Number(amountUSDC), amount_brl: amountBRL,
      pix_key: body.pixKey, pix_key_type: body.pixKeyType,
      solana_signature: body.cashOutTxSig, status: 'failed', error_message: verifyErr,
    }, { onConflict: 'source,client_intent_id' })
    return json({ error: 'cash_out verification failed', details: verifyErr }, 422, req)
  }

  const correlationId = crypto.randomUUID()
  const { data: payout, error: payoutErr } = await admin
    .from('payouts')
    .insert({
      loan_id: body.loanId, kind: 'release', amount_brl: amountBRL,
      pix_key: body.pixKey, pix_key_type: body.pixKeyType,
      status: 'pending', woovi_correlation_id: correlationId,
    })
    .select('id')
    .single()
  if (payoutErr) return json({ error: payoutErr.message }, 500, req)

  await admin.from('cashout_intents').upsert({
    source: 'uber_money', client_intent_id: body.clientIntentId, user_id: user.id,
    loan_id: body.loanId, amount_usdc: Number(amountUSDC), amount_brl: amountBRL,
    pix_key: body.pixKey, pix_key_type: body.pixKeyType,
    solana_signature: body.cashOutTxSig, pix_payout_id: payout.id, status: 'usdc_received',
  }, { onConflict: 'source,client_intent_id' })

  let charge
  try {
    charge = await createCharge({
      correlationId,
      amountBRL,
      comment: `Uber Money - saque emprestimo ${body.loanId.slice(0, 8)}`,
      customer: { name: 'Motorista Uber Money', ...(body.pixKeyType === 'cpf' && isValidCpf(body.pixKey.replace(/\D/g, '')) ? { taxID: body.pixKey.replace(/\D/g, '') } : {}) },
    })
  } catch (e) {
    await admin.from('payouts').update({ status: 'failed', error_message: String(e) }).eq('id', payout.id)
    await admin.from('cashout_intents').update({ status: 'pix_failed_refund_due', error_message: String(e) })
      .eq('source', 'uber_money').eq('client_intent_id', body.clientIntentId)
    return json({ error: 'Woovi charge failed', details: String(e) }, 502, req)
  }

  await admin.from('payouts').update({ woovi_payload: charge.raw }).eq('id', payout.id)
  await admin.from('cashout_intents').update({ status: 'pix_dispatched' })
    .eq('source', 'uber_money').eq('client_intent_id', body.clientIntentId)

  if (WOOVI_MODE === 'mock') {
    // EdgeRuntime mata o isolate ao retornar a resposta — sem waitUntil o
    // setTimeout nunca dispara e o payout fica preso em 'pending'.
    const confirmLater = new Promise<void>((resolve) => setTimeout(async () => {
      try {
        await admin.from('payouts').update({
          status: 'confirmed',
          woovi_payload: { mocked: true, correlationId, paidAt: new Date().toISOString() },
        }).eq('id', payout.id)
        await admin.from('cashout_intents').update({ status: 'pix_confirmed' })
          .eq('source', 'uber_money').eq('client_intent_id', body.clientIntentId)
      } catch (e) { console.error('[usdc-to-pix mock] update failed', e) } finally { resolve() }
    }, 8000))
    const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime
    if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(confirmLater)
  }

  return json({
    payoutId: payout.id,
    status: 'pending',
    correlationId,
    amountBRL,
    amountUSDC: Number(amountUSDC),
    txCashOut: body.cashOutTxSig,
    explorer: `https://explorer.solana.com/tx/${body.cashOutTxSig}?cluster=devnet`,
    mode: WOOVI_MODE,
  }, 200, req)
}))
