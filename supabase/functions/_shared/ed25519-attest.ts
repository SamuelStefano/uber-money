import nacl from 'https://esm.sh/tweetnacl@1.0.3'
import { sha256Concat, bufToHex, bufToBase58, hexToBuf, base58Decode } from './crypto.ts'

const LOAN_ATTEST_PREFIX = new TextEncoder().encode('LOAN_V01')

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
 * Message layout (90 bytes): "LOAN_V01"(8) || cpfHash(32) || borrower(32) || amountLE(8) || scoreLE(2) || expiresAtLE(8).
 * The borrower pubkey is signed so a leaked attestation cannot be redeemed by a different wallet.
 */
export async function buildAttestation(opts: BuildAttestationOpts): Promise<AttestationPayload> {
  const cpfDigits = opts.cpf.replace(/\D/g, '')
  if (cpfDigits.length !== 11) throw new Error('cpf must be 11 digits')
  const pepper = hexToBuf(opts.pepperHex)
  const cpfHash = await sha256Concat(new TextEncoder().encode(cpfDigits), pepper)

  const borrowerBytes = base58Decode(opts.borrowerWallet)
  if (borrowerBytes.length !== 32) throw new Error('borrowerWallet must decode to 32 bytes')

  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECS
  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + ttl)

  const message = new Uint8Array(90)
  message.set(LOAN_ATTEST_PREFIX, 0)
  message.set(cpfHash, 8)
  message.set(borrowerBytes, 40)
  message.set(u64LE(opts.amountUSDC), 72)
  message.set(u16LE(opts.score), 80)
  message.set(i64LE(expiresAt), 82)

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
