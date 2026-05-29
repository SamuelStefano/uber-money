import { Stat } from '@/components/atoms/stat'
import { Backdrop } from '@/components/molecules/backdrop'

export function LoginHero() {
  return (
    <section style={{
      padding: 'clamp(40px, 5vw, 64px) clamp(40px, 6vw, 80px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <Backdrop variant="login-hero" />

      <div style={{ position: 'relative', maxWidth: 580 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px 6px 10px', borderRadius: 999,
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
          boxShadow: 'inset 0 0 0 1px var(--line)',
          fontSize: 12, fontWeight: 600, color: 'var(--mute)', letterSpacing: '0.02em',
        }}>
          <span style={{ position: 'relative', width: 6, height: 6 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'var(--accent)' }} />
            <span style={{
              position: 'absolute', inset: -3, borderRadius: 999,
              border: '1px solid var(--accent)', animation: 'pulse-ring 2.2s ease-out infinite',
            }} />
          </span>
          MICROCRÉDITO PARA MOTORISTAS
        </div>
        <h1 className="tight" style={{
          fontSize: 'clamp(40px, 6.5vw, 80px)', fontWeight: 800,
          margin: '20px 0 0', letterSpacing: '-0.045em', lineHeight: 0.98,
        }}>
          Crédito na hora,<br />
          <span style={{
            background: 'linear-gradient(92deg, var(--accent-deep) 0%, var(--accent) 60%, #6B5BFF 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>pra quem roda.</span>
        </h1>
        <p style={{
          marginTop: 'clamp(16px, 2vw, 28px)',
          fontSize: 'clamp(15px, 1.4vw, 19px)', color: 'var(--mute)',
          lineHeight: 1.5, maxWidth: 460, letterSpacing: '-0.005em',
        }}>
          Furou o pneu? Acabou a gasolina? O dinheiro cai no seu Pix em segundos. Score próprio, juros baixos, sem consulta ao SPC.
        </p>

        <div style={{ marginTop: 'clamp(20px, 3vw, 40px)', display: 'flex', gap: 'clamp(20px, 2.5vw, 28px)', flexWrap: 'wrap' }}>
          <Stat label="Aprovação média" value="6,4s" />
          <Stat label="Sem consulta" value="SPC" />
          <Stat label="Juros a partir de" value="2,9%" />
        </div>
      </div>
    </section>
  )
}
