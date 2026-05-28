// Claude Vision wrapper — extrai dados estruturados de CNH e extrato bancário.
// Doc: https://docs.anthropic.com/en/docs/build-with-claude/vision

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export type CnhData = {
  name: string | null
  cpf: string | null
  birth_date: string | null      // ISO YYYY-MM-DD
  valid_until: string | null     // ISO
  category: string | null        // A/B/AB/C/D/E
  raw_text?: string
  confidence: 'high' | 'medium' | 'low'
}

export type EarningsData = {
  gross_monthly_income: number | null
  currency: 'BRL'
  period_days: number | null     // ex: 30 (último mês), 7 (última semana)
  ride_count: number | null
  source: 'uber' | 'unknown'
  raw_text?: string
  confidence: 'high' | 'medium' | 'low'
}

const PROMPTS = {
  cnh: `Você é um extrator de dados de CNH brasileira (Carteira Nacional de Habilitação).
Analise a imagem e retorne APENAS um JSON válido com este formato exato (sem markdown, sem comentários):
{
  "name": "string ou null",
  "cpf": "XXX.XXX.XXX-XX ou null",
  "birth_date": "YYYY-MM-DD ou null",
  "valid_until": "YYYY-MM-DD ou null",
  "category": "A|B|AB|C|D|E ou null",
  "confidence": "high|medium|low"
}
Se a imagem não parecer uma CNH, retorne todos os campos como null e confidence="low".`,

  earnings: `Você é um extrator de dados de tela de ganhos de motorista Uber/99/iFood.
Analise o screenshot e retorne APENAS um JSON válido (sem markdown):
{
  "gross_monthly_income": number ou null (em reais, ex: 4250.50),
  "currency": "BRL",
  "period_days": number (30 se for mês, 7 se semana, 1 se dia, etc),
  "ride_count": number ou null,
  "source": "uber" se identificar Uber, senão "unknown",
  "confidence": "high|medium|low"
}
Se a imagem não for uma tela de ganhos, retorne valores null e confidence="low".`,
}

export type VisionMediaType =
  | 'image/jpeg' | 'image/png' | 'image/webp'
  | 'application/pdf'

export async function visionExtract<T>(
  kind: 'cnh' | 'earnings',
  imageBase64: string,
  mediaType: VisionMediaType = 'image/jpeg',
): Promise<T> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  // Claude API: PDF usa content type `document` com header `anthropic-beta: pdfs-2024-09-25`.
  // Imagem usa content type `image` direto.
  const isPdf = mediaType === 'application/pdf'
  const content = isPdf
    ? [
        { type: 'document', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: PROMPTS[kind] },
      ]
    : [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: PROMPTS[kind] },
      ]

  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  }
  if (isPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25'

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  const body = await res.json()
  const text = body?.content?.[0]?.text ?? '{}'
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new Error(`Failed to parse vision JSON: ${cleaned.slice(0, 200)}`)
  }
}
