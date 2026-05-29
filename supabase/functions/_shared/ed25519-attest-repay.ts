import nacl from 'https://esm.sh/tweetnacl@1.0.3'
import { bufToHex, bufToBase58 } from './crypto.ts'

const ADMIN_KEYPAIR_JSON = Deno.env.get('SOLANA_ADMIN_KEYPAIR_JSON') ?? ''
const DEFAULT_TTL_SECS = 300

export interface RepayAttestationPayload {
  signatureHex: string
  messageHex: string
  expiresAt: number
  nonceHex: string
  loanPdaBase58: string
  borrowerBase58: string
  amountPaidUsdc: string
  oraclePubkeyBase58: string
}

export interface BuildRepayAttestationInput {
  cpfHash: Uint8Array
  loanPda: Uint8Array
  borrower: Uint8Array
  amountPaidUsdc: bigint
  nonce?: Uint8Array
  ttlSeconds?: number
}

const DOMAIN = new TextEncoder().encode('REPAY_V1')

function loadAdminKeypair(): nacl.SignKeyPair {
  if (!ADMIN_KEYPAIR_JSON) throw new Error('SOLANA_ADMIN_KEYPAIR_JSON env missing')
  return nacl.sign.keyPair.fromSecretKey(new Uint8Array(JSON.parse(ADMIN_KEYPAIR_JSON)))
}

function u64LE(n: bigint): Uint8Array {
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigUint64(0, n, true)
  return b
}

function i64LE(n: bigint): Uint8Array {
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigInt64(0, n, true)
  return b
}

export async function buildRepayAttestation(
  input: BuildRepayAttestationInput,
): Promise<RepayAttestationPayload> {
  if (input.cpfHash.length !== 32) throw new Error('cpfHash must be 32 bytes')
  if (input.loanPda.length !== 32) throw new Error('loanPda must be 32 bytes')
  if (input.borrower.length !== 32) throw new Error('borrower must be 32 bytes')

  const nonce = input.nonce ?? crypto.getRandomValues(new Uint8Array(8))
  if (nonce.length !== 8) throw new Error('nonce must be 8 bytes')

  const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECS
  const expiresAt = Math.floor(Date.now() / 1000) + ttl

  // layout: REPAY_V1(8) || cpf_hash(32) || loan_pda(32) || borrower(32)
  //         || amount_paid_usdc u64 LE(8) || nonce(8) || expires_at i64 LE(8) = 128 bytes
  const message = new Uint8Array(128)
  let offset = 0
  message.set(DOMAIN, offset); offset += 8
  message.set(input.cpfHash, offset); offset += 32
  message.set(input.loanPda, offset); offset += 32
  message.set(input.borrower, offset); offset += 32
  message.set(u64LE(input.amountPaidUsdc), offset); offset += 8
  message.set(nonce, offset); offset += 8
  message.set(i64LE(BigInt(expiresAt)), offset)

  const keypair = loadAdminKeypair()
  const signature = nacl.sign.detached(message, keypair.secretKey)

  return {
    signatureHex: bufToHex(signature),
    messageHex: bufToHex(message),
    expiresAt,
    nonceHex: bufToHex(nonce),
    loanPdaBase58: bufToBase58(input.loanPda),
    borrowerBase58: bufToBase58(input.borrower),
    amountPaidUsdc: input.amountPaidUsdc.toString(),
    oraclePubkeyBase58: bufToBase58(keypair.publicKey),
  }
}
