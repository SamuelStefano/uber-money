import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { withAuth } from '../_shared/with-auth.ts'
import { computeScoreV5 } from '../_shared/score-rules.ts'
import { normalizeScoreBody } from '../_shared/normalize-score-body.ts'

serve((req) => withAuth(req, async (req, user) => {
  let body: Record<string, unknown>
  try { body = await req.json() as Record<string, unknown> } catch { return json({ error: 'Invalid JSON' }, 400, req) }

  const parsed = await normalizeScoreBody(body, user.id)
  if ('error' in parsed) return json(parsed, 400, req)

  return json(computeScoreV5(parsed), 200, req)
}))
