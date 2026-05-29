import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'
import { base58Decode } from '../_shared/crypto.ts'
import { bytesEqual, hexToBytes } from '../_shared/bytes.ts'
import { anchorDiscriminator } from '../_shared/anchor.ts'

const PROGRAM_ID = Deno.env.get('PROGRAM_ID') ?? '6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N'
const RPC_URL = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.devnet.solana.com'

interface RequestBody {
  loanId: string
  txRepay: string
}

interface ResponseBody {
  loanId: string
  status: 'paid'
  txRepay: string
  repaidAt: string
  explorer: string
}

serve((req) => withAuth(req, async (req, user) => {
  let body: RequestBody
  try { body = await req.json() as RequestBody } catch { return json({ error: 'Invalid JSON' }, 400, req) }
  if (!body.loanId || !body.txRepay) return json({ error: 'loanId + txRepay required' }, 400, req)

  const { data: loan } = await admin
    .from('loans')
    .select('id, tx_repay, status, updated_at, cpf_hash, loan_requests!inner(user_id)')
    .eq('id', body.loanId)
    .maybeSingle()
  if (!loan) return json({ error: 'Loan not found' }, 404, req)

  const loanRequest = loan.loan_requests as { user_id: string }
  if (loanRequest.user_id !== user.id) return json({ error: 'Forbidden' }, 403, req)

  if (loan.tx_repay === body.txRepay && loan.status === 'paid') {
    const resp: ResponseBody = {
      loanId: body.loanId,
      status: 'paid',
      txRepay: body.txRepay,
      repaidAt: (loan.updated_at as string | null) ?? new Date().toISOString(),
      explorer: explorerFor(body.txRepay),
    }
    return json(resp, 200, req)
  }
  if (loan.status === 'paid' && loan.tx_repay && loan.tx_repay !== body.txRepay) {
    return json({ error: 'Loan already repaid with different tx' }, 409, req)
  }

  const rpcResp = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransaction',
      params: [body.txRepay, { commitment: 'confirmed', maxSupportedTransactionVersion: 0, encoding: 'json' }],
    }),
  })

  let rpcJson: { result?: unknown; error?: { message: string } }
  try { rpcJson = await rpcResp.json() } catch { return json({ error: 'RPC response parse failed' }, 502, req) }
  if (rpcJson.error) return json({ error: `RPC error: ${rpcJson.error.message}` }, 502, req)

  const tx = rpcJson.result as {
    meta?: { err?: unknown }
    transaction: {
      message: {
        accountKeys: string[]
        instructions: Array<{ programIdIndex: number; data: string; accounts: number[] }>
      }
    }
  } | null
  if (!tx) return json({ error: 'Tx not found onchain' }, 404, req)
  if (tx.meta?.err) return json({ error: 'Tx failed onchain', detail: tx.meta.err }, 400, req)

  const accountKeys = tx.transaction.message.accountKeys
  const programIdx = accountKeys.indexOf(PROGRAM_ID)
  if (programIdx === -1) return json({ error: `Tx does not invoke program ${PROGRAM_ID}` }, 400, req)

  const repayDisc = await anchorDiscriminator('repay_loan')

  const instructions = tx.transaction.message.instructions
  const matched = instructions.find((ix) => {
    if (ix.programIdIndex !== programIdx) return false
    const bytes = base58Decode(ix.data)
    return bytesEqual(bytes.slice(0, 8), repayDisc)
  })
  if (!matched) return json({ error: 'Tx does not contain repay_loan instruction' }, 400, req)

  // Amarra a ix a ESTE loan: senão qualquer tx repay_loan de outro empréstimo
  // marcaria este como pago. Layout repay_loan: [0]=borrower, [1]=loan PDA.
  const cpfHashHex = loan.cpf_hash as string | null
  if (!cpfHashHex) return json({ error: 'Loan has no cpf_hash; cannot verify repay binding' }, 409, req)
  const expectedLoanPda = await deriveLoanPda(cpfHashHex)

  const { data: borrowerRow } = await admin
    .from('users').select('wallet').eq('id', loanRequest.user_id).maybeSingle()
  const expectedBorrower = borrowerRow?.wallet as string | null
  if (!expectedBorrower) return json({ error: 'Borrower wallet missing; cannot verify repay binding' }, 409, req)

  // Versioned tx com Address Lookup Table teria índices fora de accountKeys
  // (que só lista as static keys). Sem isso, a comparação viraria undefined.
  if (matched.accounts[0] >= accountKeys.length || matched.accounts[1] >= accountKeys.length) {
    return json({ error: 'repay_loan accounts out of range (lookup table not supported)' }, 400, req)
  }
  const ixLoanPda = accountKeys[matched.accounts[1]]
  const ixBorrower = accountKeys[matched.accounts[0]]
  if (ixLoanPda !== expectedLoanPda) {
    return json({ error: 'repay_loan instruction targets a different loan PDA' }, 400, req)
  }
  if (ixBorrower !== expectedBorrower) {
    return json({ error: 'repay_loan instruction signed by a different borrower' }, 400, req)
  }

  const now = new Date().toISOString()
  const { data: updated, error: updErr } = await admin
    .from('loans')
    .update({ status: 'paid', tx_repay: body.txRepay })
    .eq('id', body.loanId)
    .is('tx_repay', null)
    .select('id')
    .maybeSingle()
  if (updErr) return json({ error: updErr.message }, 500, req)
  if (!updated) return json({ error: 'Race condition: loan updated concurrently' }, 409, req)

  const resp: ResponseBody = {
    loanId: body.loanId,
    status: 'paid',
    txRepay: body.txRepay,
    repaidAt: now,
    explorer: explorerFor(body.txRepay),
  }
  return json(resp, 200, req)
}))

async function deriveLoanPda(cpfHashHex: string): Promise<string> {
  const { PublicKey } = await import('https://esm.sh/@solana/web3.js@1.95.3?target=denonext')
  const cpfHash = hexToBytes(cpfHashHex)
  const [loanPda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('loan'), cpfHash],
    new PublicKey(PROGRAM_ID),
  )
  return loanPda.toBase58()
}

function explorerFor(sig: string): string {
  const cluster = RPC_URL.includes('devnet') ? 'devnet' : RPC_URL.includes('testnet') ? 'testnet' : 'mainnet-beta'
  return `https://explorer.solana.com/tx/${sig}?cluster=${cluster}`
}
