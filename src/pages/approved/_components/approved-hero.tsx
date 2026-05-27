import { Button } from '@/components/atoms/button'
import { Icon } from '@/components/atoms/icon'
import { Money } from '@/components/atoms/money'
import type { LoanDecision } from '@/types/domain'

type ClaimPhase = 'approved' | 'claiming' | 'done'

interface ApprovedHeroProps {
  decision: LoanDecision
  phase: ClaimPhase
  onClaim: () => void
  onShowReceipt: () => void
  onHome: () => void
}

export function ApprovedHero({ decision, phase, onClaim, onShowReceipt, onHome }: ApprovedHeroProps) {
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
      }}>Crédito aprovado</div>

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

      <div style={{ marginTop: 44, display: 'flex', gap: 12, justifyContent: 'center' }}>
        {phase !== 'done' ? (
          <Button
            variant="accent"
            size="lg"
            loading={phase === 'claiming'}
            onClick={onClaim}
            icon={<Icon.Pix />}
            style={{ minWidth: 280 }}
          >
            {phase === 'claiming' ? 'Enviando Pix…' : 'Receber via Pix agora'}
          </Button>
        ) : (
          <>
            <Button variant="primary" size="lg" onClick={onShowReceipt} icon={<Icon.CheckCircle />} style={{ minWidth: 220 }}>
              Ver comprovante
            </Button>
            <Button variant="secondary" size="lg" onClick={onHome} style={{ minWidth: 220 }}>
              Voltar pro início
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
