import { useEffect, useRef, useState } from 'react'

interface UseCountUpOptions {
  duration?: number
  initialValue?: number
}

export function useCountUp(target: number, opts: UseCountUpOptions = {}): number {
  const { duration = 1100, initialValue } = opts
  const startVal = initialValue ?? target
  const [value, setValue] = useState(startVal)
  const prevTarget = useRef<number>(startVal)

  useEffect(() => {
    const from = prevTarget.current
    prevTarget.current = target
    if (from === target) return

    let rafId = 0
    let alive = true
    const t0 = performance.now()

    const tick = (t: number) => {
      if (!alive) return
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(from + (target - from) * eased)
      if (p < 1) rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    const safety = window.setTimeout(() => {
      if (alive) setValue(target)
    }, duration + 200)

    return () => {
      alive = false
      cancelAnimationFrame(rafId)
      clearTimeout(safety)
    }
  }, [target, duration])

  return value
}
