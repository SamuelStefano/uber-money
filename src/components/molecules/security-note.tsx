import type { ReactNode } from 'react'
import { Icon } from '@/components/atoms/icon'

interface SecurityNoteProps {
  children: ReactNode
}

export function SecurityNote({ children }: SecurityNoteProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 14,
        border: '1px solid var(--line)',
        borderRadius: 14,
        fontSize: 12,
        color: 'var(--mute-2)',
      }}
    >
      <Icon.Shield style={{ flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  )
}
