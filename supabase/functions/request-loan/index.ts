import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'
import { computeScore } from '../_shared/compute-score.ts'
import { buildAttestation, type AttestationPayload } from '../_shared/ed25519-attest.ts'

const MAX_AMOUNT_BRL = Number(Deno.env.get('PAYOUT_MAX_BRL') ?? '10')
const VALID_REASONS = ['emergency', 'vehicle_repair', 'fuel', 'other'] as const
type Reason = typeof VALID_REASONS[number]

const LENIENT_MODE = (Deno.env.get('OCR_LENIENT_MODE') ?? 'true').toLowerCase() === 'true'
const LENIENT_INCOME_DEFAULT = Number(Deno.env.get('OCR_LENIENT_INCOME') ?? '6500')
const LENIENT_RIDES_DEFAULT = Number(Deno.env.get('OCR_LENIENT_RIDES') ?? '180')

const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000
const LOAN_TENOR_DAYS = 7
const USDC_DECIMALS = 1e6
const BRL_PER_USDC = 5

interface RequestBody {
  amountBRL: number
  reason: Reason
}

interface ResponseBody {
  approved: boolean
  score: number
  approvedAmountBRL: number
  limit_brl: number
  interestPct: number
  installments: number
  dueDate: string | null
  requestId: string
  attestation: AttestationPayload | null
}

serve((req) => withAuth(req, async (req, user) => {
  let body: RequestBody
  try { body = await req.json() as RequestBody } catch { return json({ error: 'Invalid JSON' }, 400, req) }
  if (!body.amountBRL || body.amountBRL <= 0) return json({ error: 'Invalid amount' }, 400, req)
  if (body.amountBRL > MAX_AMOUNT_BRL) return json({ error: `Amount exceeds cap R$${MAX_AMOUNT_BRL}` }, 400, req)
  if (!VALID_REASONS.includes(body.reason)) {
    return json({ error: `Invalid reason — must be one of ${VALID_REASONS.join(', ')}` }, 400, req)
  }

  const { data: docs } = await admin.from('documents').select('id, kind, ocr_data').eq('user_id', user.id)
  const printDoc = docs?.find((d) => d.kind === 'print_earnings')
  const cnhDoc = docs?.find((d) => d.kind === 'cnh')
  if (!printDoc || !cnhDoc) return json({ error: 'Missing required documents (CNH + earnings)' }, 400, req)

  const cpfRaw = ((cnhDoc.ocr_data as Record<string, unknown> | null)?.cpf as string | undefined ?? '').replace(/\D/g, '')

  const { data: userRow } = await admin
    .from('users').select('cpf_pepper, wallet').eq('id', user.id).maybeSingle()
  const pepperHex = typeof userRow?.cpf_pepper === 'string' ? userRow.cpf_pepper : null
  const borrowerWallet = (userRow?.wallet as string | undefined) ?? null

  const since = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS).toISOString()
  const { data: prior } = await admin
    .from('loan_requests')
    .select('id, amount_brl, score, limit_brl, interest_pct, created_at')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (prior) {
    const reusedScore = Number(prior.score ?? 0)
    const reusedAmount = Number(prior.amount_brl)
    const reusedLimit = Number(prior.limit_brl)
    const reusedInterest = Number(prior.interest_pct)
    const attestation = await maybeBuildAttestation({
      cpfRaw, pepperHex, borrowerWallet, score: reusedScore,
      amountBRL: reusedAmount, requestId: prior.id,
    })
    const resp: ResponseBody = {
      approved: true,
      score: reusedScore,
      approvedAmountBRL: reusedAmount,
      limit_brl: reusedLimit,
      interestPct: reusedInterest * 100,
      installments: installmentsFor(reusedAmount),
      dueDate: new Date(Date.now() + LOAN_TENOR_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      requestId: prior.id,
      attestation,
    }
    return json(resp, 200, req)
  }

  let ocrData: Record<string, unknown> = (printDoc.ocr_data as Record<string, unknown>) ?? {}
  const ocrIncome = ocrData.gross_monthly_income
  if (LENIENT_MODE && (typeof ocrIncome !== 'number' || !ocrIncome)) {
    console.warn('[request-loan] LENIENT_MODE: OCR sem renda valida, aplicando defaults', {
      userId: user.id, rawOcr: ocrData,
    })
    ocrData = {
      ...ocrData,
      gross_monthly_income: LENIENT_INCOME_DEFAULT,
      ride_count: ocrData.ride_count ?? LENIENT_RIDES_DEFAULT,
      confidence: 'medium',
      lenient_applied: true,
    }
  }

  const result = computeScore({ userId: user.id, amountBRL: Number(body.amountBRL), ocrData })

  const requestId = crypto.randomUUID()
  const { error: rpcErr } = await admin.rpc('create_loan_request_with_snapshot', {
    p_id: requestId,
    p_user_id: user.id,
    p_amount_brl: body.amountBRL,
    p_reason: body.reason,
    p_status: result.approved ? 'approved' : 'rejected',
    p_score: result.score,
    p_limit_brl: result.limit_brl,
    p_interest_pct: result.interest_pct,
    p_inputs: result.inputs,
  })
  if (rpcErr) return json({ error: rpcErr.message }, 500, req)

  const attestation = result.approved
    ? await maybeBuildAttestation({
        cpfRaw, pepperHex, borrowerWallet,
        score: result.score, amountBRL: body.amountBRL, requestId,
      })
    : null

  const resp: ResponseBody = {
    approved: result.approved,
    score: result.score,
    approvedAmountBRL: result.approved ? body.amountBRL : 0,
    limit_brl: result.limit_brl,
    interestPct: result.interest_pct * 100,
    installments: result.installments,
    dueDate: result.approved
      ? new Date(Date.now() + LOAN_TENOR_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null,
    requestId,
    attestation,
  }
  return json(resp, 200, req)
}))

interface AttestationCtx {
  cpfRaw: string
  pepperHex: string | null
  borrowerWallet: string | null
  score: number
  amountBRL: number
  requestId: string
}

async function maybeBuildAttestation(ctx: AttestationCtx): Promise<AttestationPayload | null> {
  if (!ctx.cpfRaw || ctx.cpfRaw.length !== 11) return null
  if (!ctx.pepperHex || !ctx.borrowerWallet) return null
  const amountUSDC = BigInt(Math.round(Math.min(ctx.amountBRL, MAX_AMOUNT_BRL) * USDC_DECIMALS / BRL_PER_USDC))
  try {
    return await buildAttestation({
      cpf: ctx.cpfRaw,
      pepperHex: ctx.pepperHex,
      amountUSDC,
      score: ctx.score,
      borrowerWallet: ctx.borrowerWallet,
      requestId: ctx.requestId,
    })
  } catch (e) {
    console.error('[request-loan] buildAttestation failed', e)
    return null
  }
}

function installmentsFor(amountBRL: number): number {
  if (amountBRL <= 3) return 1
  if (amountBRL <= 7) return 2
  return 3
}

