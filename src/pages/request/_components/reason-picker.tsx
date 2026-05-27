import { Chip } from '@/components/atoms/chip'
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
  value: LoanReasonId
  onChange: (r: LoanReasonId) => void
}

export function ReasonPicker({ value, onChange }: ReasonPickerProps) {
  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Pra quê?</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {REASONS.map((r) => (
          <Chip
            key={r.id}
            size="lg"
            icon={ICON_MAP[r.iconName]}
            label={r.label}
            active={value === r.id}
            onClick={() => onChange(r.id)}
          />
        ))}
      </div>
    </div>
  )
}
