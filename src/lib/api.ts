// api.ts — cliente real do backend (Supabase Edge Functions).
// Em dev sem env: usa mocks de services.ts. Em prod: hits reais com JWT.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const HAS_BACKEND = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

let _supabase: SupabaseClient | null = null
export function supabase(): SupabaseClient {
  if (!_supabase) {
    if (!HAS_BACKEND) throw new Error('Backend not configured (VITE_SUPABASE_URL missing)')
    _supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: true } })
  }
  return _supabase
}

const fnUrl = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`

async function authedFetch(path: string, body: unknown): Promise<Response> {
  const sess = (await supabase().auth.getSession()).data.session
  return fetch(fnUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sess?.access_token ?? SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })
}

// ─── Wallet auth ────────────────────────────────────────────────
export async function getNonce(wallet: string): Promise<{ nonce: string; message: string }> {
  const r = await fetch(fnUrl('wallet-auth'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_nonce', wallet }),
  })
  if (!r.ok) throw new Error(`get_nonce: ${r.status}`)
  return r.json()
}

export async function verifyWallet(wallet: string, nonce: string, signatureB58: string): Promise<{ access_token: string; user_id: string }> {
  const r = await fetch(fnUrl('wallet-auth'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', wallet, nonce, signature: signatureB58 }),
  })
  if (!r.ok) throw new Error(`verify: ${r.status} ${await r.text()}`)
  const data = await r.json()
  if (data.access_token) {
    await supabase().auth.setSession({ access_token: data.access_token, refresh_token: '' })
  }
  return data
}

// ─── Documents (CNH + earnings print) ───────────────────────────
export type DocKind = 'cnh' | 'print_earnings'

export async function processDocument(kind: DocKind, imageBase64: string, mediaType = 'image/jpeg') {
  const r = await authedFetch('process-document', { kind, imageBase64, mediaType })
  if (!r.ok) throw new Error(`process-document: ${r.status} ${await r.text()}`)
  return r.json() as Promise<{ document_id: string; kind: DocKind; ocr_data: any }>
}

// ─── Loan flow ──────────────────────────────────────────────────
// DR-001 D3: mapeia IDs do front (pneu/combustivel/...) pro enum loan_reason do backend.
const REASON_MAP: Record<string, 'emergency' | 'vehicle_repair' | 'fuel' | 'other'> = {
  pneu: 'vehicle_repair',
  combustivel: 'fuel',
  manutencao: 'vehicle_repair',
  outro: 'other',
  emergencia: 'emergency',
}

export async function requestLoan(amountBRL: number, reason: string) {
  const mapped = REASON_MAP[reason] ?? 'other'
  const r = await authedFetch('request-loan', { amountBRL, reason: mapped })
  if (!r.ok) throw new Error(`request-loan: ${r.status} ${await r.text()}`)
  return r.json()
}

export async function requestPayout(loanId: string, pixKey: string, pixKeyType: 'cpf' | 'email' | 'phone' | 'evp') {
  const r = await authedFetch('request-payout', { loanId, pixKey, pixKeyType })
  if (!r.ok) throw new Error(`request-payout: ${r.status} ${await r.text()}`)
  return r.json()
}

// ─── Helpers ────────────────────────────────────────────────────
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
}
