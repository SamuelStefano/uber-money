import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { withAuth } from '../_shared/with-auth.ts'
import { computeScoreV5, validateScoreInputs } from '../_shared/score-rules.ts'

serve((req) => withAuth(req, async (req, _user) => {
  let raw: unknown
  try { raw = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, req) }

  const parsed = validateScoreInputs(raw)
  if ('error' in parsed) return json(parsed, 400, req)

  const result = computeScoreV5(parsed)
  return json(result, 200, req)
}))
