import { useEffect, useRef, type RefObject } from 'react'

export function useOutsideClick<T extends HTMLElement>(
  enabled: boolean,
  onOutside: () => void,
): RefObject<T | null> {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!enabled) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [enabled, onOutside])
  return ref
}
