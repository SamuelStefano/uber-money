import { useMemo, type ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

export function AppWalletProvider({ children }: { children: ReactNode }) {
  // DR-003 D5: Helius devnet RPC + QuickNode failover (Q25 v9).
  const endpoint = useMemo(() => {
    const helius = import.meta.env.VITE_HELIUS_RPC_URL as string | undefined
    const quicknode = import.meta.env.VITE_QUICKNODE_RPC_URL as string | undefined
    const fallback = import.meta.env.VITE_SOLANA_RPC as string | undefined
    return helius || quicknode || fallback || clusterApiUrl('devnet')
  }, [])

  // Plan v9 Q24: Phantom only — drop Privy/Google/Uber OAuth/Solflare/MetaMask/etc.
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* autoConnect=false → conexão só dispara quando user clica no botão (não no boot) */}
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
