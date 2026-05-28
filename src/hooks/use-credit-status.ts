import { useEffect, useState } from 'react'
import { HAS_BACKEND, getCreditStatus, type CreditStatus } from '@/lib/api'

const EMPTY: CreditStatus = { has_request: false, score: null, limit_brl: null, interest_pct: null }

export function useCreditStatus(): { credit: CreditStatus; loading: boolean } {
  const [credit, setCredit] = useState<CreditStatus>(EMPTY)
  const [loading, setLoading] = useState(HAS_BACKEND)

  useEffect(() => {
    if (!HAS_BACKEND) { setLoading(false); return }
    let cancelled = false
    getCreditStatus()
      .then((c) => { if (!cancelled) setCredit(c) })
      .catch(() => { if (!cancelled) setCredit(EMPTY) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { credit, loading }
}
