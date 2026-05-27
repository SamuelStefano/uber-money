export const MOCK_PIX_KEY = 'samuel.reis@uber.com'
export const MOCK_USER_NAME = 'Motorista'
export const MOCK_RECEIPT_DESTINATION = 'Samuel Reis'
export const MOCK_SERVICE_DELAY_MIN_MS = 700
export const MOCK_SERVICE_DELAY_MAX_MS = 1500
export const MOCK_OCR_DELAY_MS = 1200

export const MOCK_OCR_CNH = {
  name: 'Samuel Reis',
  cpf: '123.456.789-00',
  birth_date: null,
  valid_until: '2028-12-31',
  category: 'B',
  confidence: 'high' as const,
}

export const MOCK_OCR_EARNINGS = {
  gross_monthly_income: 4250,
  currency: 'BRL' as const,
  period_days: 30,
  ride_count: 412,
  source: 'uber' as const,
  confidence: 'high' as const,
}
