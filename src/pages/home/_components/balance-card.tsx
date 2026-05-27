import { Card } from '@/components/atoms/card'
import { Money } from '@/components/atoms/money'
import { Icon } from '@/components/atoms/icon'

interface BalanceCardProps {
  balance: number
  pixKey: string
}

export function BalanceCard({ balance, pixKey }: BalanceCardProps) {
  return (
    <Card dark padded={false} style={{ padding: '36px 36px 32px', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none',
        background: 'radial-gradient(600px 280px at 100% 0%, rgba(0,194,110,0.35) 0%, transparent 60%)',
      }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>Saldo disponível</div>
          <div style={{ marginTop: 8 }}>
            <Money value={balance} size={72} color="#fff" weight={800} symbolSize={36} centsSize={28} />
          </div>
          <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            <span style={{ fontWeight: 500 }}>Chave Pix · {pixKey}</span>
            <button
              type="button"
              onClick={() => { try { navigator.clipboard.writeText(pixKey) } catch { /* noop */ } }}
              style={{
                color: 'rgba(255,255,255,0.7)',
                display: 'inline-flex', alignItems: 'center',
                width: 26, height: 26, borderRadius: 8,
                justifyContent: 'center', background: 'rgba(255,255,255,0.06)',
              }}
            >
              <Icon.Copy />
            </button>
          </div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px 6px 8px', borderRadius: 999,
          background: 'rgba(0,194,110,0.18)', color: 'var(--accent)',
          fontSize: 12, fontWeight: 600, border: '1px solid rgba(0,194,110,0.28)',
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: 999,
            background: 'var(--accent)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', color: '#04140B',
          }}>
            <Icon.Check style={{ width: 12, height: 12 }} />
          </span>
          Carteira conectada
        </div>
      </div>
    </Card>
  )
}
