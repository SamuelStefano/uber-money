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
  pixKey: string
}

export interface LoanDecision {
  approved: boolean
  score: number
  approvedAmountBRL: number
  installments: number
  interestPct: number
  dueDate: string
  loanId: string
  requestId?: string
  limit_brl?: number
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
