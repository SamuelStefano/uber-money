#!/usr/bin/env node
// Le o CPF que o OCR salvou pra esse user. Se quiser corrigir manualmente:
//   FIX="<cpf real>" node scripts/cnh-cpf.mjs
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
const FIX = process.env.FIX ?? null

const admin = createClient(URL_, KEY)
const { data: u } = await admin.from('users').select('id').eq('wallet', WALLET).maybeSingle()
if (!u) { console.log('Sem user'); process.exit(0) }
const { data: doc } = await admin.from('documents').select('id, ocr_data').eq('user_id', u.id).eq('kind', 'cnh').maybeSingle()
if (!doc) { console.log('Sem CNH'); process.exit(0) }

console.log('OCR atual:')
console.log('  cpf  :', doc.ocr_data?.cpf ?? '(vazio)')
console.log('  name :', doc.ocr_data?.name ?? '(vazio)')

if (FIX) {
  const norm = FIX.replace(/\D/g, '')
  if (norm.length !== 11) { console.error('CPF deve ter 11 digitos'); process.exit(1) }
  const merged = { ...(doc.ocr_data ?? {}), cpf: norm }
  await admin.from('documents').update({ ocr_data: merged }).eq('id', doc.id)
  console.log('\nFixed → cpf =', norm)
}
