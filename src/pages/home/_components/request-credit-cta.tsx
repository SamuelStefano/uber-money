import { Icon } from '@/components/atoms/icon'

interface RequestCreditCtaProps {
  onClick: () => void
}

export function RequestCreditCta({ onClick }: RequestCreditCtaProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', borderRadius: 28, padding: '32px 28px 28px',
        background: 'var(--accent)', color: '#04140B', textAlign: 'left',
        boxShadow: 'var(--shadow-glow)',
        display: 'flex', flexDirection: 'column', gap: 24,
        transition: 'transform 180ms ease',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.65, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pra você</div>
      <div className="tight" style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
        Solicitar<br />crédito
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
        <span>Aprovação em segundos</span>
        <span style={{
          width: 40, height: 40, borderRadius: 999,
          background: '#04140B', color: 'var(--accent)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.ArrowRight />
        </span>
      </div>
    </button>
  )
}
