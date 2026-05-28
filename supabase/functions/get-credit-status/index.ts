// get-credit-status — devolve último score/limite do user pra renderizar
// home com placeholders quando ainda não solicitou crédito (feedback Tainan).
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, handleOptions } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)

  const authHeader = req.headers.get('Authorization') ?? ''
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401, req)

  const [{ data: lastReq }, { data: docs }] = await Promise.all([
    admin
      .from('loan_requests')
      .select('score, limit_brl, interest_pct, created_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('documents')
      .select('kind')
      .eq('user_id', user.id),
  ])

  const kinds = new Set((docs ?? []).map((d: { kind: string }) => d.kind))
  const has_cnh = kinds.has('cnh')
  const has_earnings = kinds.has('print_earnings')

  const base = { has_cnh, has_earnings }
  if (!lastReq) {
    return json({ ...base, has_request: false, score: null, limit_brl: null, interest_pct: null }, 200, req)
  }

  return json({
    ...base,
    has_request: true,
    score: Number(lastReq.score),
    limit_brl: Number(lastReq.limit_brl),
    interest_pct: Number(lastReq.interest_pct),
    last_request_at: lastReq.created_at,
    last_status: lastReq.status,
  }, 200, req)
})
