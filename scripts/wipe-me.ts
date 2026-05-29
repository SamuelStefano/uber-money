// wipe-me — apaga a conta atual do Samuel pra demo fresh.
// Roda LOCAL com SUPABASE_SERVICE_ROLE_KEY no env.
//
// Uso: WALLET=<base58> deno run -A scripts/wipe-me.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const URL = 'https://qvoytjrfuyeammxsuwtx.supabase.co'
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WALLET = Deno.env.get('WALLET') ?? 'CQziGuEV4i8yGBHwQQJMpe6tACSMR5jWUWjmYSGVDAhW'

if (!KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')

const admin = createClient(URL, KEY)

console.log('Looking up user with wallet:', WALLET)
const { data: u, error: ue } = await admin.from('users').select('id').eq('wallet', WALLET).maybeSingle()
if (ue) throw ue
if (!u) { console.log('No user with that wallet — nothing to do'); Deno.exit(0) }

const userId = u.id
console.log('Found user_id:', userId)

// Apaga cascata (loan_requests CASCADE pra loans + payouts; documents é direto)
const tables = ['documents', 'loan_requests', 'users']
for (const t of tables) {
  const { error, count } = await admin.from(t).delete({ count: 'exact' }).eq(t === 'users' ? 'id' : 'user_id', userId)
  if (error) console.error(`  ✗ ${t}:`, error.message)
  else console.log(`  ✓ ${t}: ${count ?? 0} rows`)
}

console.log('Deleting auth.users entry…')
const { error: authErr } = await admin.auth.admin.deleteUser(userId)
if (authErr) console.error('  ✗ auth.users:', authErr.message)
else console.log('  ✓ auth.users')

console.log('\n✅ Conta apagada. Pode reconectar no app pra fluxo fresh.')
