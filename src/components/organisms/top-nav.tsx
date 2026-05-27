import { Avatar } from '@/components/atoms/avatar'
import { BrandMark } from '@/components/atoms/brand-mark'
import { WalletPill } from '@/components/molecules/wallet-pill'
import { useStore } from '@/hooks/use-store'

export function TopNav() {
  const [{ user }] = useStore()
  return (
    <header style={{
      height: 64, flexShrink: 0, padding: '0 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid var(--line)', background: '#fff',
      position: 'relative', zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BrandMark size={30} />
        <span className="tight" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Uber Money</span>
      </div>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <WalletPill address={user.walletAddress} provider={user.walletProvider} />
          <div style={{ width: 1, height: 26, background: 'var(--line)' }} />
          <span style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}>{user.name}</span>
          <Avatar name={user.name} size={36} />
        </div>
      )}
    </header>
  )
}
