// request-payout — dispatcher pra 2 steps (DR-002 D5):
//   action='release' (Step 1) → admin assina Anchor release_loan, USDC cai na wallet do borrower
//   action='payout'  (Step 2) → Woovi PROD ou MOCK (WOOVI_MODE) → Pix cai
// 1 edge fn com 2 handlers internos (não 2 fns deployadas — A6 amend).
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, handleOptions } from '../_shared/cors.ts'

// @solana/web3.js + @solana/spl-token são GRANDES e estouravam WORKER_RESOURCE_LIMIT
// no cold start do isolate Edge. Lazy-load só no caminho release.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WOOVI_API_KEY = Deno.env.get('WOOVI_API_KEY') ?? ''
const WOOVI_BASE = Deno.env.get('WOOVI_API_URL') ?? 'https://api.openpix.com.br/api/v1'
const WOOVI_MODE = (Deno.env.get('WOOVI_MODE') ?? 'mock').toLowerCase() // 'prod' | 'mock'
const MAX_BRL = Number(Deno.env.get('PAYOUT_MAX_BRL') ?? '10')
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

type ReleaseBody = { action: 'release'; loanId: string }
type PayoutBody  = { action: 'payout';  loanId: string; pixKey: string; pixKeyType: 'cpf' | 'email' | 'phone' | 'evp' }
type Body = ReleaseBody | PayoutBody

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)

  const authHeader = req.headers.get('Authorization') ?? ''
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401, req)

  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, req) }

  switch (body.action) {
    case 'release': return handleRelease(req, admin, user.id, body)
    case 'payout':  return handlePayout(req, admin, user.id, body)
    default:        return json({ error: 'Invalid action — expected "release" or "payout"' }, 400, req)
  }
})

// ─── Step 1: Anchor release_loan (USDC devnet → borrower) ───────────────────
async function handleRelease(req: Request, admin: SupabaseClient, userId: string, body: ReleaseBody) {
  if (!body.loanId) return json({ error: 'loanId required' }, 400, req)

  const { data: loan, error: loanErr } = await admin
    .from('loans')
    .select('id, status, principal_brl, tx_release, request_id, loan_requests!inner(user_id, score)')
    .eq('id', body.loanId)
    .maybeSingle()
  if (loanErr || !loan) return json({ error: 'Loan not found' }, 404, req)
  if ((loan as any).loan_requests.user_id !== userId) return json({ error: 'Forbidden' }, 403, req)
  // Squad A3 amend: idempotência via 200 + status enum (não 409 + string match).
  // Front consome `status === 'already_released'` como sucesso natural.
  if (loan.tx_release) {
    return json({
      step: 'release',
      status: 'already_released',
      txRelease: loan.tx_release,
      explorer: `https://explorer.solana.com/tx/${loan.tx_release}?cluster=devnet`,
    }, 200, req)
  }

  // Read user CPF (from CNH OCR) + pepper
  const { data: cnh } = await admin
    .from('documents').select('ocr_data').eq('user_id', userId).eq('kind', 'cnh').maybeSingle()
  const cpfRaw = ((cnh?.ocr_data as any)?.cpf ?? '').replace(/\D/g, '')
  if (!cpfRaw || cpfRaw.length !== 11) return json({ error: 'CPF not extracted from CNH' }, 400, req)

  const { data: userRow } = await admin.from('users').select('cpf_pepper, wallet').eq('id', userId).maybeSingle()
  const pepper: ArrayBuffer | null = userRow?.cpf_pepper ? hexToBuffer(userRow.cpf_pepper as string) : null
  if (!pepper) return json({ error: 'User pepper not initialized' }, 500, req)

  const cpfHash = await sha256Concat(new TextEncoder().encode(cpfRaw), new Uint8Array(pepper))
  const cpfHashHex = '\\x' + bufferToHex(cpfHash)

  // DR-003 D7: chama Anchor release_loan via admin signer server-side.
  const amountUSDC = BigInt(Math.round(Math.min(Number(loan.principal_brl), MAX_BRL) * 1e6 / 5)) // mock cotação 1 USDC = R$5
  const score = Number((loan as any).loan_requests.score ?? 0)

  await admin.from('loans').update({ cpf_hash: cpfHashHex }).eq('id', loan.id)
  await admin.from('loan_requests').update({ cpf_hash: cpfHashHex }).eq('id', loan.request_id)

  const { data: userRow2 } = await admin.from('users').select('wallet').eq('id', userId).maybeSingle()
  if (!userRow2?.wallet) return json({ error: 'User wallet not registered' }, 400, req)

  try {
    // Lazy-load Anchor signer + PublicKey só nesse caminho (cold-start friendly)
    const [{ releaseLoan: anchorReleaseLoan }, { PublicKey }] = await Promise.all([
      import('../_shared/anchor-signer.ts'),
      import('https://esm.sh/@solana/web3.js@1.95.3'),
    ])
    const txSig = await anchorReleaseLoan({
      cpfHash,
      amount: amountUSDC,
      score,
      borrower: new PublicKey(userRow2.wallet),
    })
    // HIGH-1 fix: log se update falhar — tx Solana já confirmou, perder ref aqui = drift on-chain vs DB.
    const { error: updErr } = await admin.from('loans').update({ tx_release: txSig }).eq('id', loan.id)
    if (updErr) console.error('[release] CRITICAL: tx_release update failed after on-chain success', { txSig, loanId: loan.id, err: updErr.message })
    return json({
      step: 'release',
      status: 'confirmed',
      cpfHashHex,
      amountUSDC: Number(amountUSDC),
      score,
      txRelease: txSig,
      explorer: `https://explorer.solana.com/tx/${txSig}?cluster=devnet`,
    }, 200, req)
  } catch (e) {
    // Se Anchor não está deployado ainda OU keypair faltando, retorna pending pra front mostrar fallback.
    const errMsg = e instanceof Error ? e.message : String(e)
    if (errMsg.includes('SOLANA_ADMIN_KEYPAIR_JSON') || errMsg.includes('Vault account not found')) {
      return json({
        step: 'release',
        status: 'pending_anchor_deploy',
        cpfHashHex,
        amountUSDC: Number(amountUSDC),
        score,
        note: errMsg,
      }, 202, req)
    }
    return json({ error: 'release_loan failed', details: errMsg }, 502, req)
  }
}

