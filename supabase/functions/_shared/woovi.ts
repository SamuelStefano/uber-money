const _rawMode = (Deno.env.get('WOOVI_MODE') ?? 'mock').toLowerCase()
export type WooviMode = 'mock' | 'sandbox' | 'prod'
export const WOOVI_MODE: WooviMode = (_rawMode === 'prod' || _rawMode === 'sandbox') ? _rawMode : 'mock'

const WOOVI_URLS: Record<WooviMode, string> = {
  mock: 'http://localhost:54321/mock-woovi',
  sandbox: 'https://api.woovi-sandbox.com/api/v1',
  prod: 'https://api.woovi.com/api/v1',
}
export const WOOVI_BASE_URL: string = Deno.env.get('WOOVI_API_URL') ?? WOOVI_URLS[WOOVI_MODE]

const WOOVI_APP_ID = Deno.env.get('WOOVI_API_KEY') ?? ''

export interface WooviCustomer {
  name: string
  taxID?: string
  email?: string
  phone?: string
}

export interface CreateChargeInput {
  correlationId: string
  amountBRL: number
  comment: string
  customer: WooviCustomer
}

export interface CreateChargeOutput {
  brcode: string
  qrCodeImage: string
  paymentLinkUrl: string
  expiresAt: string | null
  raw: Record<string, unknown>
}

const MOCK_BRCODE =
  '00020126360014BR.GOV.BCB.PIX0114+5511900000000052040000530398654040.005802BR5909Uber Money6009Sao Paulo62070503***6304ABCD'

export async function createCharge(input: CreateChargeInput): Promise<CreateChargeOutput> {
  if (WOOVI_MODE === 'mock') {
    return {
      brcode: MOCK_BRCODE,
      qrCodeImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      paymentLinkUrl: `https://mock.local/pay/${input.correlationId}`,
      expiresAt: null,
      raw: { mock: true, correlationId: input.correlationId },
    }
  }

  const body = {
    correlationID: input.correlationId,
    value: Math.round(input.amountBRL * 100),
    comment: input.comment,
    customer: input.customer,
  }

  const res = await fetch(`${WOOVI_BASE_URL}/charge`, {
    method: 'POST',
    headers: { 'Authorization': WOOVI_APP_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  })

  const text = await res.text()
  let data: Record<string, unknown> = {}
  try { data = JSON.parse(text) } catch { /* keep empty */ }

  if (!res.ok) throw new Error(`Woovi ${res.status}: ${text}`)

  const charge = (data.charge ?? data) as Record<string, unknown>

  return {
    brcode: (charge.brCode ?? charge.brcode ?? '') as string,
    qrCodeImage: (charge.qrCodeImage ?? '') as string,
    paymentLinkUrl: (charge.paymentLinkUrl ?? '') as string,
    expiresAt: (charge.expiresIn ?? charge.expiresAt ?? null) as string | null,
    raw: data,
  }
}

export function mapWooviStatus(raw: string): 'pending' | 'confirmed' | 'failed' {
  if (/COMPLETED|CONFIRMED|PAID|SUCCESS/i.test(raw)) return 'confirmed'
  if (/FAILED|ERROR|DENIED|REJECTED/i.test(raw)) return 'failed'
  return 'pending'
}
