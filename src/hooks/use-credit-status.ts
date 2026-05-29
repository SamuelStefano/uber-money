import { HAS_BACKEND, getCreditStatus, type CreditStatus } from '@/lib/api'
import { useAsyncFn } from './use-async-fn'

const EMPTY: CreditStatus = { has_request: false, score: null, limit_brl: null, interest_pct: null }

export function useCreditStatus(): { credit: CreditStatus; loading: boolean } {
  const { data, loading } = useAsyncFn(getCreditStatus, [], { enabled: HAS_BACKEND, initial: EMPTY })
  return { credit: data ?? EMPTY, loading }
}
