import { useCallback, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useToast } from '@/components/organisms/toast-provider'
import { sendPixMock } from '@/lib/mock'
import { HAS_BACKEND, releaseLoan, requestPayout, pollUntilConfirmed, signScore } from '@/lib/api'
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
  const { connection } = useConnection()
  const wallet = useWallet()

  // Step 1: DR-004 F+ — motorista assina via Phantom + Anchor valida on-chain.
  const efetuar = useCallback(async () => {
    setPhase('releasing')
    try {
      if (HAS_BACKEND && decision.loanId && ONCHAIN_FLOW && wallet.publicKey && wallet.sendTransaction) {
        // F+ on-chain flow
        console.log('[efetuar] onchain flow — pegando attestation do oracle')
        const att = await signScore(decision.loanId)

        console.log('[efetuar] montando tx (Ed25519 + ATA + borrower_request_loan)')
        const tx = await buildBorrowerRequestLoanTx({
          connection,
          payload: att,
          borrower: wallet.publicKey,
        })

        // Simulate ANTES de Phantom — captura erro do Anchor com logs reais
        console.log('[efetuar] simulando tx')
        const sim = await connection.simulateTransaction(tx, undefined, [wallet.publicKey])
        console.log('[efetuar] simulate result:', sim.value)
        if (sim.value.err) {
          console.error('[efetuar] simulate FAIL — logs:', sim.value.logs)
          throw new Error(`Simulate falhou: ${JSON.stringify(sim.value.err)}\nLogs:\n${(sim.value.logs ?? []).join('\n')}`)
        }

        console.log('[efetuar] Phantom popup — assinar tx')
        const sig = await wallet.sendTransaction(tx, connection)
        console.log('[efetuar] tx enviada:', sig, '— aguardando confirmação')
        await connection.confirmTransaction(sig, 'confirmed')

        setRelease({
          cpfHashHex: att.cpfHashHex,
          amountUSDC: Number(att.amountUSDC),
          txRelease: sig,
        })
        console.log('[efetuar] ✓ on-chain confirmed', sig)
      } else if (HAS_BACKEND && decision.loanId) {
        // Legacy admin-signed
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

  // Step 2: Woovi sandbox/prod
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
