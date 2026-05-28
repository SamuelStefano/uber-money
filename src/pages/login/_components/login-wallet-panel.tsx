import { motion } from 'framer-motion'
import { Icon } from '@/components/atoms/icon'
import { Spinner } from '@/components/atoms/spinner'

interface LoginWalletPanelProps {
  waiting: boolean
  connecting: boolean
  onConnect: () => void
}

export function LoginWalletPanel({ waiting, onConnect }: LoginWalletPanelProps) {
  const busy = waiting

  return (
    <section style={{
      background: 'radial-gradient(800px 600px at 70% 30%, #15151A 0%, #0A0A0B 70%)',
      borderLeft: '1px solid rgba(255,255,255,0.04)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(32px, 5vw, 64px)', position: 'relative', overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(600px 400px at 80% 10%, rgba(0,194,110,0.18) 0%, transparent 60%),
          radial-gradient(500px 380px at 10% 90%, rgba(120,148,255,0.12) 0%, transparent 60%)
        `,
      }} />
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        opacity: 0.04, mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence baseFrequency='0.88' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
      }} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1], delay: 0.1 }}
        style={{ width: '100%', maxWidth: 400, position: 'relative' }}
      >
        <div style={{
          padding: 28,
          borderRadius: 24,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07), 0 30px 80px -30px rgba(0,194,110,0.18)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px 6px 10px', borderRadius: 999,
            background: 'rgba(0,194,110,0.10)', color: 'var(--accent)',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            border: '1px solid rgba(0,194,110,0.18)',
          }}>
            <span style={{ position: 'relative', width: 6, height: 6 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'var(--accent)' }} />
              <span style={{
                position: 'absolute', inset: -3, borderRadius: 999,
                border: '1px solid var(--accent)', animation: 'pulse-ring 2.2s ease-out infinite',
              }} />
            </span>
            SOLANA DEVNET · ATIVO
          </div>

          <h2 className="tight" style={{
            margin: '20px 0 0', fontSize: 36, fontWeight: 800,
            letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.05,
          }}>
            Entrar com<br />
            <span style={{
              background: 'linear-gradient(92deg, #14F195 0%, #9945FF 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>sua carteira.</span>
          </h2>

          <p style={{ marginTop: 12, color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.55 }}>
            Sem e‑mail, sem senha. Uma assinatura on‑chain e pronto.
          </p>

          <button
            onClick={onConnect}
            disabled={busy}
            style={{
              marginTop: 28, width: '100%',
              height: 64, borderRadius: 18, padding: '0 22px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              background: 'linear-gradient(135deg, #00D478 0%, #00C26E 50%, #00A65C 100%)',
              color: '#04140B',
              fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
              cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: '0 20px 50px -12px rgba(0,194,110,0.55), inset 0 2px 0 rgba(255,255,255,0.20), inset 0 -2px 0 rgba(0,0,0,0.10)',
              border: 'none',
              transition: 'transform 120ms ease',
            }}
          >
            {busy
              ? <Spinner size={18} color="#04140B" />
              : <span style={{ width: 26, height: 26, borderRadius: 8, background: 'radial-gradient(circle at 30% 30%, #14F195 0%, #9945FF 100%)' }} />}
            Conectar carteira
          </button>

          <div style={{
            marginTop: 20, padding: 14,
            borderRadius: 14, background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0, marginTop: 1 }}>
              <Icon.Shield />
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
              Sua carteira, suas chaves. Não pedimos e‑mail, não criamos conta. Só uma assinatura on‑chain.
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 16, textAlign: 'center',
          fontSize: 11, color: 'rgba(255,255,255,0.30)',
          letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          powered by chainlink + solana
        </div>
      </motion.div>
    </section>
  )
}
