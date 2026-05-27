import { Card } from '@/components/atoms/card'
import { Money } from '@/components/atoms/money'

interface LimitCardProps {
  limit: number
  hint: string
}

export function LimitCard({ limit, hint }: LimitCardProps) {
  return (
    <Card padded style={{ padding: 22 }}>
      <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 600 }}>Limite disponível</div>
      <div style={{ marginTop: 4 }}>
        <Money value={limit} size={32} symbolSize={16} centsSize={14} weight={800} />
      </div>
      <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--mute)' }}>{hint}</div>
    </Card>
  )
}
