// wallet-auth — ed25519 nonce challenge for Solana wallets.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nacl from 'https://esm.sh/tweetnacl@1.0.3'
import bs58 from 'https://esm.sh/bs58@5.0.0'
import { v5 as uuidv5 } from 'https://esm.sh/uuid@9.0.1'
import { corsHeaders, json, handleOptions } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const UUID_NAMESPACE = Deno.env.get('WALLET_UUID_NAMESPACE') ?? '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
const NONCE_TTL_MINUTES = 10
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions()
  let body: { action: 'get_nonce' | 'verify'; wallet: string; nonce?: string; signature?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  if (!body.wallet) return json({ error: 'wallet required' }, 400)
  try { if (bs58.decode(body.wallet).length !== 32) throw new Error() } catch { return json({ error: 'Invalid Solana pubkey' }, 400) }

  if (body.action === 'get_nonce') {
    const nonceValue = crypto.randomUUID().replace(/-/g, '')
    const { error } = await admin.from('nonces').insert({ wallet: body.wallet, value: nonceValue })
    if (error) return json({ error: error.message }, 500)
    return json({ nonce: nonceValue, message: `uber-money:${nonceValue}` })
  }

  if (body.action === 'verify') {
    if (!body.nonce || !body.signature) return json({ error: 'nonce and signature required' }, 400)
    const expiresAt = new Date(Date.now() - NONCE_TTL_MINUTES * 60 * 1000).toISOString()
    const { data: nonceRow, error: nonceErr } = await admin.from('nonces')
      .select('id').eq('wallet', body.wallet).eq('value', body.nonce).is('used_at', null).gte('created_at', expiresAt).maybeSingle()
    if (nonceErr || !nonceRow) return json({ error: 'Invalid or expired nonce' }, 401)

    try {
      const pk = bs58.decode(body.wallet), sig = bs58.decode(body.signature)
      const msg = new TextEncoder().encode(`uber-money:${body.nonce}`)
      if (!nacl.sign.detached.verify(msg, sig, pk)) return json({ error: 'Invalid signature' }, 401)
    } catch (e) { return json({ error: 'Signature verification failed', details: String(e) }, 401) }

    await admin.from('nonces').update({ used_at: new Date().toISOString() }).eq('id', nonceRow.id)
    const userId = uuidv5(body.wallet, UUID_NAMESPACE)
    await admin.from('users').upsert({ id: userId, wallet: body.wallet }, { onConflict: 'wallet' })

    const placeholderEmail = `${userId}@wallet.local`
    const { error: createErr } = await admin.auth.admin.createUser({
      id: userId, email: placeholderEmail, email_confirm: true,
      app_metadata: { wallet: body.wallet, provider: 'solana_wallet' },
    })
    if (createErr && !/registered|exists/i.test(createErr.message)) return json({ error: createErr.message }, 500)

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email: placeholderEmail })
    if (linkErr) return json({ error: linkErr.message }, 500)

    return json({ user_id: userId, wallet: body.wallet, access_token: link.properties?.hashed_token })
  }
  return json({ error: 'Unknown action' }, 400)
})
