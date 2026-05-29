import { Icon } from '@/components/atoms/icon'
import { BRL } from '@/utils/format'
import type { ActivityItem } from '@/types/domain'

interface ActivityRowProps {
  item: ActivityItem
  onClick?: () => void
}

export function ActivityRow({ item, onClick }: ActivityRowProps) {
  const isPix = item.kind === 'pix'
  const sign = isPix ? '+' : '−'
  const tint = isPix ? 'var(--accent-deep)' : 'var(--ink)'
  const clickable = !!onClick
  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      style={{
        background: '#fff', borderRadius: 18, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: 'inset 0 0 0 1px var(--line-2)',
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: isPix ? 'var(--accent-soft)' : '#F4F4F5',
        color: isPix ? 'var(--accent-deep)' : 'var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isPix ? <Icon.Pix /> : <Icon.Spark />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{item.label}</div>
        <div style={{ fontSize: 12.5, color: 'var(--mute)', marginTop: 1 }}>{item.sub}</div>
      </div>
      <div className="tabular tight" style={{ fontSize: 18, fontWeight: 700, color: tint }}>
        {sign}{BRL(item.amountBRL)}
      </div>
    </div>
  )
}
