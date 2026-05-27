import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  style?: CSSProperties
  padded?: boolean
  dark?: boolean
}

export function Card({ children, style, padded = true, dark = false }: CardProps) {
  return (
    <div style={{
      background: dark ? 'var(--ink)' : '#fff',
      color: dark ? '#fff' : 'var(--ink)',
      borderRadius: 24,
      padding: padded ? 20 : 0,
      boxShadow: dark
        ? '0 12px 36px -8px rgba(10,10,15,0.35), 0 1px 0 rgba(255,255,255,0.04) inset'
        : 'var(--shadow-md), inset 0 0 0 1px var(--line-2)',
      ...style,
    }}>{children}</div>
  )
}
