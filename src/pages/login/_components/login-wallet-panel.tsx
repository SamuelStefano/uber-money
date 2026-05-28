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
      background: 'transparent',
      borderLeft: '1px solid rgba(10,10,15,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(32px, 5vw, 64px)', position: 'relative', overflow: 'hidden',
    }}>
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', inset: -120, pointerEvents: 'none',
          background: `
            radial-gradient(560px 420px at 80% 20%, rgba(0,194,110,0.18) 0%, transparent 60%),
            radial-gradient(500px 380px at 20% 80%, rgba(120,148,255,0.16) 0%, transparent 60%)
          `,
        }}
        animate={{ x: [0, -20, 14, 0], y: [0, 14, -10, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1], delay: 0.1 }}
        style={{ width: '100%', maxWidth: 400, position: 'relative' }}
      >
        <div style={{
          padding: 28,
          borderRadius: 24,
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 30px 60px -20px rgba(10,10,15,0.12), 0 1px 0 rgba(255,255,255,0.6) inset, inset 0 0 0 1px rgba(10,10,15,0.05)',
        }}>
          <h2 className="tight" style={{
            margin: 0, fontSize: 36, fontWeight: 800,
            letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.05,
          }}>
            Entrar com<br />
            <span style={{
              background: 'linear-gradient(92deg, var(--accent-deep) 0%, var(--accent) 50%, #6B5BFF 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>sua carteira.</span>
          </h2>

          <p style={{ marginTop: 12, color: 'var(--mute)', fontSize: 14, lineHeight: 1.55 }}>
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
              boxShadow: '0 20px 50px -12px rgba(0,194,110,0.50), inset 0 2px 0 rgba(255,255,255,0.30), inset 0 -2px 0 rgba(0,0,0,0.10)',
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
            borderRadius: 14, background: 'rgba(10,10,15,0.03)',
            border: '1px solid var(--line)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{ color: 'var(--mute)', flexShrink: 0, marginTop: 1 }}>
              <Icon.Shield />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--mute)', lineHeight: 1.5 }}>
              Sua carteira, suas chaves. Não pedimos e‑mail, não criamos conta. Só uma assinatura on‑chain.
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
