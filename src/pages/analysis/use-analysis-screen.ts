import { useEffect, useState } from 'react'
import { useToast } from '@/components/organisms/toast-provider'
import { requestCreditMock } from '@/lib/mock'
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

export function useAnalysisScreen({ payload, onDone }: UseAnalysisScreenInput): { step: number } {
  const [step, setStep] = useState(0)
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    const stepTimer = setInterval(() => {
      setStep((s) => Math.min(ANALYSIS_STEPS.length - 1, s + 1))
    }, ANALYSIS_STEP_MS)

    requestCreditMock(payload)
      .then((decision) => {
        if (!mounted) return
        Store.set({ lastDecision: decision })
        setTimeout(() => { if (mounted) onDone(decision) }, ANALYSIS_DONE_DELAY_MS)
      })
      .catch(() => {
        if (!mounted) return
        toast.push('Conexão instável. Tentando de novo…')
        setTimeout(() => { if (mounted) onDone(null, true) }, ANALYSIS_ERROR_DELAY_MS)
      })

    return () => {
      mounted = false
      clearInterval(stepTimer)
    }
  }, [payload, onDone, toast])

  return { step }
}
