import type { CSSProperties } from 'react'
import { CONFETTI_DURATION_MS } from '@/consts/confetti'
import type { ConfettiDot } from '@/utils/confetti'

interface ConfettiLayerProps {
  dots: ConfettiDot[]
}

export function ConfettiLayer({ dots }: ConfettiLayerProps) {
  if (dots.length === 0) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {dots.map((d) => (
        <span
          key={d.id}
          className="confetti-dot"
          style={{
            left: `${d.left}%`, top: '42%', background: d.color,
            animation: `confetti-fly ${CONFETTI_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1) ${d.delay}ms forwards`,
            width: 10, height: 10,
            '--dx': `${d.dx}px`, '--dy': `${d.dy}px`, '--rot': `${d.rot}deg`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
