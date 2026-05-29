import { Icon } from '@/components/atoms/icon'
import { REASONS } from '@/consts/credit'
import type { LoanReasonId } from '@/types/api'
import type { ReactNode } from 'react'

const ICON_MAP: Record<string, ReactNode> = {
  tire: <Icon.Tire />,
  fuel: <Icon.Fuel />,
  wrench: <Icon.Wrench />,
  dots: <Icon.Dots />,
}

interface ReasonPickerProps {
  value: LoanReasonId | null
  onChange: (r: LoanReasonId) => void
}

export function ReasonPicker({ value, onChange }: ReasonPickerProps) {
  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Pra quê?</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {REASONS.map((r) => {
          const active = value === r.id
          return (
            <button
              key={r.id}
              onClick={() => onChange(r.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                padding: '14px 16px', borderRadius: 18,
                background: active ? 'var(--ink)' : '#fff',
                color: active ? '#fff' : 'var(--ink)',
                boxShadow: active ? '0 8px 20px -8px rgba(10,10,15,0.4)' : 'inset 0 0 0 1.2px var(--line)',
                transition: 'all 160ms ease', letterSpacing: '-0.01em',
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600 }}>
                <span style={{ display: 'flex', opacity: active ? 1 : 0.7 }}>{ICON_MAP[r.iconName]}</span>
                {r.label}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, opacity: active ? 0.7 : 0.55 }}>{r.range}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
