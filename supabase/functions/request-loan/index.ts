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

  // Compute score
  const result = computeScore({ userId: user.id, amountBRL: Number(body.amountBRL), ocrData: printDoc.ocr_data ?? {} })

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
