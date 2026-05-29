import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'
import { isValidCpf } from '../_shared/cpf.ts'
import { deriveCpfHash } from '../_shared/cpf-hash.ts'
import { cappedBRL, brlToUsdc } from '../_shared/limits.ts'

const WOOVI_API_KEY = Deno.env.get('WOOVI_API_KEY') ?? ''
const WOOVI_BASE = Deno.env.get('WOOVI_API_URL') ?? 'https://api.openpix.com.br/api/v1'
const WOOVI_MODE = (Deno.env.get('WOOVI_MODE') ?? 'mock').toLowerCase()

type ReleaseBody = { action: 'release'; loanId: string }
type PayoutBody  = { action: 'payout';  loanId: string; pixKey: string; pixKeyType: 'cpf' | 'email' | 'phone' | 'evp' }
type Body = ReleaseBody | PayoutBody

serve((req) => withAuth(req, async (req, user) => {
  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, req) }

  switch (body.action) {
    case 'release': return handleRelease(req, admin, user.id, body)
    case 'payout':  return handlePayout(req, admin, user.id, body)
    default:        return json({ error: 'Invalid action — expected "release" or "payout"' }, 400, req)
  }
}))

async function handleRelease(req: Request, admin: SupabaseClient, userId: string, body: ReleaseBody) {
  if (!body.loanId) return json({ error: 'loanId required' }, 400, req)

  const { data: loan, error: loanErr } = await admin
    .from('loans')
    .select('id, status, principal_brl, tx_release, request_id, loan_requests!inner(user_id, score)')
    .eq('id', body.loanId)
    .maybeSingle()
  if (loanErr || !loan) return json({ error: 'Loan not found' }, 404, req)
  if ((loan as any).loan_requests.user_id !== userId) return json({ error: 'Forbidden' }, 403, req)
  if (loan.tx_release) {
    return json({
      step: 'release',
      status: 'already_released',
      txRelease: loan.tx_release,
      explorer: `https://explorer.solana.com/tx/${loan.tx_release}?cluster=devnet`,
    }, 200, req)
  }

  const derived = await deriveCpfHash(admin, userId)
  if (!derived.ok) return json({ error: derived.error }, derived.status, req)
  const { cpfHash, cpfHashHex } = derived

  const amountUSDC = brlToUsdc(Number(loan.principal_brl))
  const score = Number((loan as any).loan_requests.score ?? 0)

  await admin.from('loans').update({ cpf_hash: cpfHashHex }).eq('id', loan.id)
  await admin.from('loan_requests').update({ cpf_hash: cpfHashHex }).eq('id', loan.request_id)

  const { data: userRow2 } = await admin.from('users').select('wallet').eq('id', userId).maybeSingle()
  if (!userRow2?.wallet) return json({ error: 'User wallet not registered' }, 400, req)

  try {
    const { releaseLoan: anchorReleaseLoan, PublicKey } = await import('../_shared/anchor-signer.ts') as
      typeof import('../_shared/anchor-signer.ts') & { PublicKey: typeof import('https://esm.sh/@solana/web3.js@1.95.3?target=denonext').PublicKey }
    const txSig = await anchorReleaseLoan({
      cpfHash,
      amount: amountUSDC,
      score,
      borrower: new PublicKey(userRow2.wallet),
    })
    const { error: updErr } = await admin.from('loans').update({ tx_release: txSig }).eq('id', loan.id)
    if (updErr) console.error('[release] CRITICAL: tx_release update failed after on-chain success', { txSig, loanId: loan.id, err: updErr.message })
    return json({
      step: 'release',
      status: 'confirmed',
      cpfHashHex,
      amountUSDC: Number(amountUSDC),
      score,
      txRelease: txSig,
      explorer: `https://explorer.solana.com/tx/${txSig}?cluster=devnet`,
    }, 200, req)
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    if (errMsg.includes('SOLANA_ADMIN_KEYPAIR_JSON') || errMsg.includes('Vault account not found')) {
      return json({
        step: 'release',
        status: 'pending_anchor_deploy',
        cpfHashHex,
        amountUSDC: Number(amountUSDC),
        score,
        note: errMsg,
      }, 202, req)
    }
    return json({ error: 'release_loan failed', details: errMsg }, 502, req)
  }
}

