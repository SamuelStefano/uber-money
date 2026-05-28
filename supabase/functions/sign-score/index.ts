// sign-score — DR-004 oracle off-chain.
//
// Front motorista chama esta edge ANTES de assinar a tx Phantom.
// Edge:
//   1. Valida JWT do motorista
//   2. Lê loan + loan_request do DB (lookup por loanId)
//   3. Computa cpf_hash = sha256(cpf || users.cpf_pepper)
//   4. Monta message = cpf_hash (32) || amount LE (8) || score LE (2) || expires_at LE (8) = 50 bytes
//   5. Assina message com Ed25519 (SOLANA_ADMIN_KEYPAIR_JSON)
//   6. Retorna payload pra front montar tx (Ed25519 verify ix + borrower_request_loan ix)
//
// Importante: NÃO sha256 do message antes de assinar. O programa Anchor
// verifica os bytes raw. Ed25519 já hasheia internamente.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nacl from 'https://esm.sh/tweetnacl@1.0.3'
import { json, handleOptions } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_KEYPAIR_JSON = Deno.env.get('SOLANA_ADMIN_KEYPAIR_JSON')!
const ATTESTATION_TTL_SECS = 300 // 5 min de janela pro motorista assinar

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

function loadAdminEd25519Keypair(): nacl.SignKeyPair {
  const bytes = new Uint8Array(JSON.parse(ADMIN_KEYPAIR_JSON))
  // Solana keypair JSON: 64 bytes (32 secret + 32 pubkey concatenados)
  // nacl espera secretKey de 64 bytes (= seed + pubkey ed25519)
  return nacl.sign.keyPair.fromSecretKey(bytes)
}

async function sha256Concat(...parts: Uint8Array[]): Promise<Uint8Array> {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const buf = new Uint8Array(total)
  let o = 0
  for (const p of parts) { buf.set(p, o); o += p.length }
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buf))
}

function hexToBuffer(hex: string): Uint8Array {
  const clean = hex.startsWith('\\x') ? hex.slice(2) : hex
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function bufToBase58(buf: Uint8Array): string {
  // bs58 inline simples — evita import pesado
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const BASE = 58n
  let num = 0n
  for (const b of buf) num = num * 256n + BigInt(b)
  let out = ''
  while (num > 0n) { out = ALPHABET[Number(num % BASE)] + out; num /= BASE }
  for (const b of buf) { if (b === 0) out = '1' + out; else break }
  return out
}

function u64LE(n: bigint): Uint8Array {
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigUint64(0, n, true)
  return b
}

function u16LE(n: number): Uint8Array {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}

function i64LE(n: bigint): Uint8Array {
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigInt64(0, n, true)
  return b
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)

  const authHeader = req.headers.get('Authorization') ?? ''
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401, req)

  let body: { loanId: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, req) }
  if (!body.loanId) return json({ error: 'loanId required' }, 400, req)

  // 1. Lê loan + ownership check
  const { data: loan, error: loanErr } = await admin
    .from('loans')
    .select('id, principal_brl, request_id, tx_release, loan_requests!inner(user_id, score)')
    .eq('id', body.loanId)
    .maybeSingle()
  if (loanErr || !loan) return json({ error: 'Loan not found' }, 404, req)
  if ((loan as any).loan_requests.user_id !== user.id) {
    return json({ error: 'Forbidden' }, 403, req)
  }
  if (loan.tx_release) {
    return json({ error: 'Loan already released', txRelease: loan.tx_release }, 409, req)
  }

  // 2. CPF do CNH (OCR)
  const { data: cnh } = await admin
    .from('documents').select('ocr_data').eq('user_id', user.id).eq('kind', 'cnh').maybeSingle()
  const cpfRaw = ((cnh?.ocr_data as any)?.cpf ?? '').replace(/\D/g, '')
  if (!cpfRaw || cpfRaw.length !== 11) {
    return json({ error: 'CPF not extracted from CNH' }, 400, req)
  }

  // 3. Pepper per-user + cpf_hash
  const { data: userRow } = await admin.from('users').select('cpf_pepper, wallet').eq('id', user.id).maybeSingle()
  if (!userRow?.cpf_pepper || !userRow?.wallet) {
    return json({ error: 'User wallet/pepper not initialized' }, 500, req)
  }
  const pepperBuf = hexToBuffer(userRow.cpf_pepper as string)
  const cpfHash = await sha256Concat(new TextEncoder().encode(cpfRaw), pepperBuf)

  // 4. Monta valores
  const amountUSDC = BigInt(Math.round(Math.min(Number(loan.principal_brl), 10) * 1e6 / 5)) // mock 1 USDC = R$5
  const score = Number((loan as any).loan_requests.score ?? 0)
  if (score < 600) return json({ error: 'Score below threshold' }, 400, req)
  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + ATTESTATION_TTL_SECS)

  // 5. Message bytes raw = cpf_hash (32) || amount LE (8) || score LE (2) || expires_at LE (8)
  const message = new Uint8Array(50)
  message.set(cpfHash, 0)
  message.set(u64LE(amountUSDC), 32)
  message.set(u16LE(score), 40)
  message.set(i64LE(expiresAt), 42)

  // 6. Assina Ed25519 (nacl.sign.detached internamente SHA512 + Ed25519 sign)
  const keypair = loadAdminEd25519Keypair()
  const signature = nacl.sign.detached(message, keypair.secretKey)
  const oraclePubkey = keypair.publicKey

  // 7. Persiste cpf_hash em loans + loan_requests (idempotente)
  const cpfHashHex = '\\x' + bufToHex(cpfHash)
  await admin.from('loans').update({ cpf_hash: cpfHashHex }).eq('id', loan.id)
  await admin.from('loan_requests').update({ cpf_hash: cpfHashHex }).eq('id', loan.request_id)

  return json({
    loanId: loan.id,
    cpfHashHex: bufToHex(cpfHash),
    cpfHashBytes: Array.from(cpfHash),
    amountUSDC: amountUSDC.toString(),
    score,
    expiresAt: expiresAt.toString(),
    oraclePubkeyBase58: bufToBase58(oraclePubkey),
    oraclePubkeyBytes: Array.from(oraclePubkey),
    signature: Array.from(signature),
    messageBytes: Array.from(message),
    borrowerWallet: userRow.wallet,
  }, 200, req)
})
