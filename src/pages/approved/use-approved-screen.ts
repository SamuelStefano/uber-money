import { useCallback, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useToast } from '@/components/organisms/toast-provider'
import { sendPixMock } from '@/lib/mock'
import { HAS_BACKEND, releaseLoan, requestPayout, pollUntilConfirmed, confirmLoan, type PixKeyType } from '@/lib/api'
import { buildBorrowerRequestLoanTx } from '@/lib/solana-tx-builder'
import { Store } from '@/store'
import { dateBR } from '@/utils/format'
import { generateConfettiDots, type ConfettiDot } from '@/utils/confetti'
import { PIX_NOTIFICATION_DURATION_MS } from '@/consts/confetti'
import type { LoanDecision, PayoutReceipt } from '@/types/domain'

// DR-002 D4 + DR-004 F+: 2-step UX (Q8 TL).
//   approved  → releasing/signing  → usdc_received  → sacando  → done
//                ↑Step 1                              ↑Step 2
type ClaimPhase = 'approved' | 'releasing' | 'usdc_received' | 'sacando' | 'done'

// VITE_ONCHAIN_FLOW=true → motorista assina via Phantom (DR-004 F+)
// VITE_ONCHAIN_FLOW=false → admin signa server-side (DR-002 legacy, fallback)
const ONCHAIN_FLOW = (import.meta.env.VITE_ONCHAIN_FLOW ?? 'true').toLowerCase() === 'true'

interface UseApprovedScreenInput {
  decision: LoanDecision
}

interface ReleaseInfo {
  cpfHashHex?: string
  amountUSDC?: number
  txRelease?: string
}

interface UseApprovedScreenOutput {
  phase: ClaimPhase
  release: ReleaseInfo | null
  receipt: PayoutReceipt | null
  showReceipt: boolean
  setShowReceipt: (open: boolean) => void
  showNotif: boolean
  confetti: ConfettiDot[]
  efetuar: () => Promise<void>           // Step 1: USDC on-chain
  sacar: () => void                      // Step 2: abre modal Pix
  showPixModal: boolean
  closePixModal: () => void
  confirmPix: (pixKey: string, pixKeyType: PixKeyType) => Promise<void>
}

async function executePayout(decision: LoanDecision, pixKey: string, pixKeyType: PixKeyType): Promise<PayoutReceipt> {
  if (HAS_BACKEND && decision.loanId) {
    const r = await requestPayout(decision.loanId, pixKey, pixKeyType)
    // Sandbox/mock confirma sync — fabrica receipt sem polling (RLS pode bloquear leitura).
    if (r.status === 'confirmed') {
      return {
        id: `SANDBOX-${r.correlationId.slice(0, 8)}`,
        amountBRL: r.amountBRL,
        timestamp: new Date().toISOString(),
        to: pixKey,
      }
    }
    return pollUntilConfirmed(r.payoutId)
  }
  return sendPixMock({ amountBRL: decision.approvedAmountBRL, to: pixKey })
}

