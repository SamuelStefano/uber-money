import type { ReactNode } from 'react'

type ChipSize = 'md' | 'lg'

interface ChipProps {
  label: string
  icon?: ReactNode
  active?: boolean
  onClick?: () => void
  size?: ChipSize
}

export function Chip({ label, icon, active, onClick, size = 'md' }: ChipProps) {
  const h = size === 'lg' ? 52 : 40
  return (
    <button onClick={onClick} style={{
      height: h, padding: size === 'lg' ? '0 18px' : '0 14px',
      borderRadius: 999, fontSize: size === 'lg' ? 16 : 14, fontWeight: 600,
      background: active ? 'var(--ink)' : '#fff',
      color: active ? '#fff' : 'var(--ink)',
      boxShadow: active ? '0 6px 16px -6px rgba(10,10,15,0.35)' : 'inset 0 0 0 1.2px var(--line)',
      display: 'inline-flex', alignItems: 'center', gap: 8,
      transition: 'all 160ms ease', letterSpacing: '-0.01em',
    }}>
      {icon ? <span style={{ display: 'flex', opacity: active ? 1 : 0.7 }}>{icon}</span> : null}
      {label}
    </button>
  )
}
