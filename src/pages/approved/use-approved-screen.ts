import { useCallback, useState } from 'react'
import { useToast } from '@/components/organisms/toast-provider'
import { sendPixMock } from '@/lib/mock'
import { HAS_BACKEND, releaseLoan, requestPayout, pollUntilConfirmed } from '@/lib/api'
import { Store } from '@/store'
import { dateBR } from '@/utils/format'
import { generateConfettiDots, type ConfettiDot } from '@/utils/confetti'
import { PIX_NOTIFICATION_DURATION_MS } from '@/consts/confetti'
import type { LoanDecision, PayoutReceipt } from '@/types/domain'

// DR-002 D4: 2-step UX (Q8 TL).
//   approved  → release  → usdc_received  → sacando  → done
//                ↑Step 1                     ↑Step 2
type ClaimPhase = 'approved' | 'releasing' | 'usdc_received' | 'sacando' | 'done'

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
  sacar: () => Promise<void>             // Step 2: Pix
}

async function executePayout(decision: LoanDecision, pixKey: string): Promise<PayoutReceipt> {
  if (HAS_BACKEND && decision.loanId) {
    const { payoutId } = await requestPayout(decision.loanId, pixKey, 'email')
    return pollUntilConfirmed(payoutId)
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

  // Step 1: chama Anchor `release_loan` via edge `request-payout?action=release`
  // → USDC cai na wallet Solana do borrower (devnet).
  //
  // Squad A3 amend: idempotência via `status: 'already_released'` (200, não throw).
  // Front trata `confirmed | already_released` igual — ambos seguem pra usdc_received.
  const efetuar = useCallback(async () => {
    setPhase('releasing')
    try {
      if (HAS_BACKEND && decision.loanId) {
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
      console.error('[efetuar] release failed:', e)
      toast.push(e instanceof Error ? e.message : 'Falha ao efetuar empréstimo. Tente de novo.')
      setPhase('approved')
    }
  }, [decision, toast])

  // Step 2: chama edge `request-payout?action=payout` → Woovi PROD ou MOCK.
  const sacar = useCallback(async () => {
    setPhase('sacando')
    try {
      const r = await executePayout(decision, Store.get().wallet.pixKey)
      Store.set((s) => ({
        ...s,
        wallet: { ...s.wallet, balanceBRL: s.wallet.balanceBRL + decision.approvedAmountBRL },
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
      toast.push(e instanceof Error ? e.message : 'Pix demorou demais. Tente de novo.')
      setPhase('usdc_received')
    }
  }, [decision, toast])

  return {
    phase, release, receipt,
    showReceipt, setShowReceipt,
    showNotif, confetti,
    efetuar, sacar,
  }
}
