// Score helper — clamp anti-OCR-alucinação, rejeita baixa confiança, calcula parcelas.
// DR-001 D6 (income clamp + reject low confidence) + NOVO-1 (installments versioning).
interface ScoreInput { userId: string; amountBRL: number; ocrData: Record<string, unknown> }
interface ScoreResult {
  approved: boolean; score: number; limit_brl: number; interest_pct: number;
  installments: number; inputs: Record<string, unknown>
}

const ALGO_VERSION = 'v3'
const INSTALLMENTS_RULES_VERSION = 'v1'
const MAX_PLAUSIBLE_MONTHLY = 50_000 // motorista Uber acima disso = OCR alucinação

function installmentsFor(amountBRL: number): number {
  if (amountBRL <= 3) return 1
  if (amountBRL <= 7) return 2
  return 3
}

export function computeScore({ userId: _userId, amountBRL, ocrData }: ScoreInput): ScoreResult {
  const rawIncome = ocrData.gross_monthly_income as number | null | undefined
  const confidence = (ocrData.confidence as string | undefined) ?? 'unknown'
  const MONTHS_RANGE = 6, MAX_RATIO = 0.30, MIN_INCOME = 1500
  const BASE_INTEREST = 0.029, MAX_INTEREST = 0.049

  const reject = (reason: string): ScoreResult => ({
    approved: false, score: 0, limit_brl: 0, interest_pct: MAX_INTEREST,
    installments: 1,
    inputs: { reason, confidence, algorithm_version: ALGO_VERSION,
      installments_rules_version: INSTALLMENTS_RULES_VERSION, requested_amount: amountBRL },
  })

  if (typeof rawIncome !== 'number' || !Number.isFinite(rawIncome) || rawIncome <= 0) return reject('no_ocr_income')
  if (confidence === 'low') return reject('low_ocr_confidence')

  const grossMonthly = Math.min(rawIncome, MAX_PLAUSIBLE_MONTHLY)
  const clamped = grossMonthly !== rawIncome

  const limit_brl = parseFloat((grossMonthly * MONTHS_RANGE * MAX_RATIO).toFixed(2))
  const score = Math.min(1000, Math.floor(grossMonthly / 10))
  const approved = grossMonthly >= MIN_INCOME && amountBRL <= limit_brl && score >= 600
  const interest_pct = approved
    ? parseFloat((BASE_INTEREST + (1 - score / 1000) * (MAX_INTEREST - BASE_INTEREST)).toFixed(4))
    : MAX_INTEREST

  return {
    approved, score, limit_brl, interest_pct,
    installments: installmentsFor(amountBRL),
    inputs: {
      gross_monthly_income: grossMonthly,
      gross_monthly_income_raw: rawIncome,
      income_clamped: clamped,
      confidence,
      months_range: MONTHS_RANGE,
      requested_amount: amountBRL,
      computed_limit: limit_brl,
      score_raw: score,
      algorithm_version: ALGO_VERSION,
      installments_rules_version: INSTALLMENTS_RULES_VERSION,
    },
  }
}
