import nacl from 'https://esm.sh/tweetnacl@1.0.3'
import { sha256Concat, bufToHex, bufToBase58, hexToBuf } from './crypto.ts'

const ADMIN_KEYPAIR_JSON = Deno.env.get('SOLANA_ADMIN_KEYPAIR_JSON') ?? ''
const DEFAULT_TTL_SECS = 300

export interface AttestationPayload {
  requestId: string
  cpfHashHex: string
  cpfHashBytes: number[]
  amountUSDC: string
  score: number
  expiresAt: string
  oraclePubkeyBase58: string
  oraclePubkeyBytes: number[]
  signature: number[]
  messageBytes: number[]
  borrowerWallet: string
}

export interface BuildAttestationOpts {
  cpf: string
  pepperHex: string
  amountUSDC: bigint
  score: number
  borrowerWallet: string
  requestId: string
  ttlSeconds?: number
}

function loadAdminEd25519Keypair(): nacl.SignKeyPair {
  if (!ADMIN_KEYPAIR_JSON) throw new Error('SOLANA_ADMIN_KEYPAIR_JSON env missing')
  const bytes = new Uint8Array(JSON.parse(ADMIN_KEYPAIR_JSON))
  return nacl.sign.keyPair.fromSecretKey(bytes)
}

function u64LE(n: bigint): Uint8Array {
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigUint64(0, n, true)
  return b
}

function u16LE(n: number): Uint8Array {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}

function i64LE(n: bigint): Uint8Array {
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigInt64(0, n, true)
  return b
}

/**
 * Builds an Ed25519-signed attestation for the on-chain `borrower_request_loan` ix.
 * Message layout (50 bytes): cpfHash(32) || amountLE(8) || scoreLE(2) || expiresAtLE(8).
 */
export async function buildAttestation(opts: BuildAttestationOpts): Promise<AttestationPayload> {
  const cpfDigits = opts.cpf.replace(/\D/g, '')
  if (cpfDigits.length !== 11) throw new Error('cpf must be 11 digits')
  const pepper = hexToBuf(opts.pepperHex)
  const cpfHash = await sha256Concat(new TextEncoder().encode(cpfDigits), pepper)

  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECS
  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + ttl)

  const message = new Uint8Array(50)
  message.set(cpfHash, 0)
  message.set(u64LE(opts.amountUSDC), 32)
  message.set(u16LE(opts.score), 40)
  message.set(i64LE(expiresAt), 42)

  const keypair = loadAdminEd25519Keypair()
  const signature = nacl.sign.detached(message, keypair.secretKey)

  return {
    requestId: opts.requestId,
    cpfHashHex: bufToHex(cpfHash),
    cpfHashBytes: Array.from(cpfHash),
    amountUSDC: opts.amountUSDC.toString(),
    score: opts.score,
    expiresAt: expiresAt.toString(),
    oraclePubkeyBase58: bufToBase58(keypair.publicKey),
    oraclePubkeyBytes: Array.from(keypair.publicKey),
    signature: Array.from(signature),
    messageBytes: Array.from(message),
    borrowerWallet: opts.borrowerWallet,
  }
}
