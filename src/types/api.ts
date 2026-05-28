export type LoanReasonId = 'pneu' | 'combustivel' | 'manutencao' | 'outro'

export interface LoanRequestPayload {
  amountBRL: number
  reason: LoanReasonId
}
