import { useState } from 'react'
import { Avatar } from '@/components/atoms/avatar'
import { BrandMark } from '@/components/atoms/brand-mark'
import { WalletPill } from '@/components/molecules/wallet-pill'
import { Sheet } from '@/components/molecules/sheet'
import { useStore } from '@/hooks/use-store'
import { useRoute } from '@/contexts/route-context'

const IN_FLOW: ReadonlyArray<string> = ['request', 'analysis', 'approved']

export function TopNav() {
  const [{ user }] = useStore()
  const ctx = useRoute()
  const [confirm, setConfirm] = useState(false)
  const inFlow = ctx ? IN_FLOW.includes(ctx.route) : false
  const canNav = ctx && ctx.route !== 'login' && ctx.route !== 'upload'

  const onBrandClick = () => {
    if (!canNav || !ctx) return
    if (inFlow) setConfirm(true)
    else ctx.goHome()
  }

  return (
    <>
      <header style={{
        height: 64, flexShrink: 0, padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--line)',
        background: 'rgba(252,250,246,0.85)', backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        position: 'relative', zIndex: 100,
      }}>
        <button
          onClick={onBrandClick}
          disabled={!canNav}
          aria-label={canNav ? 'Voltar para a home' : 'AltPay'}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 'none', padding: '4px 8px',
            borderRadius: 10, cursor: canNav ? 'pointer' : 'default',
            transition: 'background 140ms ease',
          }}
          onMouseEnter={(e) => { if (canNav) (e.currentTarget as HTMLElement).style.background = 'rgba(10,10,15,0.04)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <BrandMark size={30} />
          <span className="tight" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>AltPay</span>
        </button>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <WalletPill address={user.walletAddress} provider={user.walletProvider} />
            <div style={{ width: 1, height: 26, background: 'var(--line)' }} />
            <span style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}>{user.name}</span>
            <Avatar name={user.name} size={36} />
          </div>
        )}
      </header>

      <Sheet open={confirm} onClose={() => setConfirm(false)}>
        <div style={{ padding: 28, maxWidth: 440, margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Voltar para a home?
          </h3>
          <p style={{ marginTop: 10, color: 'var(--mute)', fontSize: 14, lineHeight: 1.55 }}>
            Você está em uma solicitação ativa. Se voltar agora, o progresso é descartado e você terá que começar de novo.
          </p>

          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => setConfirm(false)}
              style={{
                flex: 1, maxWidth: 180, height: 48, borderRadius: 14,
                background: '#fff', color: 'var(--ink)', fontSize: 14, fontWeight: 600,
                border: '1px solid var(--line)', cursor: 'pointer',
              }}
            >
              Continuar aqui
            </button>
            <button
              onClick={() => { setConfirm(false); ctx?.goHome() }}
              style={{
                flex: 1, maxWidth: 180, height: 48, borderRadius: 14,
                background: 'var(--ink)', color: '#fff', fontSize: 14, fontWeight: 600,
                border: 'none', cursor: 'pointer',
              }}
            >
              Voltar à home
            </button>
          </div>
        </div>
      </Sheet>
    </>
  )
}
