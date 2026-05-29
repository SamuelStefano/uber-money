import { useEffect, useState, type DependencyList } from 'react'
import { normalizeError } from '@/utils/error'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useAsyncFn<T>(
  fn: () => Promise<T>,
  deps: DependencyList,
  options?: { enabled?: boolean; initial?: T | null },
): AsyncState<T> {
  const enabled = options?.enabled ?? true
  const initial = options?.initial ?? null

  const [data, setData] = useState<T | null>(initial)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fn()
      .then((result) => { if (!cancelled) { setData(result); setError(null) } })
      .catch((e: unknown) => { if (!cancelled) setError(normalizeError(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
