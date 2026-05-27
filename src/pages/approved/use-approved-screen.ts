import { useCallback, useState } from 'react'
import { useToast } from '@/components/organisms/toast-provider'
import { sendPixMock } from '@/lib/mock'
import { HAS_BACKEND, requestPayout, pollUntilConfirmed } from '@/lib/api'
import { Store } from '@/store'
import { dateBR } from '@/utils/format'
import { generateConfettiDots, type ConfettiDot } from '@/utils/confetti'
import { PIX_NOTIFICATION_DURATION_MS } from '@/consts/confetti'
import type { LoanDecision, PayoutReceipt } from '@/types/domain'

type ClaimPhase = 'approved' | 'claiming' | 'done'

interface UseApprovedScreenInput {
  decision: LoanDecision
}

interface UseApprovedScreenOutput {
  phase: ClaimPhase
  receipt: PayoutReceipt | null
  showReceipt: boolean
  setShowReceipt: (open: boolean) => void
  showNotif: boolean
  confetti: ConfettiDot[]
  claim: () => Promise<void>
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
  const [receipt, setReceipt] = useState<PayoutReceipt | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [confetti, setConfetti] = useState<ConfettiDot[]>([])
  const toast = useToast()

  const claim = useCallback(async () => {
    setPhase('claiming')
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
      setPhase('approved')
    }
  }, [decision, toast])

  return { phase, receipt, showReceipt, setShowReceipt, showNotif, confetti, claim }
}
