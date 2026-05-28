import { useCallback, useEffect, useRef, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import bs58 from 'bs58'
import { HAS_BACKEND, getNonce, verifyWallet, getCreditStatus } from '@/lib/api'
import { useToast } from '@/components/organisms/toast-provider'
import { Store } from '@/store'
import { uid } from '@/utils/uid'
import { MOCK_USER_NAME } from '@/consts/mock'
import type { User } from '@/types/domain'

interface UseLoginScreenInput {
  onLogin: (next: 'home' | 'upload') => void
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

  // CRIT-1 fix: reset guard quando user desconecta — permite reconectar a mesma wallet.
  useEffect(() => {
    if (!wallet.connected) signedForPubkeyRef.current = null
  }, [wallet.connected])

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
        let next: 'home' | 'upload' = 'upload'
        if (HAS_BACKEND) {
          try {
            const credit = await getCreditStatus()
            if (credit.has_cnh && credit.has_earnings) next = 'home'
          } catch (e) { console.warn('[login] credit-status fetch failed, defaulting to upload', e) }
        }
        setWaiting(false)
        onLogin(next)
      } catch (e) {
        // Dev visibility: detalhes do erro de auth ajudam diagnose sem expor pro user.
        console.error('[login] auth flow failed:', e)
        signedForPubkeyRef.current = null  // libera retry se falhou
        toast.push('Falha na autenticação. Tente reconectar.')
        setWaiting(false)
      }
    }
    void run()
  }, [wallet.connected, wallet.publicKey, onLogin, toast, wallet.signMessage, wallet.wallet?.adapter?.name])

  // Fix squad A5: chamar wallet.connect() DIRETO no callback resolve Bug 3
  // (segundo click com Phantom já selecionada = wallet.select no-op = useEffect
  // intermediário nunca dispara). Versão direta funciona em ambos os caminhos.
  const connect = useCallback(async () => {
    console.log('[onConnect] click recebido')      // A1: confirma callback dispara
    setWaiting(true)
    signedForPubkeyRef.current = null

    const phantom = wallet.wallets.find((w) => w.adapter.name === 'Phantom')
    console.log('[connect] wallets disponíveis:', wallet.wallets.map((w) => w.adapter.name))

    if (!phantom) {
      try { setVisible(true) }
      catch { toast.push('Phantom não detectada.'); setWaiting(false) }
      return
    }

    try {
      // Só seleciona se ainda não está selecionada (evita Bug 3 — no-op silencioso)
      if (wallet.wallet?.adapter?.name !== 'Phantom') {
        wallet.select(phantom.adapter.name)
        // tick pro provider aplicar select e popular wallet.wallet antes de connect()
        await new Promise((r) => setTimeout(r, 80))
      }
      console.log('[connect] chamando wallet.connect()')
      await wallet.connect()
      // useEffect de auth (signMessage) dispara quando wallet.connected = true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[connect] falhou:', e)
      toast.push(`Conexão falhou: ${msg}`)
      setWaiting(false)
    }
  }, [wallet, setVisible, toast])

  return { waiting, connecting: wallet.connecting, connect }
}
