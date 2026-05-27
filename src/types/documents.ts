export type DocKind = 'cnh' | 'print_earnings'

export type Confidence = 'high' | 'medium' | 'low'

export interface CnhData {
  name: string | null
  cpf: string | null
  birth_date: string | null
  valid_until: string | null
  category: string | null
  raw_text?: string
  confidence: Confidence
}

export interface EarningsData {
  gross_monthly_income: number | null
  currency: 'BRL'
  period_days: number | null
  ride_count: number | null
  source: 'uber' | 'unknown'
  raw_text?: string
  confidence: Confidence
}

export interface UploadedDocuments {
  cnh: CnhData | null
  earnings: EarningsData | null
}
