import { useCallback, useEffect, useState } from 'react'
import { HAS_BACKEND, getUserActivity } from '@/lib/api'
import { useStore } from './use-store'
import type { ActivityItem } from '@/types/domain'

interface UseUserHistoryOutput {
  items: ActivityItem[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useUserHistory(): UseUserHistoryOutput {
  const [{ user, activity }] = useStore()
  const [items, setItems] = useState<ActivityItem[]>(activity)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!HAS_BACKEND || !user) {
      setItems(activity)
      return
    }
    setLoading(true); setError(null)
    try {
      const fetched = await getUserActivity()
      setItems(fetched.length > 0 ? fetched : activity)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setItems(activity)
    } finally {
      setLoading(false)
    }
  }, [user, activity])

  useEffect(() => { void reload() }, [reload])

  return { items, loading, error, reload }
}
