// Score helper — MVP. Em produção: parse OCR real (GPT-4o Vision).
interface ScoreInput { userId: string; amountBRL: number; ocrData: Record<string, unknown> }
interface ScoreResult { approved: boolean; score: number; limit_brl: number; interest_pct: number; inputs: Record<string, unknown> }

export function computeScore({ userId, amountBRL, ocrData }: ScoreInput): ScoreResult {
  const grossMonthly: number = (ocrData.gross_monthly_income as number) ?? mockEarnings()
  const MONTHS_RANGE = 6, MAX_RATIO = 0.30, MIN_INCOME = 1500
  const BASE_INTEREST = 0.025, MAX_INTEREST = 0.06

  const limit_brl = parseFloat((grossMonthly * MONTHS_RANGE * MAX_RATIO).toFixed(2))
  const score     = Math.min(1000, Math.floor(grossMonthly / 10))
  const approved  = grossMonthly >= MIN_INCOME && amountBRL <= limit_brl && score >= 300
  const interest_pct = approved
    ? parseFloat((BASE_INTEREST + (1 - score / 1000) * (MAX_INTEREST - BASE_INTEREST)).toFixed(4))
    : MAX_INTEREST

  return {
    approved, score, limit_brl, interest_pct,
    inputs: { gross_monthly_income: grossMonthly, months_range: MONTHS_RANGE, requested_amount: amountBRL, computed_limit: limit_brl, score_raw: score, algorithm_version: 'v1-mock' },
  }
}

function mockEarnings(): number { return 2500 + Math.floor(Math.random() * 3500) }
