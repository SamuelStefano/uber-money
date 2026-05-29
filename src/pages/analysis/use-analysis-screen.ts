import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/organisms/toast-provider'
import { requestCreditMock } from '@/lib/mock'
import { HAS_BACKEND, requestLoan } from '@/lib/api'
import { Store } from '@/store'
import {
  ANALYSIS_DONE_DELAY_MS,
  ANALYSIS_ERROR_DELAY_MS,
  ANALYSIS_STEP_MS,
  ANALYSIS_STEPS,
} from '@/consts/analysis'
import type { LoanDecision } from '@/types/domain'
import type { LoanRequestPayload } from '@/types/api'

interface UseAnalysisScreenInput {
  payload: LoanRequestPayload
  onDone: (decision: LoanDecision | null, err?: boolean) => void
}

async function fetchDecision(payload: LoanRequestPayload): Promise<LoanDecision> {
  if (HAS_BACKEND) return requestLoan(payload)
  return requestCreditMock(payload)
}

export function useAnalysisScreen({ payload, onDone }: UseAnalysisScreenInput): { step: number } {
  const [step, setStep] = useState(0)
  const toast = useToast()

  // Refs estabilizam callbacks sem precisar do consumidor usar useCallback.
  // Sem isso, qualquer re-render do pai dispara fetchDecision de novo (loop).
  const onDoneRef = useRef(onDone)
  const toastRef = useRef(toast)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])
  useEffect(() => { toastRef.current = toast }, [toast])

  // Guard pra request-loan rodar UMA vez por payload (mesmo com strict-mode).
  const startedForRef = useRef<string | null>(null)

  useEffect(() => {
    const key = `${payload.amountBRL}|${payload.reason}`
    if (startedForRef.current === key) return
    startedForRef.current = key

    let mounted = true
    const stepTimer = setInterval(() => {
      setStep((s) => Math.min(ANALYSIS_STEPS.length - 1, s + 1))
    }, ANALYSIS_STEP_MS)

    fetchDecision(payload)
      .then((decision) => {
        if (!mounted) return
        Store.set({ lastDecision: decision })
        setTimeout(() => { if (mounted) onDoneRef.current(decision) }, ANALYSIS_DONE_DELAY_MS)
      })
      .catch((e) => {
        if (!mounted) return
        toastRef.current.push(e instanceof Error ? e.message : 'Conexão instável. Tente de novo.')
        setTimeout(() => { if (mounted) onDoneRef.current(null, true) }, ANALYSIS_ERROR_DELAY_MS)
      })

    return () => {
      mounted = false
      clearInterval(stepTimer)
    }
  }, [payload])

  return { step }
}
