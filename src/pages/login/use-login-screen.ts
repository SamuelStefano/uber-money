import { useCallback, useEffect, useRef, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import bs58 from 'bs58'
import { HAS_BACKEND, getNonce, verifyWallet } from '@/lib/api'
import { useToast } from '@/components/organisms/toast-provider'
import { Store } from '@/store'
import { uid } from '@/utils/uid'
import { MOCK_USER_NAME } from '@/consts/mock'
import type { User } from '@/types/domain'

interface UseLoginScreenInput {
  onLogin: () => void
}

interface UseLoginScreenOutput {
  waiting: boolean
  connecting: boolean
  connect: () => void
}

export function useLoginScreen({ onLogin }: UseLoginScreenInput): UseLoginScreenOutput {
  const wallet = useWallet()
  const { setVisible } = useWalletModal()
  const toast = useToast()
  const [waiting, setWaiting] = useState(false)

  // Guard: useEffect só dispara fluxo de assinatura UMA vez por sessão de connect.
  // Sem isso, qualquer re-render que mude deps refeitos (signMessage ref troca em re-renders)
  // dispara novo signMessage → popup Phantom em loop.
  const signedForPubkeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) return
    const address = wallet.publicKey.toBase58()
    if (signedForPubkeyRef.current === address) return  // já assinou pra esta wallet
    signedForPubkeyRef.current = address
    const providerName = wallet.wallet?.adapter?.name || 'Phantom'

    const run = async () => {
      try {
        let user: User
        if (HAS_BACKEND && wallet.signMessage) {
          const { nonce, message } = await getNonce(address)
          const sig = await wallet.signMessage(new TextEncoder().encode(message))
          const verified = await verifyWallet(address, nonce, bs58.encode(sig))
          user = {
            id: verified.user_id,
            name: MOCK_USER_NAME,
            uberConnected: false,
            walletAddress: address,
            walletProvider: providerName,
            accessToken: verified.access_token,
          }
        } else {
          user = {
            id: uid('USR_'),
            name: MOCK_USER_NAME,
            uberConnected: false,
            walletAddress: address,
            walletProvider: providerName,
          }
        }
        Store.set({ user })
        setWaiting(false)
        onLogin()
      } catch {
        signedForPubkeyRef.current = null  // libera retry se falhou
        toast.push('Falha na autenticação. Tente reconectar.')
        setWaiting(false)
      }
    }
    void run()
  }, [wallet.connected, wallet.publicKey, onLogin, toast, wallet.signMessage, wallet.wallet?.adapter?.name])

  const connect = useCallback(() => {
    setWaiting(true)
    // Reset guard: novo clique no botão = libera nova assinatura mesmo pra mesma wallet
    signedForPubkeyRef.current = null
    try { setVisible(true) }
    catch { toast.push('Não foi possível abrir a carteira'); setWaiting(false) }
  }, [setVisible, toast])

  return { waiting, connecting: wallet.connecting, connect }
}