async function handlePayout(req: Request, admin: SupabaseClient, userId: string, body: PayoutBody) {
  if (!body.loanId || !body.pixKey || !body.pixKeyType) {
    return json({ error: 'loanId, pixKey, pixKeyType required' }, 400, req)
  }

  const { data: loan, error: loanErr } = await admin
    .from('loans')
    .select('id, status, principal_brl, request_id, loan_requests!inner(user_id)')
    .eq('id', body.loanId)
    .maybeSingle()
  if (loanErr || !loan) return json({ error: 'Loan not found' }, 404, req)
  if ((loan as any).loan_requests.user_id !== userId) return json({ error: 'Forbidden' }, 403, req)
  if (loan.status !== 'open') return json({ error: 'Loan not open' }, 400, req)

  if (body.pixKeyType === 'cpf') {
    const { data: cnhDoc } = await admin
      .from('documents').select('ocr_data').eq('user_id', userId).eq('kind', 'cnh').maybeSingle()
    const ocrCpf = (cnhDoc?.ocr_data as any)?.cpf
    const norm = (s: string) => s.replace(/\D/g, '')
    if (!ocrCpf || norm(ocrCpf) !== norm(body.pixKey)) {
      return json({ error: 'pixKey CPF does not match CNH on file' }, 403, req)
    }
  }

  const amountBRL = cappedBRL(Number(loan.principal_brl))
  const amountCents = Math.round(amountBRL * 100)

  const { data: existing } = await admin
    .from('payouts')
    .select('id, status, amount_brl, woovi_correlation_id')
    .eq('loan_id', body.loanId)
    .eq('kind', 'release')
    .in('status', ['pending', 'confirmed'])
    .maybeSingle()
  if (existing) {
    let finalStatus = existing.status
    if (existing.status === 'pending' && (WOOVI_MODE === 'sandbox' || WOOVI_MODE === 'mock')) {
      const { error: confirmErr } = await admin.from('payouts').update({
        status: 'confirmed',
        endtoend_id: `SANDBOX-${(existing.woovi_correlation_id ?? existing.id).slice(0, 8)}`,
      }).eq('id', existing.id).eq('status', 'pending')
      if (!confirmErr) finalStatus = 'confirmed'
    }
    return json({
      payoutId: existing.id,
      status: finalStatus,
      correlationId: existing.woovi_correlation_id ?? '',
      amountBRL: Number(existing.amount_brl),
      mode: WOOVI_MODE,
      resumed: true,
    }, 200, req)
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

  if (WOOVI_MODE === 'mock') {
    setTimeout(async () => {
      try {
        await admin.from('payouts').update({
          status: 'confirmed',
          woovi_payload: { mocked: true, correlationId, paidAt: new Date().toISOString() },
        }).eq('id', payout.id)
      } catch (e) { console.error('[mock] update failed', e) }
    }, 8000)
    return json({
      payoutId: payout.id, status: 'pending', correlationId, amountBRL,
      mode: 'mock', note: 'Confirmed in ~8s via mock background update.',
    }, 200, req)
  }

  const { data: cnhDocForCustomer } = await admin
    .from('documents').select('ocr_data').eq('user_id', userId).eq('kind', 'cnh').maybeSingle()
  const customerCpf = ((cnhDocForCustomer?.ocr_data as { cpf?: string } | null)?.cpf ?? '').replace(/\D/g, '')
  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  const customerEmail = authUser?.user?.email
  const customerPhone = authUser?.user?.phone

  const customer: Record<string, string> = { name: 'Motorista Uber Money' }
  const candidateCpf = (customerCpf && customerCpf.length === 11)
    ? customerCpf
    : (body.pixKeyType === 'cpf' ? body.pixKey.replace(/\D/g, '') : '')
  if (candidateCpf && isValidCpf(candidateCpf)) {
    customer.taxID = candidateCpf
  } else if (candidateCpf) {
    console.warn('[payout] CPF candidato falhou checksum, omitindo taxID')
  }
  if (customerEmail) customer.email = customerEmail
  else if (body.pixKeyType === 'email') customer.email = body.pixKey
  if (customerPhone) customer.phone = customerPhone
  else if (body.pixKeyType === 'phone') customer.phone = body.pixKey

  if (!customer.taxID && !customer.email && !customer.phone) {
    return json({ error: 'Customer needs valid CPF, email or phone (none available)' }, 400, req)
  }

  try {
    const wooviRes = await fetch(`${WOOVI_BASE}/charge`, {
      method: 'POST',
      headers: { 'Authorization': WOOVI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correlationID: correlationId,
        value: amountCents,
        comment: `Uber Money - emprestimo ${body.loanId.slice(0, 8)}`,
        customer,
      }),
      signal: AbortSignal.timeout(25_000),
    })
    const wooviText = await wooviRes.text()
    let wooviData: any = null
    try { wooviData = JSON.parse(wooviText) } catch { /* keep raw */ }

    if (!wooviRes.ok) {
      await admin.from('payouts').update({ status: 'failed', error_message: wooviText, woovi_payload: wooviData }).eq('id', payout.id)
      return json({ error: 'Woovi error', status: wooviRes.status, details: wooviText }, 502, req)
    }

    if (WOOVI_MODE === 'sandbox') {
      await admin.from('payouts').update({
        status: 'confirmed',
        endtoend_id: `SANDBOX-${correlationId.slice(0, 8)}`,
        woovi_payload: { ...wooviData, sandbox_auto_confirmed_at: new Date().toISOString() },
      }).eq('id', payout.id)
      return json({ payoutId: payout.id, status: 'confirmed', correlationId, amountBRL, mode: WOOVI_MODE }, 200, req)
    }

    await admin.from('payouts').update({ woovi_payload: wooviData }).eq('id', payout.id)
    return json({ payoutId: payout.id, status: 'pending', correlationId, amountBRL, mode: WOOVI_MODE }, 200, req)
  } catch (e) {
    await admin.from('payouts').update({ status: 'failed', error_message: String(e) }).eq('id', payout.id)
    return json({ error: 'Network error', details: String(e) }, 502, req)
  }
}
