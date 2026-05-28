import { Card } from '@/components/atoms/card'
import { Money } from '@/components/atoms/money'
import { Icon } from '@/components/atoms/icon'

interface BalanceCardProps {
  balance: number
  pixKey: string | null
}

export function BalanceCard({ balance, pixKey }: BalanceCardProps) {
  return (
    <Card dark padded={false} style={{
      padding: '40px 36px 32px', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(180deg, #15151A 0%, #0A0A0B 100%)',
      boxShadow: '0 30px 80px -30px rgba(0,194,110,0.30), 0 1px 0 rgba(255,255,255,0.06) inset',
    }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(640px 320px at 100% -10%, rgba(0,194,110,0.42) 0%, transparent 60%),
          radial-gradient(420px 260px at 0% 110%, rgba(255,176,71,0.10) 0%, transparent 60%)
        `,
      }} />
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: 24, right: 24, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
      }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600,
            letterSpacing: '0.16em', textTransform: 'uppercase',
          }}>Saldo disponível</div>
          <div style={{ marginTop: 12 }}>
            <Money value={balance} size={76} color="#fff" weight={800} symbolSize={36} centsSize={28} />
          </div>

          {pixKey ? (
            <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              <span style={{ fontWeight: 500 }}>Chave Pix · {pixKey}</span>
              <button
                type="button"
                onClick={() => { try { navigator.clipboard.writeText(pixKey) } catch { /* noop */ } }}
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  display: 'inline-flex', alignItems: 'center',
                  width: 26, height: 26, borderRadius: 8,
                  justifyContent: 'center', background: 'rgba(255,255,255,0.06)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <Icon.Copy />
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 22, fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
              Chave Pix cadastrada na hora de receber
            </div>
          )}
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px 6px 10px', borderRadius: 999,
          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)',
          fontSize: 11, fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)',
          letterSpacing: '0.04em',
        }}>
          <span style={{ position: 'relative', width: 6, height: 6 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'var(--accent)' }} />
            <span style={{
              position: 'absolute', inset: -3, borderRadius: 999,
              border: '1px solid var(--accent)', animation: 'pulse-ring 2.2s ease-out infinite',
            }} />
          </span>
          Solana · conectada
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 12, right: 18,
        fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.22)', fontWeight: 600, pointerEvents: 'none',
      }}>
        secured on solana
      </div>
    </Card>
  )
}
