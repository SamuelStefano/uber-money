import { Card } from '@/components/atoms/card'
import { Money } from '@/components/atoms/money'
import { LockedCardCta } from '@/components/molecules/locked-card-cta'

interface LimitCardProps {
  limit: number | null
  hint: string
  onUnlock?: () => void
}

export function LimitCard({ limit, hint, onUnlock }: LimitCardProps) {
  const locked = limit === null
  return (
    <Card padded style={{ padding: 22 }}>
      <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 600 }}>Limite de crédito</div>
      {locked ? (
        <LockedCardCta heading="Solicite crédito pra desbloquear seu limite" caption={hint} onUnlock={onUnlock} />
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
