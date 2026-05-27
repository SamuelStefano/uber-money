/**
 * smoke-wallet-auth.ts — testa wallet-auth (get_nonce + verify) end-to-end
 * usando a admin keypair pra reproduzir 500 do front.
 */
import { Keypair } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import fs from 'node:fs'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://qvoytjrfuyeammxsuwtx.supabase.co'
const ANON_KEY = fs.readFileSync('/home/samuel/uber-money/.env', 'utf8')
  .split('\n').find((l) => l.startsWith('VITE_SUPABASE_ANON_KEY='))!.split('=')[1]

const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8'))))
console.log('wallet:', kp.publicKey.toBase58())

const url = `${SUPABASE_URL}/functions/v1/wallet-auth`
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` }

const r1 = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ action: 'get_nonce', wallet: kp.publicKey.toBase58() }) })
console.log('nonce status:', r1.status)
const { nonce, message } = await r1.json()
console.log('nonce:', nonce, '| message:', message)

const sig = nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey)
const signature = bs58.encode(sig)
console.log('signature (b58):', signature.slice(0, 20), '…')

const r2 = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ action: 'verify', wallet: kp.publicKey.toBase58(), nonce, signature }) })
console.log('verify status:', r2.status)
console.log('verify body:', await r2.text())
