import type { ReactNode } from 'react'

export interface ReasonOption {
  id: 'pneu' | 'combustivel' | 'manutencao' | 'outro'
  label: string
  iconName: 'tire' | 'fuel' | 'wrench' | 'dots'
}

export const REASONS: readonly ReasonOption[] = [
  { id: 'pneu', label: 'Pneu', iconName: 'tire' },
  { id: 'combustivel', label: 'Combustível', iconName: 'fuel' },
  { id: 'manutencao', label: 'Manutenção', iconName: 'wrench' },
  { id: 'outro', label: 'Outro', iconName: 'dots' },
] as const

export const AMOUNT_CHIPS = [1, 5, 10] as const
export const AMOUNT_MIN = 1
export const AMOUNT_MAX = 10
export const AMOUNT_STEP = 1
export const AMOUNT_DEFAULT = 5

export const SCORE_THRESHOLD = 600
export const SCORE_MAX = 1000

export type ReasonIconName = ReasonOption['iconName']
export type ReasonChild = { id: ReasonOption['id']; label: string; icon: ReactNode }
