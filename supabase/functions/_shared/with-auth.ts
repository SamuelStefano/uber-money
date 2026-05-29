import type { User } from 'https://esm.sh/@supabase/supabase-js@2'
import { admin } from './admin.ts'
import { json, handleOptions } from './cors.ts'

export async function withAuth(
  req: Request,
  handler: (req: Request, user: User) => Promise<Response>,
): Promise<Response> {
  if (req.method === 'OPTIONS') return handleOptions(req)
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return json({ error: 'Unauthorized' }, 401, req)
  return handler(req, user)
}
