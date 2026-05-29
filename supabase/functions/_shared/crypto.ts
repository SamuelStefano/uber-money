export async function sha256Concat(...parts: Uint8Array[]): Promise<Uint8Array> {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const buf = new Uint8Array(total)
  let o = 0
  for (const p of parts) { buf.set(p, o); o += p.length }
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buf))
}

export function bufToHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function hexToBuf(hex: string): Uint8Array {
  const clean = hex.startsWith('\\x') ? hex.slice(2) : hex
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}

export function bufToBase58(buf: Uint8Array): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const BASE = 58n
  let num = 0n
  for (const b of buf) num = num * 256n + BigInt(b)
  let out = ''
  while (num > 0n) { out = ALPHABET[Number(num % BASE)] + out; num /= BASE }
  for (const b of buf) { if (b === 0) out = '1' + out; else break }
  return out
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function base58Decode(s: string): Uint8Array {
  if (s.length === 0) return new Uint8Array(0)
  const bytes = [0]
  for (const c of s) {
    const v = BASE58_ALPHABET.indexOf(c)
    if (v < 0) throw new Error('Invalid base58 char: ' + c)
    let carry = v
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58
      bytes[i] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8 }
  }
  for (const c of s) { if (c !== '1') break; bytes.push(0) }
  return new Uint8Array(bytes.reverse())
}
