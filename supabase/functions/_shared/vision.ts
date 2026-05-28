// Vision Claude — extração CNH/Earnings com:
//  - Modelo Sonnet (primary) → Opus (retry se módulo 11 falha)
//  - temperature 0 (determinismo dígitos)
//  - prompt explícito sobre CPF vs RG vs Nº Registro (squad consenso 10 agentes)
//  - validação módulo 11 LOCAL (modelo pode mentir no self-report)
import { isValidCpf, formatCpf, normalizeCpfDigits } from './cpf.ts'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const PRIMARY_MODEL = Deno.env.get('VISION_PRIMARY_MODEL') ?? 'claude-sonnet-4-5-20250929'
const RETRY_MODEL   = Deno.env.get('VISION_RETRY_MODEL')   ?? 'claude-opus-4-7'
const EARNINGS_MODEL = Deno.env.get('VISION_EARNINGS_MODEL') ?? 'claude-haiku-4-5-20251001'

export type CnhData = {
  name: string | null
  cpf: string | null
  birth_date: string | null
  valid_until: string | null
  category: string | null
  raw_text?: string
  confidence: 'high' | 'medium' | 'low'
}

export type EarningsData = {
  gross_monthly_income: number | null
  currency: 'BRL'
  period_days: number | null
  ride_count: number | null
  source: 'uber' | 'unknown'
  raw_text?: string
  confidence: 'high' | 'medium' | 'low'
}

const PROMPT_CNH = `Você é um extrator forense de CNH brasileira (Carteira Nacional de Habilitação). Sua leitura será usada pra KYC — qualquer erro de dígito invalida o cadastro. Precisão é mais importante que velocidade.

ESTRUTURA DA CNH (modelo CONTRAN 886/2021):
- Rótulo "NOME / NAME" — nome completo em CAIXA ALTA
- Rótulo "DOC. IDENTIDADE / ORG. EMISSOR / UF" — RG (NÃO É CPF; vem com sigla SSP/SP, IFP/RJ etc)
- Rótulo "CPF" — onze dígitos, formato XXX.XXX.XXX-XX (com pontos e hífen)
- Rótulo "DATA NASCIMENTO" — DD/MM/AAAA
- Rótulo "VALIDADE / EXPIRATION DATE" — DD/MM/AAAA
- Rótulo "CATEGORIA / CATEGORY" — letra(s) A/B/AB/C/D/E
- "Nº REGISTRO" — 11 dígitos contíguos sem pontuação, em vermelho destaque (NÃO É CPF)
- "Nº ESPELHO" — 11 dígitos verticais na borda esquerda (NÃO É CPF)

ATENÇÃO CRÍTICA: a CNH tem TRÊS números de 11 dígitos. Extraia APENAS o que está sob o rótulo literal "CPF" (com pontos e hífen visíveis ao lado). Se não houver rótulo "CPF" claramente visível, retorne null.

PROTOCOLO DO CPF:
1. Localize o rótulo "CPF" no documento.
2. Leia DÍGITO POR DÍGITO da esquerda pra direita.
3. Cuidado com confusões: 0↔O, 1↔I, 5↔S, 8↔B.
4. Valide pelo algoritmo módulo 11 (DV1 e DV2). Se não bater, releia.
5. Se mesmo após releitura não bate, retorne cpf=null e confidence=low.

FORMATO DE SAÍDA (JSON puro, sem markdown, sem comentários):
{
  "name": "string em CAIXA ALTA ou null",
  "cpf": "XXX.XXX.XXX-XX ou null",
  "birth_date": "YYYY-MM-DD ou null",
  "valid_until": "YYYY-MM-DD ou null",
  "category": "A|B|AB|C|D|E|AC|AD|AE ou null",
  "confidence": "high|medium|low"
}

NUNCA inclua texto fora do JSON. NUNCA use crase markdown.`

const PROMPT_EARNINGS = `Você é um extrator de "Tela de Ganhos" do app Uber/99 (motorista).

Extraia:
- gross_monthly_income: ganhos mensais (number BRL). Se a tela mostrar semanal, multiplique por 4.3.
- period_days: período em dias (ex: 7 pra semana, 30 pra mês).
- ride_count: número de corridas no período.
- source: "uber" se logo Uber visível; "unknown" caso contrário.

Retorne JSON puro:
{
  "gross_monthly_income": number ou null,
  "currency": "BRL",
  "period_days": number ou null,
  "ride_count": number ou null,
  "source": "uber" | "unknown",
  "confidence": "high" | "medium" | "low"
}

Sem markdown, sem comentários.`

export type VisionMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

interface CallArgs {
  model: string
  prompt: string
  imageBase64: string
  mediaType: VisionMediaType
  temperature?: number
}

async function callClaude<T>({ model, prompt, imageBase64, mediaType, temperature = 0 }: CallArgs): Promise<T> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const isPdf = mediaType === 'application/pdf'
  const content = isPdf
    ? [
        { type: 'document', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: prompt },
      ]
    : [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: prompt },
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
      model,
      max_tokens: 1024,
      temperature,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic ${model} error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text: string = (data.content?.[0]?.text ?? '').trim()
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart < 0 || jsonEnd < 0) throw new Error(`Resposta sem JSON: ${text.slice(0, 200)}`)
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as T
}

export async function visionExtract<T>(
  kind: 'cnh' | 'earnings',
  imageBase64: string,
  mediaType: VisionMediaType = 'image/jpeg',
): Promise<T> {
  if (kind === 'earnings') {
    const result = await callClaude<EarningsData>({
      model: EARNINGS_MODEL,
      prompt: PROMPT_EARNINGS,
      imageBase64,
      mediaType,
      temperature: 0,
    })
    return result as unknown as T
  }

  // CNH: pipeline com retry baseado em validação módulo 11
  console.log('[vision] CNH pass 1: Sonnet')
  const result = await callClaude<CnhData>({
    model: PRIMARY_MODEL,
    prompt: PROMPT_CNH,
    imageBase64,
    mediaType,
    temperature: 0,
  })

  const cpfRaw = result.cpf
  if (cpfRaw && isValidCpf(cpfRaw)) {
    result.cpf = formatCpf(normalizeCpfDigits(cpfRaw)!)
    console.log('[vision] CNH pass 1 OK (módulo 11 válido)')
    return result as unknown as T
  }

  console.warn('[vision] CNH pass 1 CPF inválido:', cpfRaw, '— retry com Opus')
  try {
    const retry = await callClaude<CnhData>({
      model: RETRY_MODEL,
      prompt: PROMPT_CNH,
      imageBase64,
      mediaType,
      temperature: 0,
    })
    if (retry.cpf && isValidCpf(retry.cpf)) {
      retry.cpf = formatCpf(normalizeCpfDigits(retry.cpf)!)
      console.log('[vision] CNH pass 2 OK (módulo 11 válido após Opus)')
      return retry as unknown as T
    }
    return { ...retry, confidence: 'low' } as unknown as T
  } catch (e) {
    console.error('[vision] CNH pass 2 falhou:', e)
    return { ...result, confidence: 'low' } as unknown as T
  }
}
