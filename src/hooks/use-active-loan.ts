import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/api'
import type { LoanDecision } from '@/types/domain'

interface ActiveLoanRow {
  id: string
  request_id: string | null
  principal_brl: number
  interest_pct: number
  due_date: string
  status: string
}

interface ActiveLoanState {
  loan: ActiveLoanRow | null
  loading: boolean
}

interface UseActiveLoanResult extends ActiveLoanState {
  decision: LoanDecision | null
  reload: () => Promise<void>
}

export function useActiveLoan(): UseActiveLoanResult {
  const [loan, setLoan] = useState<ActiveLoanRow | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const sb = supabase()
    const { data } = await sb
      .from('loans')
      .select('id, request_id, principal_brl, interest_pct, due_date, status')
      .in('status', ['open', 'late'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLoan((data as ActiveLoanRow | null) ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { void reload() }, [reload])

  const decision: LoanDecision | null = loan
    ? {
        approved: true,
        score: 0,
        approvedAmountBRL: loan.principal_brl,
        installments: 1,
        interestPct: Number(loan.interest_pct) * 100,
        dueDate: loan.due_date,
        loanId: loan.id,
        requestId: loan.request_id ?? '',
        loanStatus: loan.status as 'open' | 'late',
      }
    : null

  return { loan, loading, decision, reload }
}