// ─── Step 2: Woovi Pix payout (PROD ou MOCK) ────────────────────────────────
async function handlePayout(req: Request, admin: SupabaseClient, userId: string, body: PayoutBody) {
  if (!body.loanId || !body.pixKey || !body.pixKeyType) {
    return json({ error: 'loanId, pixKey, pixKeyType required' }, 400, req)
  }

  const { data: loan, error: loanErr } = await admin
    .from('loans')
    .select('id, status, principal_brl, request_id, loan_requests!inner(user_id)')
    .eq('id', body.loanId)
    .maybeSingle()
  if (loanErr || !loan) return json({ error: 'Loan not found' }, 404, req)
  if ((loan as any).loan_requests.user_id !== userId) return json({ error: 'Forbidden' }, 403, req)
  if (loan.status !== 'open') return json({ error: 'Loan not open' }, 400, req)

  // pixKey ↔ CPF do OCR (DR-001 D6 — anti CNH-roubada).
  if (body.pixKeyType === 'cpf') {
    const { data: cnhDoc } = await admin
      .from('documents').select('ocr_data').eq('user_id', userId).eq('kind', 'cnh').maybeSingle()
    const ocrCpf = (cnhDoc?.ocr_data as any)?.cpf
    const norm = (s: string) => s.replace(/\D/g, '')
    if (!ocrCpf || norm(ocrCpf) !== norm(body.pixKey)) {
      return json({ error: 'pixKey CPF does not match CNH on file' }, 403, req)
    }
  }

  const amountBRL = Math.min(Number(loan.principal_brl), MAX_BRL)
  const amountCents = Math.round(amountBRL * 100)

  const { data: existing } = await admin
    .from('payouts')
    .select('id, status')
    .eq('loan_id', body.loanId)
    .eq('kind', 'release')
    .in('status', ['pending', 'confirmed'])
    .maybeSingle()
  if (existing) return json({ error: `Payout already ${existing.status}`, payoutId: existing.id }, 409, req)

  const correlationId = crypto.randomUUID()

  const { data: payout, error: payoutErr } = await admin
    .from('payouts')
    .insert({
      loan_id: body.loanId, kind: 'release', amount_brl: amountBRL,
      pix_key: body.pixKey, pix_key_type: body.pixKeyType,
      status: 'pending', woovi_correlation_id: correlationId,
    })
    .select('id')
    .single()
  if (payoutErr) return json({ error: payoutErr.message }, 500, req)

  // DR-002 D8 + sandbox: 3 modos suportados.
  //   mock     → confirma em 8s sem chamar Woovi (demo offline)
  //   sandbox  → chama Woovi sandbox real (Pix fake mas request real)
  //   prod     → chama Woovi PRODUÇÃO (Pix real)
  if (WOOVI_MODE === 'mock') {
    setTimeout(async () => {
      try {
        await admin.from('payouts').update({
          status: 'confirmed',
          woovi_payload: { mocked: true, correlationId, paidAt: new Date().toISOString() },
        }).eq('id', payout.id)
      } catch (e) { console.error('[mock] update failed', e) }
    }, 8000)
    return json({
      payoutId: payout.id, status: 'pending', correlationId, amountBRL,
      mode: 'mock', note: 'Confirmed in ~8s via mock background update.',
    }, 200, req)
  }

  // sandbox ou prod → Woovi real
  try {
    const wooviRes = await fetch(`${WOOVI_BASE}/charge`, {
      method: 'POST',
      // Woovi aceita AppID direto no Authorization (sem prefixo Bearer)
      headers: { 'Authorization': WOOVI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correlationID: correlationId,
        value: amountCents,
        comment: `Uber Money - emprestimo ${body.loanId.slice(0, 8)}`,
        customer: { name: 'Motorista Uber Money', taxID: body.pixKeyType === 'cpf' ? body.pixKey : undefined },
      }),
      signal: AbortSignal.timeout(25_000),
    })
    const wooviText = await wooviRes.text()
    let wooviData: any = null
    try { wooviData = JSON.parse(wooviText) } catch { /* keep raw */ }

    if (!wooviRes.ok) {
      await admin.from('payouts').update({ status: 'failed', error_message: wooviText, woovi_payload: wooviData }).eq('id', payout.id)
      return json({ error: 'Woovi error', status: wooviRes.status, details: wooviText }, 502, req)
    }

    await admin.from('payouts').update({ woovi_payload: wooviData }).eq('id', payout.id)
    return json({ payoutId: payout.id, status: 'pending', correlationId, amountBRL, mode: WOOVI_MODE }, 200, req)
  } catch (e) {
    await admin.from('payouts').update({ status: 'failed', error_message: String(e) }).eq('id', payout.id)
    return json({ error: 'Network error', details: String(e) }, 502, req)
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────
async function sha256Concat(a: Uint8Array, b: Uint8Array): Promise<Uint8Array> {
  const buf = new Uint8Array(a.length + b.length)
  buf.set(a, 0); buf.set(b, a.length)
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buf))
}
function bufferToHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
}
function hexToBuffer(hex: string): ArrayBuffer {
  const clean = hex.startsWith('\\x') ? hex.slice(2) : hex
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out.buffer
}
