import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { prepareRepayment, confirmRepayment, HAS_BACKEND } from '@/lib/api'
import { buildRepayLoanTx } from '@/lib/solana-tx-builder'
import type { LoanDecision, RepayPhase } from '@/types/domain'
import type { PrepareRepaymentResponse, RepayAttestationPayload } from '@/types/api'

interface RepayInfo {
  payoutId: string
  brcode: string
  qrCodeImage: string
  amountBRL: number
  amountUSDC: string
  loanPda: string
  correlationId: string
  attestation: RepayAttestationPayload | null
  txRepay: string | null
}

export interface UseRepayScreenOutput {
  phase: RepayPhase
  repayInfo: RepayInfo | null
  errorMsg: string | null
  generate: () => Promise<void>
  sign: () => Promise<void>
  retry: () => void
  onHome: () => void
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

function toRepayInfo(resp: PrepareRepaymentResponse): RepayInfo {
  return {
    payoutId: resp.payoutId,
    brcode: resp.brcode,
    qrCodeImage: resp.qrCodeImage,
    amountBRL: resp.amountBRL,
    amountUSDC: resp.amountUSDC,
    loanPda: resp.loanPda,
    correlationId: resp.correlationId,
    attestation: resp.attestation,
    txRepay: null,
  }
}

export function useRepayScreen({
  decision,
  onHome,
}: {
  decision: LoanDecision
  onHome: () => void
}): UseRepayScreenOutput {
  const [phase, setPhase] = useState<RepayPhase>('idle')
  const [repayInfo, setRepayInfo] = useState<RepayInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { publicKey, signTransaction, sendTransaction } = useWallet()
  const { connection } = useConnection()

  useEffect(() => {
    if (!HAS_BACKEND || !decision.loanId) return

    prepareRepayment(decision.loanId)
      .then((resp) => {
        setRepayInfo(toRepayInfo(resp))
        if (resp.status === 'confirmed' && resp.attestation) {
          setPhase('pix_confirmed')
        } else {
          setPhase('pix_pending')
          startPolling()
        }
      })
      .catch(() => {
        /* no existing payout — stays idle */
      })

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [decision.loanId])

  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    const deadline = Date.now() + 15 * 60 * 1000
    pollingRef.current = setInterval(async () => {
      if (Date.now() > deadline) {
        clearInterval(pollingRef.current!)
        setPhase('error')
        setErrorMsg('Pix não confirmado em 15 min. Tente novamente.')
        return
      }
      try {
        const resp = await prepareRepayment(decision.loanId)
        if (resp.status === 'confirmed' && resp.attestation) {
          setRepayInfo((r) => r ? { ...r, attestation: resp.attestation } : r)
          setPhase('pix_confirmed')
          clearInterval(pollingRef.current!)
        }
      } catch {
        /* transient error — keep polling */
      }
    }, 3000)
  }, [decision.loanId])

  const generate = useCallback(async () => {
    setPhase('generating')
    setErrorMsg(null)
    try {
      const resp = await prepareRepayment(decision.loanId)
      setRepayInfo(toRepayInfo(resp))
      if (resp.status === 'confirmed' && resp.attestation) {
        setPhase('pix_confirmed')
      } else {
        setPhase('pix_pending')
        startPolling()
      }
    } catch (e) {
      setPhase('error')
      setErrorMsg(errMsg(e))
    }
  }, [decision.loanId, startPolling])

  const sign = useCallback(async () => {
    if (!repayInfo?.attestation || !publicKey || !signTransaction || !sendTransaction) return
    setPhase('signing')
    setErrorMsg(null)
    try {
      const tx = await buildRepayLoanTx({
        connection,
        attestation: repayInfo.attestation,
        borrowerWallet: publicKey,
      })

      const signed = await signTransaction(tx)
      setPhase('tx_pending')
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      })
      await connection.confirmTransaction(sig, 'confirmed')
      await confirmRepayment(decision.loanId, sig)
      setRepayInfo((r) => r ? { ...r, txRepay: sig } : r)
      setPhase('done')
    } catch (e) {
      const msg = errMsg(e)
      if (msg.includes('User rejected') || msg.includes('cancelled')) {
        setPhase('pix_confirmed')
      } else {
        setPhase('error')
        setErrorMsg(msg)
      }
    }
  }, [repayInfo, publicKey, signTransaction, sendTransaction, connection, decision])

  const retry = useCallback(() => {
    if (phase !== 'error') return
    setErrorMsg(null)
    if (repayInfo?.attestation) {
      setPhase('pix_confirmed')
    } else {
      setPhase('idle')
    }
  }, [phase, repayInfo])

  return { phase, repayInfo, errorMsg, generate, sign, retry, onHome }
}
