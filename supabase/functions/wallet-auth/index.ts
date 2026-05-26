// wallet-auth — ed25519 nonce + signature → Supabase JWT (HS256 com SUPABASE_JWT_SECRET).
// Padrão DFL: minta JWT direto (não generateLink), aud=authenticated, role=authenticated.
// Ver memory: supabase_edge_auth_gotcha.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nacl from 'https://esm.sh/tweetnacl@1.0.3'
import bs58 from 'https://esm.sh/bs58@5.0.0'
import { v5 as uuidv5 } from 'https://esm.sh/uuid@9.0.1'
import * as jose from 'https://esm.sh/jose@5.9.6'
import { json, handleOptions } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET')
const UUID_NAMESPACE = Deno.env.get('WALLET_UUID_NAMESPACE')
const NONCE_TTL_MINUTES = 10
const JWT_EXPIRY_SECONDS = 60 * 60 * 24 // 24h

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

async function mintJWT(userId: string, wallet: string): Promise<{ access_token: string; refresh_token: string }> {
  if (!JWT_SECRET) throw new Error('SUPABASE_JWT_SECRET not set')
  const secret = new TextEncoder().encode(JWT_SECRET)
  const now = Math.floor(Date.now() / 1000)
  const access_token = await new jose.SignJWT({
    aud: 'authenticated',
    role: 'authenticated',
    iss: SUPABASE_URL + '/auth/v1',
    sub: userId,
    email: `${userId}@wallet.local`,
    app_metadata: { provider: 'solana_wallet', wallet },
    user_metadata: { wallet },
    session_id: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + JWT_EXPIRY_SECONDS)
    .sign(secret)

  // Refresh token long-lived (90d), same secret. Real refresh flow seria via /auth/v1/token.
  const refresh_token = await new jose.SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24 * 90)
    .sign(secret)

  return { access_token, refresh_token }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions()
  if (!UUID_NAMESPACE) return json({ error: 'WALLET_UUID_NAMESPACE not configured' }, 500)

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

    // Upsert public.users (capturando erro — review HIGH MED-7)
    const { error: upsertErr } = await admin.from('users').upsert({ id: userId, wallet: body.wallet }, { onConflict: 'wallet' })
    if (upsertErr) return json({ error: 'User upsert failed', details: upsertErr.message }, 500)

    // Upsert auth.users (ignore "already exists")
    const placeholderEmail = `${userId}@wallet.local`
    const { error: createErr } = await admin.auth.admin.createUser({
      id: userId, email: placeholderEmail, email_confirm: true,
      app_metadata: { wallet: body.wallet, provider: 'solana_wallet' },
    })
    if (createErr && !/registered|exists|already/i.test(createErr.message)) {
      return json({ error: createErr.message }, 500)
    }

    // Mint JWT direto
    try {
      const tokens = await mintJWT(userId, body.wallet)
      return json({ user_id: userId, wallet: body.wallet, ...tokens })
    } catch (e) {
      return json({ error: 'JWT mint failed', details: String(e) }, 500)
    }
  }
  return json({ error: 'Unknown action' }, 400)
})
