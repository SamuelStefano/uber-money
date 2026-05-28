import { Icon } from '@/components/atoms/icon'
import { Spinner } from '@/components/atoms/spinner'

interface LoginWalletPanelProps {
  waiting: boolean
  connecting: boolean
  onConnect: () => void
}

export function LoginWalletPanel({ waiting, connecting, onConnect }: LoginWalletPanelProps) {
  // A1 fix: usar só `waiting` pra disabled. Se `connecting` ficar travado em true
  // (ex: connect anterior travou no provider), botão fica preso pra sempre.
  const busy = waiting
  return (
    <section style={{
      background: '#fff', borderLeft: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(32px, 5vw, 64px)', position: 'relative', overflow: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h2 className="tight" style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: '-0.025em' }}>Entrar</h2>
        <p style={{ marginTop: 8, color: 'var(--mute)', fontSize: 15 }}>
          Conecte sua carteira Solana pra continuar.
        </p>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={onConnect}
            disabled={busy}
            style={{
              height: 64, borderRadius: 18, padding: '0 22px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              background: 'var(--ink)', color: '#fff',
              fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em',
              cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: '0 12px 28px -8px rgba(10,10,15,0.35)',
              transition: 'transform 120ms ease',
            }}
          >
            {busy
              ? <Spinner size={18} color="#fff" />
              : <span style={{ width: 26, height: 26, borderRadius: 8, background: 'radial-gradient(circle at 30% 30%, #14F195 0%, #9945FF 100%)' }} />}
            Conectar carteira Solana
          </button>

          <div style={{
            marginTop: 18, padding: 16, borderRadius: 14,
            background: 'var(--canvas)', display: 'flex', gap: 12,
          }}>
            <Icon.Shield />
            <div style={{ fontSize: 12.5, color: 'var(--mute)', lineHeight: 1.5 }}>
              Sua carteira, suas chaves. Não pedimos e‑mail, não criamos conta.
              Só uma assinatura on‑chain.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
