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
  is_cnh: boolean
  document_type?: string | null
  name: string | null
  cpf: string | null
  birth_date: string | null
  valid_until: string | null
  category: string | null
  raw_text?: string
  confidence: 'high' | 'medium' | 'low'
}

export class NotACnhError extends Error {
  constructor(public detail: string) { super(detail); this.name = 'NotACnhError' }
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

const PROMPT_CNH = `Você é um extrator forense de CNH brasileira. Sua leitura será usada pra KYC — qualquer erro de dígito invalida o cadastro.

PASSO 1 — É CNH BRASILEIRA?
Marque is_cnh=true APENAS se enxergar TODOS:
- Título "CARTEIRA NACIONAL DE HABILITAÇÃO" ou "CNH" ou "DRIVER LICENSE"
- Brasão da República Federativa do Brasil
- Layout verde/amarelo (CONTRAN)
- Campos rotulados PT/EN/ES (NOME/NAME, CPF, VALIDADE/EXPIRATION)
- Foto do condutor

Se for outro documento (RG, comprovante, paisagem, screenshot, meme), retorne is_cnh=false e descreva em document_type. NÃO invente dados.

PASSO 2 — ZOOM MENTAL EM CADA CAMPO
Antes de extrair, imagine que está usando uma lupa virtual. Para CADA campo crítico (CPF, validade, data de nascimento), faça mentalmente:
a) Localize o RÓTULO exato no documento ("CPF", "VALIDADE", "DATA NASCIMENTO")
b) Centralize sua atenção visual SOMENTE na região do valor ao lado/abaixo do rótulo
c) Amplie a região mentalmente — leia cada dígito individualmente
d) Anote sua leitura
e) Releia o mesmo campo da DIREITA pra ESQUERDA pra confirmar
f) Se os dois passes coincidirem, use; senão, releia uma terceira vez

PASSO 3 — DIFERENCIAR OS 3 NÚMEROS DE 11 DÍGITOS
A CNH tem TRÊS números de 11 dígitos:
- CPF: sob rótulo "CPF", FORMATO XXX.XXX.XXX-XX (com pontos e hífen visíveis)
- Nº REGISTRO: SEM pontuação, em VERMELHO destaque, ROTULADO "Nº REGISTRO"
- Nº ESPELHO: VERTICAL na borda esquerda
Extraia APENAS o do rótulo "CPF". Se não vir o rótulo "CPF" claro, cpf=null.

PASSO 4 — PROTOCOLO ANTI-CONFUSÃO DE DÍGITOS
0 e O: 0 é mais retangular, O é mais redondo
1 e I e l: 1 tem topo angular, I é reto
5 e S: 5 tem ângulos retos, S é curvado
8 e B: 8 é fechado por loops, B tem barra vertical
6 e G: 6 é arredondado, G tem horizontal interna
2 e Z: 2 tem curva no topo, Z é todo angular

PASSO 5 — VALIDAR CPF (MÓDULO 11)
Aplique o algoritmo:
- DV1 = soma(D[i] × (10-i)) mod 11, se <2 = 0, senão 11-resultado
- DV2 = soma(D[i] × (11-i)) mod 11 incluindo DV1
Se DV1 e DV2 não baterem com os últimos 2 dígitos lidos, RELEIA com mais atenção.

PASSO 6 — VALIDADE: NÃO INVENTE
Se a região da validade está borrada, parcialmente coberta, ou ilegível, retorne valid_until=null. NUNCA chute ou complete com data plausível.

FORMATO DE SAÍDA (JSON puro, sem markdown):
{
  "is_cnh": true | false,
  "document_type": "CNH ou descrição do que é se não for CNH",
  "name": "string em CAIXA ALTA ou null",
  "cpf": "XXX.XXX.XXX-XX ou null",
  "cpf_reading_passes": ["leitura esquerda-direita", "leitura direita-esquerda"],
  "birth_date": "YYYY-MM-DD ou null",
  "valid_until": "YYYY-MM-DD ou null",
  "category": "A|B|AB|C|D|E|AC|AD|AE ou null",
  "confidence": "high|medium|low"
}

Se is_cnh=false, outros campos null. NUNCA inclua texto fora do JSON.`

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

  // CNH: cross-check Sonnet + Opus em paralelo, vota apenas se ambos concordarem
  console.log('[vision] CNH cross-check Sonnet + Opus em paralelo')
  const [sonnet, opus] = await Promise.all([
    callClaude<CnhData>({ model: PRIMARY_MODEL, prompt: PROMPT_CNH, imageBase64, mediaType, temperature: 0 }),
    callClaude<CnhData>({ model: RETRY_MODEL,   prompt: PROMPT_CNH, imageBase64, mediaType, temperature: 0 }),
  ])

  // Gate: pelo menos um confirma que NÃO é CNH → rejeita
  if (sonnet.is_cnh === false || opus.is_cnh === false) {
    const what = (sonnet.is_cnh === false ? sonnet.document_type : opus.document_type) ?? 'imagem'
    console.warn('[vision] não é CNH — detectado:', what)
    throw new NotACnhError(`Detectamos: ${what}. Envie uma foto da CNH brasileira.`)
  }

  const sCpf = normalizeCpfDigits(sonnet.cpf)
  const oCpf = normalizeCpfDigits(opus.cpf)
  const sValid = sCpf && isValidCpf(sCpf)
  const oValid = oCpf && isValidCpf(oCpf)

  console.log('[vision] Sonnet CPF:', sCpf, 'válido:', sValid, '— Opus CPF:', oCpf, 'válido:', oValid)

  // Caso ideal: ambos batem E ambos válidos → high confidence
  if (sValid && oValid && sCpf === oCpf) {
    console.log('[vision] cross-check OK — Sonnet e Opus concordam')
    return {
      ...opus,
      cpf: formatCpf(sCpf!),
      confidence: 'high',
    } as unknown as T
  }

  // Divergência ou um falha módulo 11: usa o que passa módulo 11 (mas marca medium)
  if (oValid) {
    console.warn('[vision] divergência — usando Opus (módulo 11 OK)')
    return {
      ...opus,
      cpf: formatCpf(oCpf!),
      confidence: 'medium',
    } as unknown as T
  }
  if (sValid) {
    console.warn('[vision] divergência — usando Sonnet (módulo 11 OK)')
    return {
      ...sonnet,
      cpf: formatCpf(sCpf!),
      confidence: 'medium',
    } as unknown as T
  }

  // Nenhum passa módulo 11 — retorna low confidence
  console.warn('[vision] nenhum passa módulo 11 — confidence low')
  return {
    ...opus,
    cpf: oCpf ? formatCpf(oCpf) : sCpf ? formatCpf(sCpf) : null,
    confidence: 'low',
  } as unknown as T
}
