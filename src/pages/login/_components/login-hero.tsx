import { motion } from 'framer-motion'
import { Stat } from '@/components/atoms/stat'

export function LoginHero() {
  return (
    <section style={{
      padding: 'clamp(40px, 5vw, 64px) clamp(40px, 6vw, 80px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', inset: -120, pointerEvents: 'none',
          background: `
            radial-gradient(620px 480px at 18% 22%, rgba(0,194,110,0.28) 0%, transparent 60%),
            radial-gradient(580px 420px at 80% 18%, rgba(153,69,255,0.16) 0%, transparent 60%),
            radial-gradient(700px 540px at 60% 95%, rgba(255,176,71,0.22) 0%, transparent 60%)
          `,
        }}
        animate={{ x: [0, 24, -18, 0], y: [0, -18, 12, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      />
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(8,8,10,0.055) 0.5px, transparent 0.5px)',
        backgroundSize: '26px 26px',
        backgroundPosition: '-1px -1px',
        maskImage: 'radial-gradient(circle at 30% 50%, black 0%, black 60%, transparent 92%)',
      }} />
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        opacity: 0.025, mixBlendMode: 'multiply',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence baseFrequency='0.88' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
      }} />

      <motion.svg
        aria-hidden
        width="100%" height="2"
        style={{
          position: 'absolute', left: 0, right: 0, top: '38%',
          pointerEvents: 'none', opacity: 0.45,
        }}
      >
        <motion.line
          x1="0" y1="1" x2="100%" y2="1"
          stroke="url(#login-beam)" strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
        />
        <defs>
          <linearGradient id="login-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(0,194,110,0)" />
            <stop offset="50%" stopColor="rgba(0,194,110,0.65)" />
            <stop offset="100%" stopColor="rgba(0,194,110,0)" />
          </linearGradient>
        </defs>
      </motion.svg>

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
