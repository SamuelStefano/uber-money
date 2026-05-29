import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'

serve((req) => withAuth(req, async (req, user) => {
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
}))
