// request-loan — orquestra: valida docs do user, computa score, persiste loan_request + loan + snapshot.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json, handleOptions } from '../_shared/cors.ts'
import { computeScore } from '../_shared/compute-score.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions()

  const authHeader = req.headers.get('Authorization') ?? ''
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  let body: { amountBRL: number; reason: 'emergency' | 'vehicle_repair' | 'fuel' | 'other' }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  if (!body.amountBRL || body.amountBRL <= 0) return json({ error: 'Invalid amount' }, 400)

  // Validate docs exist
  const { data: docs } = await admin.from('documents').select('id, kind, ocr_data').eq('user_id', user.id)
  const printDoc = docs?.find((d: any) => d.kind === 'print_earnings')
  const cnhDoc = docs?.find((d: any) => d.kind === 'cnh')
  if (!printDoc || !cnhDoc) return json({ error: 'Missing required documents (CNH + earnings)' }, 400)

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
  if (rpcErr) return json({ error: rpcErr.message }, 500)

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
    if (loanErr) return json({ error: loanErr.message }, 500)
    loanId = loan.id
  }

  return json({
    approved: result.approved,
    score: result.score,
    approvedAmountBRL: result.approved ? body.amountBRL : 0,
    limit_brl: result.limit_brl,
    interestPct: result.interest_pct * 100, // pct (front mostra 2.9 etc)
    installments: body.amountBRL <= 200 ? 2 : body.amountBRL <= 350 ? 3 : 4,
    dueDate: result.approved ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
    loanId,
    requestId,
  })
})
