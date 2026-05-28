// woovi-webhook — fail-closed HMAC + handle sha256= prefix + idempotent update.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonOpen as json, handleOptionsOpen as handleOptions } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('WOOVI_WEBHOOK_SECRET')
// ⚠️ Skip HMAC só pra sandbox enquanto não temos o secret no painel.
// NUNCA ativar em prod — qualquer chamada externa fica aceita.
const INSECURE_MODE = Deno.env.get('WOOVI_WEBHOOK_INSECURE_MODE') === 'true'
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

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
    await admin.from('loans').update({ status: 'paid' }).eq('id', updated.loan_id)
  }

  return json({ received: true, correlationId, status: localStatus })
})
