import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'
import {
  computeScoreV5,
  type FinalidadeId,
  type ScoreBreakdown,
  type ScoreInputs,
  type ScoreResult,
} from '../_shared/score-rules.ts'
import { normalizeScoreBody } from '../_shared/normalize-score-body.ts'
import { buildAttestation, type AttestationPayload } from '../_shared/ed25519-attest.ts'
import { brlToUsdc } from '../_shared/limits.ts'

const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000
const LOAN_TENOR_DAYS = 7

type LoanReason = 'emergency' | 'vehicle_repair' | 'fuel' | 'other'

const FINALIDADE_TO_REASON: Record<FinalidadeId, LoanReason> = {
  pneu: 'vehicle_repair',
  suspensao: 'vehicle_repair',
  bateria_chupeta: 'vehicle_repair',
  bateria_troca: 'vehicle_repair',
  troca_oleo: 'vehicle_repair',
  outro: 'other',
}

interface ResponseBody {
  approved: boolean
  rejection_reason: string | null
  score: number
  approvedAmountBRL: number
  limit_brl: number
  interestPct: number
  installments: number
  dueDate: string | null
  requestId: string
  attestation: AttestationPayload | null
  score_breakdown: ScoreBreakdown
}

serve((req) => withAuth(req, async (req, user) => {
  let raw: Record<string, unknown>
  try { raw = (await req.json()) as Record<string, unknown> } catch { return json({ error: 'Invalid JSON' }, 400, req) }

  const parsed = await normalizeScoreBody(raw, user.id)
  if ('error' in parsed) return json(parsed, 400, req)
  const inputs: ScoreInputs = parsed

  const { data: docs } = await admin.from('documents').select('id, kind, ocr_data').eq('user_id', user.id)
  const cnhDoc = docs?.find((d) => d.kind === 'cnh')
  if (!cnhDoc) return json({ error: 'Missing CNH document' }, 400, req)

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
    .eq('amount_brl', inputs.amount_brl)
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
      rejection_reason: null,
      score: reusedScore,
      approvedAmountBRL: reusedAmount,
      limit_brl: reusedLimit,
      interestPct: reusedInterest * 100,
      installments: installmentsFor(reusedAmount),
      dueDate: new Date(Date.now() + LOAN_TENOR_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      requestId: prior.id,
      attestation,
      score_breakdown: emptyBreakdown(),
    }
    return json(resp, 200, req)
  }

  const result: ScoreResult = computeScoreV5(inputs)
  const requestId = crypto.randomUUID()
  const dbReason = FINALIDADE_TO_REASON[inputs.finalidade_id]

  const { error: rpcErr } = await admin.rpc('create_loan_request_with_snapshot', {
    p_id: requestId,
    p_user_id: user.id,
    p_amount_brl: inputs.amount_brl,
    p_reason: dbReason,
    p_status: result.approved ? 'approved' : 'rejected',
    p_score: result.score,
    p_limit_brl: result.limit_brl,
    p_interest_pct: result.interest_pct,
    p_inputs: {
      algorithm_version: 'v5',
      inputs,
      breakdown: result.breakdown,
      rejection_reason: result.rejection_reason,
      finalidade_id: inputs.finalidade_id,
    },
  })
  if (rpcErr) return json({ error: rpcErr.message }, 500, req)

  const attestation = result.approved
    ? await maybeBuildAttestation({
        cpfRaw, pepperHex, borrowerWallet,
        score: result.score, amountBRL: inputs.amount_brl, requestId,
      })
    : null

  const resp: ResponseBody = {
    approved: result.approved,
    rejection_reason: result.rejection_reason,
    score: result.score,
    approvedAmountBRL: result.approved_amount_brl,
    limit_brl: result.limit_brl,
    interestPct: result.interest_pct * 100,
    installments: result.installments,
    dueDate: result.approved
      ? new Date(Date.now() + LOAN_TENOR_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null,
    requestId,
    attestation,
    score_breakdown: result.breakdown,
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
  const amountUSDC = brlToUsdc(ctx.amountBRL)
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

function emptyBreakdown(): ScoreBreakdown {
  return {
    tempo_uber: 'ruim',
    dias_semana: 'ruim',
    corridas_semana: 'ruim',
    fonte_renda: 'ruim',
    nota_motorista: 'ruim',
    status_veiculo: 'ruim',
    negativacao: 'ruim',
  }
}
