#!/usr/bin/env node
// wipe-me — apaga a conta atual pra demo fresh.
// Uso: WALLET=<base58> node scripts/wipe-me.mjs   (le SERVICE_ROLE do .env)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const URL_ = 'https://qvoytjrfuyeammxsuwtx.supabase.co'
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const WALLET = process.env.WALLET ?? 'CQziGuEV4i8yGBHwQQJMpe6tACSMR5jWUWjmYSGVDAhW'

if (!KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1) }

const admin = createClient(URL_, KEY)

console.log('Looking up user with wallet:', WALLET)
const { data: u, error: ue } = await admin.from('users').select('id').eq('wallet', WALLET).maybeSingle()
if (ue) { console.error(ue); process.exit(1) }
if (!u) { console.log('No user with that wallet — nothing to do'); process.exit(0) }

const userId = u.id
console.log('Found user_id:', userId)

// Pega loan_request_ids pra cascatear nas filhas
const { data: reqs } = await admin.from('loan_requests').select('id').eq('user_id', userId)
const reqIds = (reqs ?? []).map((r) => r.id)
console.log('  loan_requests:', reqIds.length)

async function deleteBatch(table, col, ids) {
  let total = 0
  for (let i = 0; i < ids.length; i += 100) {
    const slice = ids.slice(i, i + 100)
    const { count, error } = await admin.from(table).delete({ count: 'exact' }).in(col, slice)
    if (error) { console.error(`  x ${table} batch ${i}:`, error.message); break }
    total += count ?? 0
  }
  return total
}

async function fetchLoanIds(reqIds) {
  const all = []
  for (let i = 0; i < reqIds.length; i += 100) {
    const slice = reqIds.slice(i, i + 100)
    const { data } = await admin.from('loans').select('id').in('request_id', slice)
    for (const r of (data ?? [])) all.push(r.id)
  }
  return all
}

if (reqIds.length) {
  const loanIds = await fetchLoanIds(reqIds)
  console.log('  loans:', loanIds.length)
  if (loanIds.length) {
    const pc = await deleteBatch('payouts', 'loan_id', loanIds)
    console.log(`  ok payouts: ${pc}`)
  }
  const sc = await deleteBatch('score_snapshots', 'request_id', reqIds)
  console.log(`  ok score_snapshots: ${sc}`)
  const lc = await deleteBatch('loans', 'request_id', reqIds)
  console.log(`  ok loans: ${lc}`)
  const lrc = await deleteBatch('loan_requests', 'id', reqIds)
  console.log(`  ok loan_requests: ${lrc}`)
}

const { count: dc, error: de } = await admin.from('documents').delete({ count: 'exact' }).eq('user_id', userId); if (de) console.error('documents err:', de.message)
console.log(`  ok documents: ${dc ?? 0}`)
const { count: uc, error: uee } = await admin.from('users').delete({ count: 'exact' }).eq('id', userId); if (uee) console.error('users err:', uee.message)
console.log(`  ok users: ${uc ?? 0}`)

console.log('Deleting auth.users entry...')
const { error: authErr } = await admin.auth.admin.deleteUser(userId)
if (authErr) console.error('  x auth.users:', authErr.message)
else console.log('  ok auth.users')

console.log('\nConta apagada. Pode reconectar pra fluxo fresh.')
