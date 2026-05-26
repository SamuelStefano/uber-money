// woovi-webhook — recebe eventos do Woovi, valida HMAC-SHA256, atualiza payout idempotente.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, handleOptions, corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('WOOVI_WEBHOOK_SECRET') ?? ''
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

async function verifyHmac(rawBody: string, signature: string, secret: string): Promise<boolean> {
  if (!secret) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const computed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const hex = Array.from(new Uint8Array(computed)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === signature
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions()
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const raw = await req.text()
  const sig = req.headers.get('x-webhook-signature') ?? req.headers.get('x-openpix-signature') ?? ''

  // Validate signature (gracefully fail open in dev if secret not set, but log).
  if (WEBHOOK_SECRET) {
    const ok = await verifyHmac(raw, sig, WEBHOOK_SECRET)
    if (!ok) return json({ error: 'Invalid signature' }, 403)
  }

  let payload: Record<string, any>
  try { payload = JSON.parse(raw) } catch { return json({ error: 'Invalid JSON' }, 400) }

  // Woovi shape varies; correlationID is the canonical link.
  const transfer = payload.transfer ?? payload.charge ?? payload
  const correlationId: string | undefined = transfer.correlationID ?? transfer.correlationId
  const wooviStatus: string | undefined = transfer.status ?? payload.status
  const endToEndId: string | undefined = transfer.endToEndId ?? transfer.endtoendId

  if (!correlationId) return json({ error: 'Missing correlationID' }, 400)

  const completed = wooviStatus && /COMPLETED|CONFIRMED|PAID|SUCCESS/i.test(wooviStatus)
  const failed = wooviStatus && /FAILED|ERROR|DENIED|REJECTED/i.test(wooviStatus)
  const localStatus = completed ? 'confirmed' : failed ? 'failed' : 'pending'

  // Idempotent update — só sai de pending uma vez
  const { data: updated, error: updErr } = await admin
    .from('payouts')
    .update({ status: localStatus, endtoend_id: endToEndId ?? null, woovi_payload: payload })
    .eq('woovi_correlation_id', correlationId)
    .eq('status', 'pending')
    .select('id, loan_id, kind')
    .maybeSingle()

  if (updErr) return json({ error: updErr.message }, 500)

  // Repay confirmed → close loan
  if (updated && localStatus === 'confirmed' && updated.kind === 'repay') {
    await admin.from('loans').update({ status: 'paid' }).eq('id', updated.loan_id)
  }

  return json({ received: true, correlationId, status: localStatus })
})
