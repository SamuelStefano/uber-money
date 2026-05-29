export interface User {
  id: string
  name: string
  walletAddress: string
  walletProvider: string
  uberConnected: boolean
  accessToken?: string
}

export interface WalletInfo {
  balanceBRL: number
  pixKey: string | null
}

import type { ScoreAttestation } from '@/lib/api'

export interface ScoreBreakdownDecision {
  tempo_uber: 'boa' | 'media' | 'ruim'
  dias_semana: 'boa' | 'media' | 'ruim'
  corridas_semana: 'boa' | 'media' | 'ruim'
  fonte_renda: 'boa' | 'media' | 'ruim'
  nota_motorista: 'boa' | 'media' | 'ruim'
  status_veiculo: 'boa' | 'media' | 'ruim'
  negativacao: 'boa' | 'media' | 'ruim'
}

export interface LoanDecision {
  approved: boolean
  score: number
  approvedAmountBRL: number
  installments: number
  interestPct: number
  dueDate: string
  loanId: string
  requestId: string
  attestation?: ScoreAttestation
  limit_brl?: number
  score_breakdown?: ScoreBreakdownDecision
}

export interface PayoutReceipt {
  id: string
  amountBRL: number
  timestamp: string
  to: string
}

export type ActivityKind = 'loan' | 'pix'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  amountBRL: number
  label: string
  sub: string
  timestamp: string
}
