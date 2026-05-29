export type LoanReasonId = 'pneu' | 'suspensao' | 'bateria_chupeta' | 'bateria_troca' | 'troca_oleo' | 'outro'
export type FonteRenda = 'so_uber' | 'uber_secundaria' | 'uber_principal'
export type StatusVeiculo = 'financiado' | 'alugado' | 'proprio'
export type Negativacao = 'sim' | 'ja_teve' | 'nao'

export interface LoanRequestPayload {
  amountBRL: number
  reason: LoanReasonId
  otherText?: string
  tempo_uber_meses: number
  dias_semana: number
  corridas_semana: number
  fonte_renda: FonteRenda
  nota_motorista: number
  status_veiculo: StatusVeiculo
  negativacao: Negativacao
}

export interface ScoreBreakdown {
  tempo_uber: 'boa' | 'media' | 'ruim'
  dias_semana: 'boa' | 'media' | 'ruim'
  corridas_semana: 'boa' | 'media' | 'ruim'
  fonte_renda: 'boa' | 'media' | 'ruim'
  nota_motorista: 'boa' | 'media' | 'ruim'
  status_veiculo: 'boa' | 'media' | 'ruim'
  negativacao: 'boa' | 'media' | 'ruim'
}

export interface ScoreResult {
  approved: boolean
  rejection_reason: string | null
  score: number
  breakdown: ScoreBreakdown
  limit_brl: number
  interest_pct: number
  installments: number
  approved_amount_brl: number
}
