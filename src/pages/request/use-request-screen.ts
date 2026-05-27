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
  weeklyEarnings: string
  setWeeklyEarnings: (v: string) => void
  rides: string
  setRides: (v: string) => void
  years: string
  setYears: (v: string) => void
  city: string
  setCity: (v: string) => void
  valid: boolean
  submit: () => void
}

export function useRequestScreen({ onSubmit }: UseRequestScreenInput): UseRequestScreenOutput {
  const [amount, setAmount] = useState(AMOUNT_DEFAULT)
  const [reason, setReason] = useState<LoanReasonId>('pneu')
  const [weeklyEarnings, setWeeklyEarnings] = useState('1800')
  const [rides, setRides] = useState('120')
  const [years, setYears] = useState('3')
  const [city, setCity] = useState('São Paulo')

  const valid = useMemo(
    () =>
      amount >= AMOUNT_MIN
      && amount <= AMOUNT_MAX
      && !!reason
      && Number(weeklyEarnings) > 0
      && Number(rides) > 0
      && Number(years) >= 0
      && city.trim().length > 1,
    [amount, reason, weeklyEarnings, rides, years, city],
  )

  const submit = useCallback(() => {
    if (!valid) return
    onSubmit({
      amountBRL: amount,
      reason,
      weeklyEarningsBRL: Number(weeklyEarnings),
      ridesPerWeek: Number(rides),
      yearsDriving: Number(years),
      city: city.trim(),
    })
  }, [valid, amount, reason, weeklyEarnings, rides, years, city, onSubmit])

  return {
    amount, setAmount, reason, setReason,
    weeklyEarnings, setWeeklyEarnings, rides, setRides,
    years, setYears, city, setCity, valid, submit,
  }
}
