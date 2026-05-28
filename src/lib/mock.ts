import { sleep, uid } from '@/utils/uid'
import { nowISO } from '@/utils/format'
import {
  MOCK_PIX_KEY,
  MOCK_SERVICE_DELAY_MAX_MS,
  MOCK_SERVICE_DELAY_MIN_MS,
} from '@/consts/mock'
import { SCORE_THRESHOLD } from '@/consts/credit'
import type { LoanDecision, PayoutReceipt, WalletInfo } from '@/types/domain'
import type { LoanRequestPayload } from '@/types/api'

export async function getWalletMock(): Promise<WalletInfo> {
  await sleep(400, 700)
  return { balanceBRL: 0, pixKey: MOCK_PIX_KEY }
}

export async function requestCreditMock(payload: LoanRequestPayload): Promise<LoanDecision> {
  await sleep(1900, 2400)
  const score = 720
  const approved = score >= SCORE_THRESHOLD
  const interestPct = 3.9
  const installments = payload.amountBRL <= 3 ? 1 : payload.amountBRL <= 7 ? 2 : 3
  const due = new Date()
  due.setDate(due.getDate() + 7)
  return {
    approved,
    score,
    approvedAmountBRL: payload.amountBRL,
    installments,
    interestPct,
    dueDate: due.toISOString(),
    loanId: uid('LN_'),
  }
}

interface SendPixInput {
  amountBRL: number
  to?: string
}

export async function sendPixMock({ amountBRL, to }: SendPixInput): Promise<PayoutReceipt> {
  await sleep(MOCK_SERVICE_DELAY_MIN_MS - 100, MOCK_SERVICE_DELAY_MAX_MS - 600)
  return {
    id: 'E' + uid('').slice(0, 10) + Date.now().toString(36).toUpperCase().slice(-6),
    amountBRL,
    timestamp: nowISO(),
    to: to || MOCK_PIX_KEY,
  }
}
