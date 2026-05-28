// Score helper — clamp anti-OCR-alucinação, rejeita baixa confiança, calcula parcelas.
// DR-001 D6 (income clamp + reject low confidence) + NOVO-1 (installments versioning).
interface ScoreInput { userId: string; amountBRL: number; ocrData: Record<string, unknown> }
interface ScoreResult {
  approved: boolean; score: number; limit_brl: number; interest_pct: number;
  installments: number; inputs: Record<string, unknown>
}

const ALGO_VERSION = 'v4'
const INSTALLMENTS_RULES_VERSION = 'v1'
const MAX_PLAUSIBLE_MONTHLY = 50_000 // motorista Uber acima disso = OCR alucinação
const ABSOLUTE_CAP_BRL = Number(Deno.env.get('PAYOUT_MAX_BRL') ?? '5000')

function installmentsFor(amountBRL: number): number {
  if (amountBRL <= 3) return 1
  if (amountBRL <= 7) return 2
  return 3
}

// v4: faixa de score → (% da renda mensal liberado, juros mês). Pré-pitch — Tainan revisa.
function tierFor(score: number): { ratio: number; interest: number } | null {
  if (score >= 850) return { ratio: 0.50, interest: 0.025 }
  if (score >= 700) return { ratio: 0.30, interest: 0.035 }
  if (score >= 600) return { ratio: 0.15, interest: 0.049 }
  return null
}

export function computeScore({ userId: _userId, amountBRL, ocrData }: ScoreInput): ScoreResult {
  const rawIncome = ocrData.gross_monthly_income as number | null | undefined
  const confidence = (ocrData.confidence as string | undefined) ?? 'unknown'
  const MIN_INCOME = 1500
  const MAX_INTEREST = 0.049

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
  const score = Math.min(1000, Math.floor(grossMonthly / 10))
  const tier = tierFor(score)

  if (!tier || grossMonthly < MIN_INCOME) {
    return { ...reject('below_threshold'), score }
  }

  const limit_brl = parseFloat(Math.min(grossMonthly * tier.ratio, ABSOLUTE_CAP_BRL).toFixed(2))
  const interest_pct = tier.interest
  const approved = amountBRL <= limit_brl

  return {
    approved, score, limit_brl, interest_pct,
    installments: installmentsFor(amountBRL),
    inputs: {
      gross_monthly_income: grossMonthly,
      gross_monthly_income_raw: rawIncome,
      income_clamped: clamped,
      confidence,
      tier_ratio: tier.ratio,
      tier_interest: tier.interest,
      absolute_cap_brl: ABSOLUTE_CAP_BRL,
      requested_amount: amountBRL,
      computed_limit: limit_brl,
      score_raw: score,
      algorithm_version: ALGO_VERSION,
      installments_rules_version: INSTALLMENTS_RULES_VERSION,
    },
  }
}
