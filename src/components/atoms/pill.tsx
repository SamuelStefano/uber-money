import type { CSSProperties, ReactNode } from 'react'

type PillTone = 'accent' | 'mute' | 'danger' | 'info' | 'paper' | 'onDark'
type PillSize = 'sm' | 'md'

interface PillProps {
  tone?: PillTone
  dot?: boolean
  pulse?: boolean
  icon?: ReactNode
  size?: PillSize
  children: ReactNode
}

interface ToneStyle {
  background: string
  color: string
  border: string
  dotColor: string
}

const TONES: Record<PillTone, ToneStyle> = {
  accent: {
    background: 'var(--accent-soft)',
    color: 'var(--accent-deep)',
    border: '1px solid rgba(0,194,110,0.20)',
    dotColor: 'var(--accent)',
  },
  mute: {
    background: 'rgba(10,10,15,0.04)',
    color: 'var(--mute)',
    border: '1px solid var(--line)',
    dotColor: 'var(--mute)',
  },
  danger: {
    background: 'rgba(220,60,60,0.06)',
    color: '#B23A3A',
    border: '1px solid rgba(220,60,60,0.18)',
    dotColor: '#D04F4F',
  },
  info: {
    background: 'rgba(120,148,255,0.10)',
    color: '#4F6AE0',
    border: '1px solid rgba(120,148,255,0.18)',
    dotColor: '#4F6AE0',
  },
  paper: {
    background: '#fff',
    color: 'var(--mute)',
    border: '1px solid var(--line)',
    dotColor: 'var(--accent)',
  },
  onDark: {
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(255,255,255,0.08)',
    dotColor: 'var(--accent)',
  },
}

const SIZE_STYLE: Record<PillSize, CSSProperties> = {
  sm: { padding: '5px 12px 5px 8px', fontSize: 11, fontWeight: 600 },
  md: { padding: '6px 12px 6px 10px', fontSize: 12, fontWeight: 600 },
}

export function Pill({ tone = 'mute', dot, pulse, icon, size = 'sm', children }: PillProps) {
  const t = TONES[tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      borderRadius: 999,
      background: t.background,
      color: t.color,
      border: t.border,
      letterSpacing: '0.02em',
      ...SIZE_STYLE[size],
    }}>
      {dot ? (
        <span style={{ position: 'relative', width: 6, height: 6, flexShrink: 0 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: t.dotColor }} />
          {pulse ? (
            <span style={{
              position: 'absolute', inset: -3, borderRadius: 999,
              border: `1px solid ${t.dotColor}`, animation: 'pulse-ring 2.2s ease-out infinite',
            }} />
          ) : null}
        </span>
      ) : null}
      {icon ? <span style={{ display: 'inline-flex' }}>{icon}</span> : null}
      {children}
    </span>
  )
}

export type { PillProps, PillTone, PillSize }
