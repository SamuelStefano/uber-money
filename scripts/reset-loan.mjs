#!/usr/bin/env node
// reset-loan — apaga loans/payouts/score_snapshots/loan_requests do user + regenera cpf_pepper
// pra liberar nova Loan PDA on-chain (mesmo CPF + pepper novo = hash diferente).
// Mantém auth.users + documents pra Samuel não precisar relogar nem reenviar CNH.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

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

console.log('Lookup user:', WALLET)
const { data: u } = await admin.from('users').select('id').eq('wallet', WALLET).maybeSingle()
if (!u) { console.log('Sem user'); process.exit(0) }
const userId = u.id
console.log('user_id:', userId)

const { data: reqs } = await admin.from('loan_requests').select('id').eq('user_id', userId)
const reqIds = (reqs ?? []).map((r) => r.id)
console.log('  loan_requests:', reqIds.length)

if (reqIds.length) {
  for (let i = 0; i < reqIds.length; i += 100) {
    const slice = reqIds.slice(i, i + 100)
    const { data: loans } = await admin.from('loans').select('id').in('request_id', slice)
    const loanIds = (loans ?? []).map((l) => l.id)
    if (loanIds.length) {
      await admin.from('payouts').delete().in('loan_id', loanIds)
    }
    await admin.from('score_snapshots').delete().in('request_id', slice)
    await admin.from('loans').delete().in('request_id', slice)
    await admin.from('loan_requests').delete().in('id', slice)
    console.log(`  batch ${i / 100 + 1}: ok`)
  }
}

const newPepperHex = '\\x' + randomBytes(32).toString('hex')
const { error: peErr } = await admin.from('users').update({
  cpf_pepper: newPepperHex,
}).eq('id', userId)
if (peErr) console.error('  pepper err:', peErr.message)
else console.log('  ok cpf_pepper regenerado (32 bytes novos)')

console.log('\nReset feito. Solicita credito de novo — nova PDA Loan on-chain (mesmo CPF, hash diferente).')
