import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { json } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { withAuth } from '../_shared/with-auth.ts'

interface LoanRow {
  id: string
  request_id: string | null
  principal_brl: number
  interest_pct: number
  due_date: string
  status: string
  created_at: string
}

interface PayoutRow {
  id: string
  loan_id: string
  kind: string
  amount_brl: number
  pix_key: string
  created_at: string
  endtoend_id: string | null
}

serve((req) => withAuth(req, async (req, user) => {
  const { data: reqs } = await admin
    .from('loan_requests').select('id').eq('user_id', user.id)
  const reqIds = (reqs ?? []).map((r: { id: string }) => r.id)

  const [loansRes, userRes] = await Promise.all([
    reqIds.length
      ? admin.from('loans')
          .select('id, request_id, principal_brl, interest_pct, due_date, status, created_at')
          .in('request_id', reqIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as LoanRow[] }),
    admin.from('users').select('pix_key, pix_key_type').eq('id', user.id).maybeSingle(),
  ])

  const loans = (loansRes.data as LoanRow[] | null) ?? []
  const loanIds = loans.map((l) => l.id)

  const { data: payoutsData } = loanIds.length
    ? await admin.from('payouts')
        .select('id, loan_id, kind, amount_brl, pix_key, created_at, endtoend_id')
        .in('loan_id', loanIds)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
    : { data: [] as PayoutRow[] }
  const payouts = (payoutsData as PayoutRow[] | null) ?? []

  const userRow = userRes.data as { pix_key: string | null; pix_key_type: string | null } | null

  const activeLoan = loans.find((l) => l.status === 'open' || l.status === 'late') ?? null
  const released = payouts.filter((p) => p.kind === 'release').reduce((s, p) => s + Number(p.amount_brl), 0)
  const repaid = payouts.filter((p) => p.kind === 'repay').reduce((s, p) => s + Number(p.amount_brl), 0)

  return json({
    activeLoan,
    loans,
    payouts,
    balanceBRL: released - repaid,
    pixKey: userRow?.pix_key ?? null,
    pixKeyType: userRow?.pix_key_type ?? null,
  }, 200, req)
}))
