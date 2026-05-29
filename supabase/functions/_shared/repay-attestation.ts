import { admin } from './admin.ts'
import { hexToBytes } from './bytes.ts'
import { deriveLoanPda, PublicKey } from './anchor-signer.ts'
import { brlToUsdc, cappedBRL } from './limits.ts'

// Gera RepayAttestation Ed25519 e grava em payouts.attestation_payload.
// Fonte única: woovi-webhook (Pix real) e prepare-repayment (auto-confirm mock/sandbox).
export async function generateAndStoreRepayAttestation(payoutId: string, loanId: string): Promise<void> {
  // Idempotente: webhook + auto-confirm (sandbox) ou retry do Woovi podem chamar
  // duas vezes. Re-gerar trocaria o nonce e invalidaria uma tx que o front já montou.
  const { data: existing } = await admin
    .from('payouts').select('attestation_payload').eq('id', payoutId).maybeSingle()
  if (existing?.attestation_payload) return

  const { data: loan } = await admin
    .from('loans')
    .select('id, principal_brl, interest_pct, loan_requests!inner(cpf_hash, user_id)')
    .eq('id', loanId)
    .maybeSingle()
  if (!loan) { console.error('[repay-attest] loan not found', { loanId }); return }

  const cpfHashRaw = loan.loan_requests.cpf_hash
  if (!cpfHashRaw) { console.error('[repay-attest] cpf_hash missing', { loanId }); return }

  const { data: userRow } = await admin
    .from('users').select('wallet').eq('id', loan.loan_requests.user_id).maybeSingle()
  if (!userRow?.wallet) { console.error('[repay-attest] user wallet missing', { loanId }); return }

  const cpfHashHex = typeof cpfHashRaw === 'string'
    ? cpfHashRaw.replace(/^\\x/, '')
    : Array.from(cpfHashRaw as Uint8Array).map((b) => b.toString(16).padStart(2, '0')).join('')
  const cpfHash = hexToBytes(cpfHashHex)

  const [loanPdaPubkey] = deriveLoanPda(cpfHash)
  const loanPda = loanPdaPubkey.toBytes()
  const borrower = new PublicKey(userRow.wallet).toBytes()

  const amountBRL = cappedBRL(Number(loan.principal_brl) * (1 + Number(loan.interest_pct)))
  const amountUSDC = brlToUsdc(amountBRL)

  const { buildRepayAttestation } = await import('./ed25519-attest-repay.ts')
  const attestation = await buildRepayAttestation({
    cpfHash, loanPda, borrower, amountPaidUsdc: amountUSDC,
  })

  await admin.from('payouts').update({ attestation_payload: attestation }).eq('id', payoutId)
}
