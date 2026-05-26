// request-payout — chama Woovi /api/v1/transfer com Bearer auth + payload no shape correto.
// Ref: openpix.com.br (Woovi white-label). Endpoint exato vai variar; ajustar conforme doc real.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json, handleOptions } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WOOVI_API_KEY = Deno.env.get('WOOVI_API_KEY')!
const WOOVI_BASE = Deno.env.get('WOOVI_API_URL') ?? 'https://api.openpix.com.br/api/v1'
const MAX_BRL = Number(Deno.env.get('PAYOUT_MAX_BRL') ?? '10')
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions()

  const authHeader = req.headers.get('Authorization') ?? ''
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  let body: { loanId: string; pixKey: string; pixKeyType: 'cpf' | 'email' | 'phone' | 'evp' }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  if (!body.loanId || !body.pixKey || !body.pixKeyType) return json({ error: 'loanId, pixKey, pixKeyType required' }, 400)

  // Ownership check
  const { data: loan, error: loanErr } = await admin
    .from('loans')
    .select('id, status, principal_brl, request_id, loan_requests!inner(user_id)')
    .eq('id', body.loanId)
    .maybeSingle()
  if (loanErr || !loan) return json({ error: 'Loan not found' }, 404)
  if ((loan as any).loan_requests.user_id !== user.id) return json({ error: 'Forbidden' }, 403)
  if (loan.status !== 'open') return json({ error: 'Loan not open' }, 400)

  const amountBRL = Math.min(Number(loan.principal_brl), MAX_BRL)
  const amountCents = Math.round(amountBRL * 100)

  // Idempotency: INCLUI pending — anti double-pay (review HIGH-4)
  const { data: existing } = await admin
    .from('payouts')
    .select('id, status')
    .eq('loan_id', body.loanId)
    .eq('kind', 'release')
    .in('status', ['pending', 'confirmed'])
    .maybeSingle()
  if (existing) return json({ error: `Payout already ${existing.status}`, payoutId: existing.id }, 409)

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
  if (payoutErr) return json({ error: payoutErr.message }, 500)

  // Call Woovi: Bearer auth + payload no shape padrão Woovi/OpenPix.
  // NOTA: o endpoint exato e shape do /transfer dependem da doc. Pra MVP usamos /charge
  // (que é amplamente documentado) e tratamos como "criação de Pix payout via QR code".
  // Se Woovi sandbox tiver /transfer documentado pro time, trocar aqui.
  try {
    const wooviRes = await fetch(`${WOOVI_BASE}/charge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WOOVI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        correlationID: correlationId,
        value: amountCents,
        comment: `Uber Money - emprestimo ${body.loanId.slice(0, 8)}`,
        customer: { name: 'Motorista Uber Money', taxID: body.pixKeyType === 'cpf' ? body.pixKey : undefined },
        // Outro shape comum: pixKey/destination — adicionar conforme retorno da doc Woovi.
      }),
    })
    const wooviText = await wooviRes.text()
    let wooviData: any = null
    try { wooviData = JSON.parse(wooviText) } catch { /* keep raw */ }

    if (!wooviRes.ok) {
      await admin.from('payouts').update({ status: 'failed', error_message: wooviText, woovi_payload: wooviData }).eq('id', payout.id)
      return json({ error: 'Woovi error', status: wooviRes.status, details: wooviText }, 502)
    }

    await admin.from('payouts').update({ woovi_payload: wooviData }).eq('id', payout.id)
    return json({ payoutId: payout.id, status: 'pending', correlationId, amountBRL })
  } catch (e) {
    await admin.from('payouts').update({ status: 'failed', error_message: String(e) }).eq('id', payout.id)
    return json({ error: 'Network error', details: String(e) }, 502)
  }
})
