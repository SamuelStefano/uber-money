import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'

const ENVIRONMENT = (Deno.env.get('ENVIRONMENT') ?? '').toLowerCase()
const ALLOWED_ENVS = new Set(['development', 'sandbox', 'staging', 'local'])

serve((req) => withAuth(req, async (req, user) => {
  if (!ALLOWED_ENVS.has(ENVIRONMENT)) {
    return json({ error: 'dev-reset disabled in this environment' }, 403, req)
  }

  let body: { wallet?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, req) }
  const wallet = body.wallet?.trim()
  if (!wallet) return json({ error: 'wallet required' }, 400, req)

  const { data: u } = await admin.from('users').select('id, wallet').eq('wallet', wallet).maybeSingle()
  if (!u) return json({ ok: true, wiped: 0, note: 'wallet not found — nothing to do' }, 200, req)
  if (u.id !== user.id) return json({ error: 'Forbidden — wallet not owned by caller' }, 403, req)

  const userId = u.id
  const report: Record<string, number | string> = { userId }

  const { data: docs } = await admin.from('documents').select('storage_url').eq('user_id', userId)
  const paths = (docs ?? []).map((d: { storage_url: string }) => d.storage_url).filter(Boolean)
  if (paths.length) {
    await admin.storage.from('documents').remove(paths).catch(() => {})
    report.storage = paths.length
  }

  const { data: reqs } = await admin.from('loan_requests').select('id').eq('user_id', userId)
  const reqIds = (reqs ?? []).map((r: { id: string }) => r.id)
  report.loan_requests = reqIds.length

  if (reqIds.length) {
    for (let i = 0; i < reqIds.length; i += 100) {
      const slice = reqIds.slice(i, i + 100)
      const { data: loans } = await admin.from('loans').select('id').in('request_id', slice)
      const loanIds = (loans ?? []).map((l: { id: string }) => l.id)
      // cashout_intents tem FK ON DELETE RESTRICT em loan_id e pix_payout_id;
      // apaga antes de payouts/loans senão o wipe viola a constraint.
      if (loanIds.length) await admin.from('cashout_intents').delete().in('loan_id', loanIds)
      if (loanIds.length) await admin.from('payouts').delete().in('loan_id', loanIds)
      await admin.from('score_snapshots').delete().in('request_id', slice)
      await admin.from('loans').delete().in('request_id', slice)
      await admin.from('loan_requests').delete().in('id', slice)
    }
  }
  await admin.from('cashout_intents').delete().eq('user_id', userId)

  await admin.from('documents').delete().eq('user_id', userId)
  await admin.from('users').delete().eq('id', userId)
  const { error: authErr } = await admin.auth.admin.deleteUser(userId)
  report.auth_user_deleted = authErr ? authErr.message : 'ok'

  return json({ ok: true, ...report }, 200, req)
}))
