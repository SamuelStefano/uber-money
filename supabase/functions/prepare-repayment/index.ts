import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'
import { createCharge, WOOVI_MODE } from '../_shared/woovi.ts'
import { hexToBytes } from '../_shared/bytes.ts'
import { brlToUsdc } from '../_shared/limits.ts'

const PROGRAM_ID = '6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N'

serve((req) => withAuth(req, async (req, user) => {
  let body: { loanId?: unknown }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, req) }

  const { loanId } = body
  if (!loanId || typeof loanId !== 'string') return json({ error: 'loanId required' }, 400, req)

  const { data: loan } = await admin
    .from('loans')
    .select('id, request_id, principal_brl, interest_pct, status, loan_requests!inner(user_id, cpf_hash)')
    .eq('id', loanId)
    .maybeSingle()

  if (!loan) return json({ error: 'Loan not found' }, 404, req)
  if ((loan as any).loan_requests.user_id !== user.id) return json({ error: 'Forbidden' }, 403, req)
  if (loan.status !== 'open') return json({ error: `Loan status is ${loan.status}, cannot repay` }, 409, req)

  const amountBRL = Number(loan.principal_brl) * (1 + Number(loan.interest_pct))
  const amountUSDC = brlToUsdc(amountBRL)

  const { data: existing } = await admin
    .from('payouts')
    .select('id, woovi_correlation_id, woovi_payload, status, attestation_payload')
    .eq('loan_id', loanId)
    .eq('kind', 'repay')
    .in('status', ['pending', 'confirmed'])
    .maybeSingle()

  const cpfHashRaw: unknown = (loan as any).loan_requests.cpf_hash
  const cpfHashBytes = typeof cpfHashRaw === 'string'
    ? hexToBytes(cpfHashRaw)
    : cpfHashRaw instanceof Uint8Array
      ? cpfHashRaw
      : new Uint8Array(32)

  const { PublicKey } = await import('npm:@solana/web3.js@1.95.0')
  const [loanPdaPubkey] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('loan'), cpfHashBytes],
    new PublicKey(PROGRAM_ID),
  )
  const loanPda = loanPdaPubkey.toBase58()

  if (existing) {
    const woovi = (existing.woovi_payload ?? {}) as Record<string, unknown>
    return json({
      payoutId: existing.id,
      correlationId: existing.woovi_correlation_id,
      brcode: (woovi.brcode as string) ?? '',
      qrCodeImage: (woovi.qrCodeImage as string) ?? '',
      amountBRL,
      amountUSDC: amountUSDC.toString(),
      loanPda,
      status: existing.status,
      mode: WOOVI_MODE,
      expiresAt: (woovi.expiresAt as string) ?? null,
      attestation: existing.attestation_payload ?? null,
    }, 200, req)
  }

  const correlationId = crypto.randomUUID()

  const { data: docs } = await admin
    .from('documents')
    .select('ocr_data')
    .eq('user_id', user.id)
    .eq('kind', 'cnh')
    .maybeSingle()
  const cnh = docs?.ocr_data as { name?: string; cpf?: string } | null
  const customer = {
    name: cnh?.name ?? 'Motorista',
    taxID: cnh?.cpf?.replace(/\D/g, ''),
  }

  let charge: Awaited<ReturnType<typeof createCharge>>
  try {
    charge = await createCharge({
      correlationId,
      amountBRL,
      comment: `Pagamento empréstimo ${loanId.slice(0, 8)}`,
      customer,
    })
  } catch (e) {
    return json({ error: 'Woovi charge failed', details: String(e) }, 502, req)
  }

  const { data: inserted, error: insErr } = await admin
    .from('payouts')
    .insert({
      loan_id: loanId,
      kind: 'repay',
      amount_brl: amountBRL,
      pix_key: 'pix-in-charge',
      pix_key_type: 'random',
      status: 'pending',
      woovi_correlation_id: correlationId,
      woovi_payload: {
        brcode: charge.brcode,
        qrCodeImage: charge.qrCodeImage,
        expiresAt: charge.expiresAt,
        raw: charge.raw,
      },
    })
    .select('id')
    .single()

  if (insErr || !inserted) return json({ error: insErr?.message ?? 'Insert failed' }, 500, req)

  return json({
    payoutId: inserted.id,
    correlationId,
    brcode: charge.brcode,
    qrCodeImage: charge.qrCodeImage,
    amountBRL,
    amountUSDC: amountUSDC.toString(),
    loanPda,
    status: 'pending' as const,
    mode: WOOVI_MODE,
    expiresAt: charge.expiresAt,
    attestation: null,
  }, 200, req)
}))
