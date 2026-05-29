import { Button } from '@/components/atoms/button'
import { Icon } from '@/components/atoms/icon'
import { Money } from '@/components/atoms/money'
import { TxLink } from '@/components/molecules/tx-link'
import type { LoanDecision } from '@/types/domain'

// DR-002 D4: 2-step UX (Q8 TL).
type ClaimPhase = 'approved' | 'releasing' | 'usdc_received' | 'sacando' | 'done'

interface ReleaseInfo {
  amountUSDC?: number
  txRelease?: string
}

interface ApprovedHeroProps {
  decision: LoanDecision
  phase: ClaimPhase
  release: ReleaseInfo | null
  onEfetuar: () => void
  onSacar: () => void
  onShowReceipt: () => void
  onHome: () => void
}

export function ApprovedHero({ decision, phase, release, onEfetuar, onSacar, onShowReceipt, onHome }: ApprovedHeroProps) {
  const usdcReceived = phase === 'usdc_received' || phase === 'sacando' || phase === 'done'

  return (
    <div style={{ textAlign: 'center', position: 'relative', maxWidth: 640 }}>
      <div style={{ position: 'relative', width: 136, height: 136, margin: '0 auto 32px' }}>
        <div style={{
          position: 'absolute', inset: -20, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,194,110,0.32) 0%, transparent 70%)',
        }} />
        <svg width="136" height="136" viewBox="0 0 96 96" style={{ display: 'block' }}>
          <circle cx="48" cy="48" r="44" fill="var(--accent)" />
          <circle cx="48" cy="48" r="44" fill="none" stroke="var(--accent-deep)" strokeWidth="2" opacity="0.4" />
          <path d="M30 49 L43 62 L66 36" stroke="#04140B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>

      <div style={{
        fontSize: 13, color: 'var(--mute)', fontWeight: 600,
        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12,
      }}>
        {usdcReceived ? 'USDC na sua wallet' : 'Crédito aprovado'}
      </div>

      <Money value={decision.approvedAmountBRL} size={120} symbolSize={52} centsSize={44} weight={800} />

      <div style={{
        marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 14,
        fontSize: 14, color: 'var(--mute)', fontWeight: 500,
        padding: '8px 16px', borderRadius: 999, background: '#fff',
        boxShadow: 'inset 0 0 0 1px var(--line)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent)' }} />
          Score {Math.round(decision.score / 10)}/100
        </span>
        <span style={{ width: 1, height: 14, background: 'var(--line)' }} />
        <span>{decision.installments}× sem complicação</span>
        <span style={{ width: 1, height: 14, background: 'var(--line)' }} />
        <span>{decision.interestPct.toFixed(1)}%/mês</span>
      </div>

      {release?.txRelease && (
        <div style={{
          marginTop: 16, fontSize: 12, color: 'var(--mute)',
          maxWidth: 480, margin: '16px auto 0',
        }}>
          tx Solana: <TxLink hash={release.txRelease} cluster="devnet" short />
        </div>
      )}

      <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {phase === 'approved' || phase === 'releasing' ? (
          <>
            <Button
              variant="accent"
              size="lg"
              loading={phase === 'releasing'}
              onClick={onEfetuar}
              icon={<Icon.CheckCircle />}
              style={{ minWidth: 280 }}
            >
              {phase === 'releasing' ? 'Efetuando on-chain…' : 'Efetuar empréstimo'}
            </Button>
            {phase === 'approved' && (
              <button
                onClick={onHome}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--mute)', fontWeight: 500, padding: '6px 12px',
                }}
              >
                Voltar à home
              </button>
            )}
          </>
        ) : phase === 'usdc_received' || phase === 'sacando' ? (
          <>
            <Button
              variant="accent"
              size="lg"
              loading={phase === 'sacando'}
              onClick={onSacar}
              icon={<Icon.Pix />}
              style={{ minWidth: 280 }}
            >
              {phase === 'sacando' ? 'Enviando Pix…' : 'Sacar como Pix'}
            </Button>
            {phase === 'usdc_received' && (
              <button
                onClick={onHome}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--mute)', fontWeight: 500, padding: '6px 12px',
                }}
              >
                Sacar depois · voltar à home
              </button>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button variant="primary" size="lg" onClick={onShowReceipt} icon={<Icon.CheckCircle />} style={{ minWidth: 220 }}>
              Ver comprovante
            </Button>
            <Button variant="secondary" size="lg" onClick={onHome} style={{ minWidth: 220 }}>
              Voltar pro início
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
