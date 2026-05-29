import type { ReactNode } from 'react'
import type { LoanReasonId } from '@/types/api'

export interface ReasonOption {
  id: LoanReasonId
  label: string
  iconName: 'tire' | 'fuel' | 'wrench' | 'dots'
  range: string
  minBRL: number
  maxBRL: number
}

export const REASONS: readonly ReasonOption[] = [
  { id: 'pneu', label: 'Pneu', iconName: 'tire', range: 'R$30–200', minBRL: 30, maxBRL: 200 },
  { id: 'suspensao', label: 'Suspensão', iconName: 'wrench', range: 'R$1.000–4.000', minBRL: 1000, maxBRL: 4000 },
  { id: 'bateria_chupeta', label: 'Bateria · chupeta', iconName: 'fuel', range: 'R$40–70', minBRL: 40, maxBRL: 70 },
  { id: 'bateria_troca', label: 'Bateria · troca', iconName: 'fuel', range: 'R$250–700', minBRL: 250, maxBRL: 700 },
  { id: 'troca_oleo', label: 'Troca de óleo', iconName: 'wrench', range: 'R$100–300', minBRL: 100, maxBRL: 300 },
  { id: 'outro', label: 'Outro', iconName: 'dots', range: 'até R$10.000', minBRL: 1, maxBRL: 10000 },
] as const

export const AMOUNT_CHIPS = [100, 500, 1000, 3000] as const
export const AMOUNT_MIN = 1
export const AMOUNT_MAX = 10000
export const AMOUNT_STEP = 10
export const AMOUNT_DEFAULT = 300

export const SCORE_THRESHOLD = 600
export const SCORE_MAX = 1000

export type ReasonIconName = ReasonOption['iconName']
export type ReasonChild = { id: ReasonOption['id']; label: string; icon: ReactNode }
