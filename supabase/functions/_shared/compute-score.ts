// Score helper — production-ready: null OCR ⇒ rejeita (sem random fallback).
interface ScoreInput { userId: string; amountBRL: number; ocrData: Record<string, unknown> }
interface ScoreResult { approved: boolean; score: number; limit_brl: number; interest_pct: number; inputs: Record<string, unknown> }

export function computeScore({ userId: _userId, amountBRL, ocrData }: ScoreInput): ScoreResult {
  const grossMonthly = ocrData.gross_monthly_income as number | null | undefined
  const MONTHS_RANGE = 6, MAX_RATIO = 0.30, MIN_INCOME = 1500
  const BASE_INTEREST = 0.029, MAX_INTEREST = 0.049

  // Sem dado de OCR — rejeita (review MED-4: nada de mock em prod).
  if (typeof grossMonthly !== 'number' || grossMonthly <= 0) {
    return {
      approved: false, score: 0, limit_brl: 0, interest_pct: MAX_INTEREST,
      inputs: { reason: 'no_ocr_income', algorithm_version: 'v2', requested_amount: amountBRL },
    }
  }

  const limit_brl = parseFloat((grossMonthly * MONTHS_RANGE * MAX_RATIO).toFixed(2))
  const score = Math.min(1000, Math.floor(grossMonthly / 10))
  const approved = grossMonthly >= MIN_INCOME && amountBRL <= limit_brl && score >= 600
  const interest_pct = approved
    ? parseFloat((BASE_INTEREST + (1 - score / 1000) * (MAX_INTEREST - BASE_INTEREST)).toFixed(4))
    : MAX_INTEREST

  return {
    approved, score, limit_brl, interest_pct,
    inputs: {
      gross_monthly_income: grossMonthly,
      months_range: MONTHS_RANGE,
      requested_amount: amountBRL,
      computed_limit: limit_brl,
      score_raw: score,
      algorithm_version: 'v2',
    },
  }
}
