import { Screen } from '@/components/atoms/screen'
import { useLoginScreen } from './use-login-screen'
import { LoginHero } from './_components/login-hero'
import { LoginWalletPanel } from './_components/login-wallet-panel'

interface LoginScreenProps {
  onLogin: () => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { waiting, connecting, connect } = useLoginScreen({ onLogin })
  return (
    <Screen label="01 Login">
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
        overflow: 'hidden', position: 'relative',
      }}>
        <LoginHero />
        <LoginWalletPanel waiting={waiting} connecting={connecting} onConnect={connect} />
      </div>
    </Screen>
  )
}