export function useApprovedScreen({ decision }: UseApprovedScreenInput): UseApprovedScreenOutput {
  const [phase, setPhase] = useState<ClaimPhase>('approved')
  const [release, setRelease] = useState<ReleaseInfo | null>(null)
  const [receipt, setReceipt] = useState<PayoutReceipt | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [confetti, setConfetti] = useState<ConfettiDot[]>([])
  const toast = useToast()
  const { connection } = useConnection()
  const wallet = useWallet()

  // Step 1: DR-004 F+ — motorista assina via Phantom + Anchor valida on-chain.
  const efetuar = useCallback(async () => {
    // Guard: F+ on-chain exige wallet conectada. Sem ela, NÃO cai no legacy
    // (que está sendo descontinuado e crasha). Pede reconexão explícita.
    if (HAS_BACKEND && decision.requestId && ONCHAIN_FLOW) {
      if (!wallet.publicKey || !wallet.signTransaction) {
        toast.push('Reconecte sua carteira pra efetuar o empréstimo')
        try { if (!wallet.connected) await wallet.connect() } catch { /* user cancelou */ }
        return
      }
      if (!decision.attestation) {
        toast.push('Atestação expirada — pedir crédito de novo')
        return
      }
      const nowSec = Math.floor(Date.now() / 1000)
      if (Number(decision.attestation.expiresAt) < nowSec) {
        toast.push('Atestação expirada — pedir crédito de novo')
        return
      }
    }
    setPhase('releasing')
    try {
      if (HAS_BACKEND && decision.requestId && decision.attestation && ONCHAIN_FLOW && wallet.publicKey && wallet.signTransaction) {
        const att = decision.attestation
        const tx = await buildBorrowerRequestLoanTx({
          connection,
          payload: att,
          borrower: wallet.publicKey,
        })

        const sim = await connection.simulateTransaction(tx, undefined, [wallet.publicKey])
        if (sim.value.err) {
          throw new Error(`Simulate falhou: ${JSON.stringify(sim.value.err)}\nLogs:\n${(sim.value.logs ?? []).join('\n')}`)
        }

        const signed = await wallet.signTransaction!(tx)
        const sig = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: true,
          maxRetries: 3,
        })
        await connection.confirmTransaction(sig, 'confirmed')

        const confirmed = await confirmLoan(decision.requestId, sig).catch((e) => {
          console.error('[efetuar] confirm-loan failed (tx confirmou mas DB nao espelhou)', e)
          return null
        })

        setRelease({
          cpfHashHex: att.cpfHashHex,
          amountUSDC: Number(att.amountUSDC),
          txRelease: sig,
        })
        if (confirmed) decision.loanId = confirmed.loanId
      } else if (HAS_BACKEND && decision.loanId) {
        const r = await releaseLoan(decision.loanId)
        setRelease({ cpfHashHex: r.cpfHashHex, amountUSDC: r.amountUSDC, txRelease: r.txRelease })
        if (r.status === 'already_released') {
          console.warn('[efetuar] loan já released previamente, recuperando', r.txRelease)
        }
      } else {
        // Sem backend: simula USDC recebido instantâneo
        setRelease({ amountUSDC: Math.round(decision.approvedAmountBRL * 1e6 / 5) })
      }
      setPhase('usdc_received')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const logs = (e as { logs?: string[] })?.logs
      console.error('[efetuar] release failed:', e, 'logs:', logs)
      // User cancelou Phantom popup → silente, volta pro approved
      if (msg.includes('User rejected') || msg.includes('cancelled')) {
        setPhase('approved')
        return
      }
      toast.push(msg || 'Falha ao efetuar empréstimo. Tente de novo.')
      setPhase('approved')
    }
  }, [decision, toast, connection, wallet])

  // Step 2: abre modal pra pegar chave Pix
  const [showPixModal, setShowPixModal] = useState(false)
  const sacar = useCallback(() => { setShowPixModal(true) }, [])
  const closePixModal = useCallback(() => { setShowPixModal(false) }, [])

  const confirmPix = useCallback(async (pixKey: string, pixKeyType: PixKeyType) => {
    setShowPixModal(false)
    setPhase('sacando')
    try {
      const r = await executePayout(decision, pixKey, pixKeyType)
      Store.set((s) => ({
        ...s,
        wallet: { ...s.wallet, balanceBRL: s.wallet.balanceBRL + decision.approvedAmountBRL, pixKey },
        activity: [
          {
            id: r.id,
            kind: 'pix',
            amountBRL: decision.approvedAmountBRL,
            label: 'Pix recebido',
            sub: `Empréstimo ${decision.loanId.slice(0, 8)} · agora`,
            timestamp: r.timestamp,
          },
          {
            id: decision.loanId,
            kind: 'loan',
            amountBRL: decision.approvedAmountBRL,
            label: 'Empréstimo aberto',
            sub: `${decision.installments}× · ${decision.interestPct.toFixed(1)}%/mês · vence ${dateBR(decision.dueDate)}`,
            timestamp: r.timestamp,
          },
          ...s.activity,
        ],
        lastReceipt: r,
      }))
      setReceipt(r)
      setShowNotif(true)
      setConfetti(generateConfettiDots())
      setTimeout(() => setShowNotif(false), PIX_NOTIFICATION_DURATION_MS)
      setPhase('done')
    } catch (e) {
      console.error('[sacar] payout failed:', e)
      toast.push(e instanceof Error ? e.message : 'Pix demorou demais. Tente de novo.')
      setPhase('usdc_received')
    }
  }, [decision, toast])

  return {
    phase, release, receipt,
    showReceipt, setShowReceipt,
    showNotif, confetti,
    efetuar, sacar,
    showPixModal, closePixModal, confirmPix,
  }
}
