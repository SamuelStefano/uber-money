import { useMemo, type ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

export function AppWalletProvider({ children }: { children: ReactNode }) {
  // DR-001 D12: RPC alternativo (Helius/QuickNode) via env evita rate-limit do RPC público.
  const endpoint = useMemo(
    () => (import.meta.env.VITE_SOLANA_RPC as string | undefined) || clusterApiUrl('devnet'),
    [],
  )
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [])
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
