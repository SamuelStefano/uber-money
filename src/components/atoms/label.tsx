import type { ReactNode } from 'react'

interface LabelProps {
  children: ReactNode
  className?: string
}

export function Label({ children, className }: LabelProps) {
  return (
    <span
      className={className}
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--mute)',
      }}
    >
      {children}
    </span>
  )
}
