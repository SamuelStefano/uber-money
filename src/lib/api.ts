// api.ts — cliente real do backend (Supabase Edge Functions).
// Em dev sem env: usa mocks de lib/mock.ts. Em prod: hits reais com JWT.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ActivityItem, LoanDecision, PayoutReceipt } from '@/types/domain'

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

// JWT mintado por wallet-auth é custom (sem session em auth.sessions).
// Supabase JS `setSession` rejeita silenciosamente esse token, então armazenamos
// em memória aqui e usamos no authedFetch.
let _walletAccessToken: string | null = null
export function setWalletAccessToken(token: string | null) { _walletAccessToken = token }
export function getWalletAccessToken(): string | null { return _walletAccessToken }

async function authedFetch(path: string, body: unknown): Promise<Response> {
  const token = _walletAccessToken
    || (await supabase().auth.getSession()).data.session?.access_token
    || SUPABASE_ANON_KEY
  return fetch(fnUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
    setWalletAccessToken(data.access_token)
    // Best-effort setSession (Supabase JS pode rejeitar — não bloqueante)
    try {
      await supabase().auth.setSession({ access_token: data.access_token, refresh_token: '' })
    } catch (_) { /* ignore — usamos _walletAccessToken como fonte da verdade */ }
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

interface LoanRequestResponse {
  approved: boolean
  score: number
  approvedAmountBRL: number
  limit_brl: number
  interestPct: number
  installments: number
  dueDate: string | null
  loanId: string | null
  requestId: string
}

export async function requestLoan(amountBRL: number, reason: string): Promise<LoanDecision> {
  const mapped = REASON_MAP[reason] ?? 'other'
  const r = await authedFetch('request-loan', { amountBRL, reason: mapped })
  if (!r.ok) throw new Error(`request-loan: ${r.status} ${await r.text()}`)
  const data: LoanRequestResponse = await r.json()
  return {
    approved: data.approved,
    score: data.score,
    approvedAmountBRL: data.approvedAmountBRL,
    installments: data.installments,
    interestPct: data.interestPct,
    dueDate: data.dueDate ?? new Date().toISOString(),
    loanId: data.loanId ?? '',
    requestId: data.requestId,
    limit_brl: data.limit_brl,
  }
}

export type PixKeyType = 'cpf' | 'email' | 'phone' | 'evp'

interface PayoutResponse {
  payoutId: string
  status: 'pending'
  correlationId: string
  amountBRL: number
  mode?: 'prod' | 'mock'
}

interface ReleaseResponse {
  step: 'release'
  status: 'confirmed' | 'already_released' | 'pending_anchor_deploy'
  cpfHashHex?: string
  amountUSDC?: number
  txRelease?: string
  explorer?: string
  score?: number
}

// Step 1 (DR-002 D5): admin assina Anchor `release_loan`, USDC cai na wallet Solana do borrower.
export async function releaseLoan(loanId: string): Promise<ReleaseResponse> {
  const r = await authedFetch('request-payout', { action: 'release', loanId })
  if (!r.ok) throw new Error(`release-loan: ${r.status} ${await r.text()}`)
  return r.json()
}

// DR-004 F+: oracle assina Ed25519 attestation off-chain. Front leva no payload da tx
// que motorista assina via Phantom. Programa valida assinatura on-chain.
export interface ScoreAttestation {
  loanId: string
  cpfHashHex: string
  cpfHashBytes: number[]
  amountUSDC: string
  score: number
  expiresAt: string
  oraclePubkeyBase58: string
  oraclePubkeyBytes: number[]
  signature: number[]
  messageBytes: number[]
  borrowerWallet: string
}

export async function signScore(loanId: string): Promise<ScoreAttestation> {
  const r = await authedFetch('sign-score', { loanId })
  if (!r.ok) throw new Error(`sign-score: ${r.status} ${await r.text()}`)
  return r.json()
}

// Step 2 (DR-002 D5): off-ramp Woovi (PROD ou MOCK conforme env).
export async function requestPayout(loanId: string, pixKey: string, pixKeyType: PixKeyType): Promise<PayoutResponse> {
  const r = await authedFetch('request-payout', { action: 'payout', loanId, pixKey, pixKeyType })
  if (!r.ok) throw new Error(`request-payout: ${r.status} ${await r.text()}`)
  return r.json()
}

// ─── Histórico do user (lido direto via RLS — service_role bypass não usado) ────
interface LoanRow {
  id: string
  principal_brl: number
  interest_pct: number
  due_date: string
  status: string
  created_at: string
  request_id: string
}

interface PayoutRow {
  id: string
  amount_brl: number
  status: string
  pix_key: string
  created_at: string
  endtoend_id: string | null
  loan_id: string
}

export async function getUserActivity(): Promise<ActivityItem[]> {
  const sb = supabase()
  const [{ data: loans }, { data: payouts }] = await Promise.all([
    sb.from('loans').select('id, principal_brl, interest_pct, due_date, status, created_at, request_id').order('created_at', { ascending: false }).limit(20),
    sb.from('payouts').select('id, amount_brl, status, pix_key, created_at, endtoend_id, loan_id').eq('kind', 'release').eq('status', 'confirmed').order('created_at', { ascending: false }).limit(20),
  ])
  const items: ActivityItem[] = []
  for (const p of (payouts as PayoutRow[] | null) ?? []) {
    items.push({
      id: p.id,
      kind: 'pix',
      amountBRL: Number(p.amount_brl),
      label: 'Pix recebido',
      sub: `Empréstimo ${p.loan_id.slice(0, 8)} · ${p.pix_key}`,
      timestamp: p.created_at,
    })
  }
  for (const l of (loans as LoanRow[] | null) ?? []) {
    items.push({
      id: l.id,
      kind: 'loan',
      amountBRL: Number(l.principal_brl),
      label: 'Empréstimo aberto',
      sub: `${(Number(l.interest_pct) * 100).toFixed(1)}%/mês · vence ${new Date(l.due_date).toLocaleDateString('pt-BR')}`,
      timestamp: l.created_at,
    })
  }
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return items
}

interface PayoutStatusRow {
  status: 'pending' | 'confirmed' | 'failed'
  endtoend_id: string | null
  amount_brl: number
  created_at: string
  pix_key: string
}

export async function getPayoutStatus(payoutId: string): Promise<PayoutStatusRow | null> {
  const { data } = await supabase()
    .from('payouts')
    .select('status, endtoend_id, amount_brl, created_at, pix_key')
    .eq('id', payoutId)
    .maybeSingle()
  return (data as PayoutStatusRow | null) ?? null
}

export async function pollUntilConfirmed(payoutId: string, opts: { intervalMs?: number; timeoutMs?: number } = {}): Promise<PayoutReceipt> {
  const interval = opts.intervalMs ?? 2000
  const timeout = opts.timeoutMs ?? 60_000
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const row = await getPayoutStatus(payoutId)
    if (row?.status === 'confirmed') {
      return {
        id: row.endtoend_id ?? payoutId,
        amountBRL: Number(row.amount_brl),
        timestamp: row.created_at,
        to: row.pix_key,
      }
    }
    if (row?.status === 'failed') throw new Error('Pix recusado pelo Woovi')
    await new Promise((r) => setTimeout(r, interval))
  }
  throw new Error('Timeout aguardando confirmação do Pix')
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
