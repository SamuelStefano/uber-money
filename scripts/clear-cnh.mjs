#!/usr/bin/env node
// Apaga o documento CNH atual do user pra forçar reupload.
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

const admin = createClient(URL_, KEY)
const { data: u } = await admin.from('users').select('id').eq('wallet', WALLET).maybeSingle()
if (!u) { console.log('Sem user'); process.exit(0) }
const { data: doc } = await admin.from('documents').select('id, storage_url').eq('user_id', u.id).eq('kind', 'cnh').maybeSingle()
if (!doc) { console.log('Sem CNH'); process.exit(0) }

if (doc.storage_url) {
  await admin.storage.from('documents').remove([doc.storage_url]).catch(() => {})
  console.log('  ok storage removido')
}
await admin.from('documents').delete().eq('id', doc.id)
console.log('  ok CNH apagada — pode reenviar pela UI')
