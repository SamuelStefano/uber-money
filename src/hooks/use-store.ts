import { useEffect, useState } from 'react'
import { Store } from '@/store'
import type { StoreState, StoreUpdater } from '@/types/store'

export function useStore(): [StoreState, (patch: StoreUpdater) => void] {
  const [s, setS] = useState<StoreState>(Store.get())
  useEffect(() => Store.subscribe(setS), [])
  return [s, Store.set]
}
