// request-loan — orquestra: valida docs do user, computa score, persiste loan_request + loan + snapshot.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, handleOptions } from '../_shared/cors.ts'
import { computeScore } from '../_shared/compute-score.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAX_AMOUNT_BRL = Number(Deno.env.get('PAYOUT_MAX_BRL') ?? '10')
const VALID_REASONS = ['emergency', 'vehicle_repair', 'fuel', 'other'] as const
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

// ⚠️ LENIENT_MODE: pra demos/sandbox. Se OCR não extraiu renda do print Uber
// (Claude Vision pode falhar com prints ruins ou imagens fake), assume valores
// default que aprovam o motorista. Desativar em prod — Tainan/TL valida real.
const LENIENT_MODE = (Deno.env.get('OCR_LENIENT_MODE') ?? 'true').toLowerCase() === 'true'
const LENIENT_INCOME_DEFAULT = Number(Deno.env.get('OCR_LENIENT_INCOME') ?? '6500') // gera score ~650 (>= threshold 600)
const LENIENT_RIDES_DEFAULT = Number(Deno.env.get('OCR_LENIENT_RIDES') ?? '180')

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)

  const authHeader = req.headers.get('Authorization') ?? ''
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401, req)

  let body: { amountBRL: number; reason: typeof VALID_REASONS[number] }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, req) }
  if (!body.amountBRL || body.amountBRL <= 0) return json({ error: 'Invalid amount' }, 400, req)
  if (body.amountBRL > MAX_AMOUNT_BRL) return json({ error: `Amount exceeds cap R$${MAX_AMOUNT_BRL}` }, 400, req)
  if (!VALID_REASONS.includes(body.reason)) {
    return json({ error: `Invalid reason — must be one of ${VALID_REASONS.join(', ')}` }, 400, req)
  }

  // Validate docs exist
  const { data: docs } = await admin.from('documents').select('id, kind, ocr_data').eq('user_id', user.id)
  const printDoc = docs?.find((d: any) => d.kind === 'print_earnings')
  const cnhDoc = docs?.find((d: any) => d.kind === 'cnh')
  if (!printDoc || !cnhDoc) return json({ error: 'Missing required documents (CNH + earnings)' }, 400, req)

  // ⚠️ LENIENT_MODE: fallback se OCR não extraiu renda.
  // Permite demo/teste sem CNH/print válidos. TL decide validar real em prod.
  let ocrData: Record<string, unknown> = (printDoc.ocr_data as Record<string, unknown>) ?? {}
  const ocrIncome = ocrData.gross_monthly_income
  if (LENIENT_MODE && (typeof ocrIncome !== 'number' || !ocrIncome)) {
    console.warn('[request-loan] LENIENT_MODE: OCR sem renda válida, aplicando defaults', {
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

  // Compute score
  const result = computeScore({ userId: user.id, amountBRL: Number(body.amountBRL), ocrData })

  // Atomic insert via RPC
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

  let loanId: string | null = null
  if (result.approved) {
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: loan, error: loanErr } = await admin
      .from('loans')
      .insert({
        request_id: requestId,
        principal_brl: body.amountBRL,
        interest_pct: result.interest_pct,
        due_date: dueDate,
        status: 'open',
      })
      .select('id')
      .single()
    if (loanErr) return json({ error: loanErr.message }, 500, req)
    loanId = loan.id
  }

  return json({
    approved: result.approved,
    score: result.score,
    approvedAmountBRL: result.approved ? body.amountBRL : 0,
    limit_brl: result.limit_brl,
    interestPct: result.interest_pct * 100,
    installments: result.installments,
    dueDate: result.approved ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
    loanId,
    requestId,
  }, 200, req)
})
