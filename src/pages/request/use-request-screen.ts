import { useCallback, useMemo, useState } from 'react'
import { AMOUNT_DEFAULT, AMOUNT_MAX, AMOUNT_MIN } from '@/consts/credit'
import type { LoanReasonId, LoanRequestPayload } from '@/types/api'

interface UseRequestScreenInput {
  onSubmit: (payload: LoanRequestPayload) => void
}

interface UseRequestScreenOutput {
  amount: number
  setAmount: (n: number) => void
  reason: LoanReasonId
  setReason: (r: LoanReasonId) => void
  valid: boolean
  submit: () => void
}

export function useRequestScreen({ onSubmit }: UseRequestScreenInput): UseRequestScreenOutput {
  const [amount, setAmount] = useState(AMOUNT_DEFAULT)
  const [reason, setReason] = useState<LoanReasonId>('pneu')

  const valid = useMemo(
    () => amount >= AMOUNT_MIN && amount <= AMOUNT_MAX && !!reason,
    [amount, reason],
  )

  const submit = useCallback(() => {
    if (!valid) return
    onSubmit({ amountBRL: amount, reason })
  }, [valid, amount, reason, onSubmit])

  return { amount, setAmount, reason, setReason, valid, submit }
}
