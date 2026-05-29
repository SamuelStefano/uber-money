import { Card } from '@/components/atoms/card'
import { Money } from '@/components/atoms/money'
import { Pill } from '@/components/atoms/pill'
import { Button } from '@/components/atoms/button'
import { dateBR } from '@/utils/format'

interface ActiveLoanCardProps {
  principalBRL: number
  interestPct: number
  dueDate: string
  status: 'open' | 'late'
  onRepay: () => void
}

export function ActiveLoanCard({ principalBRL, interestPct, dueDate, status, onRepay }: ActiveLoanCardProps) {
  const isLate = status === 'late'
  const pillTone = isLate ? 'danger' : 'info'
  const pillLabel = isLate ? 'Em atraso' : 'Em aberto'

  return (
    <Card padded={false} style={{ padding: '32px 28px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div style={{
          fontSize: 11, color: 'var(--mute)', fontWeight: 600,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>
          Empréstimo em aberto
        </div>
        <Pill tone={pillTone} dot size="sm">{pillLabel}</Pill>
      </div>

      <div style={{ marginBottom: 8 }}>
        <Money value={principalBRL} size={56} weight={800} symbolSize={24} centsSize={20} />
      </div>

      <div style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500, marginBottom: 24 }}>
        {interestPct.toFixed(1)}%/mês · vence {dateBR(dueDate)}
      </div>

      <Button variant="primary" full onClick={onRepay}>
        Pagar agora
      </Button>
    </Card>
  )
}
