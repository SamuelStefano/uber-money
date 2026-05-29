#!/usr/bin/env node
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
const TX = process.env.TX ?? 'ciy6nGStJsuJmh37gW4X5KkAC8cwFUqausJa1CuKush79r3dDbfrGFhDhDrGVNzY852CZxqPHcJ878vuxR7knXM'

const admin = createClient(URL_, KEY)

const { data: u } = await admin.from('users').select('id').eq('wallet', WALLET).maybeSingle()
if (!u) { console.error('user not found'); process.exit(1) }
console.log('user_id:', u.id)

const { data: lr } = await admin
  .from('loan_requests')
  .select('id, amount_brl, interest_pct, cpf_hash, status')
  .eq('user_id', u.id)
  .eq('status', 'approved')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()
if (!lr) { console.error('no approved loan_request'); process.exit(1) }
console.log('loan_request:', lr.id, 'amount=', lr.amount_brl)

const { data: existing } = await admin
  .from('loans').select('id').eq('request_id', lr.id).maybeSingle()
if (existing) { console.log('already has loan:', existing.id); process.exit(0) }

const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
const { data: loan, error } = await admin
  .from('loans')
  .insert({
    request_id: lr.id,
    principal_brl: lr.amount_brl,
    interest_pct: lr.interest_pct,
    due_date: dueDate,
    status: 'open',
    tx_release: TX,
    cpf_hash: lr.cpf_hash,
  })
  .select('id').single()

if (error) { console.error('insert error:', error.message); process.exit(1) }
console.log('recovered loan:', loan.id)
console.log('tx:', TX)
console.log('explorer: https://explorer.solana.com/tx/' + TX + '?cluster=devnet')
