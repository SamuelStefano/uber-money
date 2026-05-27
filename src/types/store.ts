import type { User, WalletInfo, LoanDecision, PayoutReceipt, ActivityItem } from './domain'
import type { UploadedDocuments } from './documents'
import type { LoanRequestPayload } from './api'

export interface StoreState {
  user: User | null
  wallet: WalletInfo
  activity: ActivityItem[]
  lastDecision: LoanDecision | null
  lastReceipt: PayoutReceipt | null
  pendingRequest: LoanRequestPayload | null
  documents: UploadedDocuments | null
  muted: boolean
}

export type StoreUpdater = Partial<StoreState> | ((s: StoreState) => StoreState)
