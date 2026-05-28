import { Card } from '@/components/atoms/card'
import { Money } from '@/components/atoms/money'

interface LimitCardProps {
  limit: number | null
  hint: string
  onUnlock?: () => void
}

export function LimitCard({ limit, hint, onUnlock }: LimitCardProps) {
  const locked = limit === null
  return (
    <Card padded style={{ padding: 22 }}>
      <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 600 }}>Limite disponível</div>
      {locked ? (
        <button
          onClick={onUnlock}
          style={{
            marginTop: 8, padding: 0, background: 'transparent', border: 'none',
            textAlign: 'left', cursor: onUnlock ? 'pointer' : 'default',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Solicite crédito pra desbloquear seu limite
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--mute)' }}>{hint}</div>
        </button>
      ) : (
        <>
          <div style={{ marginTop: 4 }}>
            <Money value={limit} size={32} symbolSize={16} centsSize={14} weight={800} />
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--mute)' }}>{hint}</div>
        </>
      )}
    </Card>
  )
}
