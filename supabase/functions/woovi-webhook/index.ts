import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { jsonOpen as json, handleOptionsOpen as handleOptions } from '../_shared/cors.ts'
import { admin } from '../_shared/admin.ts'
import { hexToBytes } from '../_shared/bytes.ts'
import { deriveLoanPda, PublicKey } from '../_shared/anchor-signer.ts'
import { brlToUsdc, cappedBRL } from '../_shared/limits.ts'

const WEBHOOK_SECRET = Deno.env.get('WOOVI_WEBHOOK_SECRET')
const INSECURE_MODE = Deno.env.get('WOOVI_WEBHOOK_INSECURE_MODE') === 'true'
const LOCAL_DEV = Deno.env.get('LOCAL_DEV') === 'true'
const ENVIRONMENT = Deno.env.get('ENVIRONMENT')
const ALLOWED_INSECURE_ENVS = new Set(['sandbox', 'staging', 'local'])

if (INSECURE_MODE && !LOCAL_DEV && !ALLOWED_INSECURE_ENVS.has(ENVIRONMENT ?? '')) {
  console.error('[woovi-webhook] INSECURE_MODE bloqueado: ENVIRONMENT fora da whitelist', { ENVIRONMENT })
  throw new Error('WOOVI_WEBHOOK_INSECURE_MODE=true exige ENVIRONMENT in {sandbox,staging,local} ou LOCAL_DEV=true')
}

async function verifyHmac(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const computed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const hex = Array.from(new Uint8Array(computed)).map((b) => b.toString(16).padStart(2, '0')).join('')
  // constant-time comparison
  if (hex.length !== sig.length) return false
  let mismatch = 0
  for (let i = 0; i < hex.length; i++) mismatch |= hex.charCodeAt(i) ^ sig.charCodeAt(i)
  return mismatch === 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions()
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const raw = await req.text()

  if (INSECURE_MODE) {
    // Sandbox temp: aceita sem HMAC. Loga headers pra capturar o formato Woovi sandbox.
    const headers: Record<string, string> = {}
    req.headers.forEach((v, k) => { headers[k] = v })
    console.warn('[woovi-webhook] INSECURE_MODE=true (sandbox)', { headers, bodyPreview: raw.slice(0, 300) })
  } else {
    // Fail-closed em prod: sem secret = misconfigured
    if (!WEBHOOK_SECRET) return json({ error: 'Webhook misconfigured (missing WOOVI_WEBHOOK_SECRET)' }, 500)
    const sig = req.headers.get('x-webhook-signature') ?? req.headers.get('x-openpix-signature') ?? ''
    if (!sig) return json({ error: 'Missing signature' }, 401)
    const ok = await verifyHmac(raw, sig, WEBHOOK_SECRET)
    if (!ok) return json({ error: 'Invalid signature' }, 403)
  }

  let payload: Record<string, any>
  try { payload = JSON.parse(raw) } catch { return json({ error: 'Invalid JSON' }, 400) }

  // Teste de webhook do painel Woovi (ping) — não tem correlationID, só responde OK
  if (payload.evento === 'teste_webhook' || payload.event === 'teste_webhook') {
    console.log('[woovi-webhook] ping recebido', payload)
    return json({ received: true, ping: true })
  }

  const transfer = payload.transfer ?? payload.charge ?? payload
  const correlationId: string | undefined = transfer.correlationID ?? transfer.correlationId
  const wooviStatus: string | undefined = transfer.status ?? payload.status
  const endToEndId: string | undefined = transfer.endToEndId ?? transfer.endtoendId

  if (!correlationId) return json({ error: 'Missing correlationID' }, 400)

  const completed = wooviStatus && /COMPLETED|CONFIRMED|PAID|SUCCESS/i.test(wooviStatus)
  const failed = wooviStatus && /FAILED|ERROR|DENIED|REJECTED/i.test(wooviStatus)
  const localStatus = completed ? 'confirmed' : failed ? 'failed' : 'pending'

  // DR-001 / A4 CRIT-2: COMPLETED depois de FAILED é cenário real (sandbox flakey) — aceitar.
  // FAILED só atualiza se ainda pending. CONFIRMED nunca volta atrás.
  const allowedFromStatuses = localStatus === 'confirmed' ? ['pending', 'failed'] : ['pending']
  const { data: updated, error: updErr } = await admin
    .from('payouts')
    .update({ status: localStatus, endtoend_id: endToEndId ?? null, woovi_payload: payload })
    .eq('woovi_correlation_id', correlationId)
    .in('status', allowedFromStatuses)
    .select('id, loan_id, kind')
    .maybeSingle()

  if (updErr) return json({ error: updErr.message }, 500)

  if (updated && localStatus === 'confirmed' && updated.kind === 'repay') {
    // Gera RepayAttestation Ed25519 pra front re-assinar tx Anchor repay_loan.
    // NÃO marca loans.status='paid' aqui — só confirm-repayment faz isso após tx onchain confirmar.
    await generateAndStoreRepayAttestation(updated.id, updated.loan_id)
  }

  return json({ received: true, correlationId, status: localStatus })
})

async function generateAndStoreRepayAttestation(payoutId: string, loanId: string): Promise<void> {
  const { data: loan } = await admin
    .from('loans')
    .select('id, principal_brl, interest_pct, loan_requests!inner(cpf_hash, user_id)')
    .eq('id', loanId)
    .maybeSingle()
  if (!loan) { console.error('[woovi-webhook] loan not found', { loanId }); return }

  const cpfHashRaw = loan.loan_requests.cpf_hash
  if (!cpfHashRaw) { console.error('[woovi-webhook] cpf_hash missing', { loanId }); return }

  const { data: userRow } = await admin
    .from('users').select('wallet').eq('id', loan.loan_requests.user_id).maybeSingle()
  if (!userRow?.wallet) { console.error('[woovi-webhook] user wallet missing', { loanId }); return }

  const cpfHashHex = typeof cpfHashRaw === 'string'
    ? cpfHashRaw.replace(/^\\x/, '')
    : Array.from(cpfHashRaw as Uint8Array).map((b) => b.toString(16).padStart(2, '0')).join('')
  const cpfHash = hexToBytes(cpfHashHex)

  const [loanPdaPubkey] = deriveLoanPda(cpfHash)
  const loanPda = loanPdaPubkey.toBytes()
  const borrower = new PublicKey(userRow.wallet).toBytes()

  const amountBRL = cappedBRL(Number(loan.principal_brl) * (1 + Number(loan.interest_pct)))
  const amountUSDC = brlToUsdc(amountBRL)

  const { buildRepayAttestation } = await import('../_shared/ed25519-attest-repay.ts')
  const attestation = await buildRepayAttestation({
    cpfHash, loanPda, borrower, amountPaidUsdc: amountUSDC,
  })

  await admin.from('payouts').update({ attestation_payload: attestation }).eq('id', payoutId)
}

