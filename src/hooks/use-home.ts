import { useCallback, useEffect, useState } from 'react'
import { HAS_BACKEND, getHome, type HomeState } from '@/lib/api'
import { normalizeError } from '@/utils/error'
import type { LoanDecision } from '@/types/domain'

const EMPTY: HomeState = {
  activeLoan: null, loans: [], payouts: [], balanceBRL: 0, pixKey: null, pixKeyType: null,
}

interface UseHomeResult {
  loan: HomeState['activeLoan']
  decision: LoanDecision | null
  balanceBRL: number
  pixKey: string | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useHome(): UseHomeResult {
  const [state, setState] = useState<HomeState>(EMPTY)
  const [loading, setLoading] = useState(HAS_BACKEND)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!HAS_BACKEND) { setState(EMPTY); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      setState(await getHome())
    } catch (e) {
      setError(normalizeError(e))
      setState(EMPTY)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const loan = state.activeLoan
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

  return { loan, decision, balanceBRL: state.balanceBRL, pixKey: state.pixKey, loading, error, reload }
}
