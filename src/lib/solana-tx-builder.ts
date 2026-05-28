// solana-tx-builder.ts — DR-004 F+ on-chain flow.
//
// Constrói tx onde MOTORISTA assina direto pro contrato Anchor.
// Layout da tx (ordem importa):
//   [0] Ed25519 verify program ix — verifica attestation do oracle (admin)
//   [1] createAssociatedTokenAccountIdempotent — cria ATA USDC do motorista se não tem
//   [2] borrower_request_loan ix — programa Anchor lê Ed25519 + Chainlink Data Feed + transfere USDC
//
// Programa valida on-chain:
//   - Ed25519 attestation foi assinada pelo ORACLE_PUBKEY com payload correto
//   - Chainlink SOL/USD acima do threshold (circuit breaker)
//   - Borrower é Signer (paga rent ATA + rent Loan PDA)
import {
  Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction,
  Ed25519Program, SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID, getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token'
import { createHash } from 'node:crypto'  // ignored in browser bundle; we use SubtleCrypto

// Constants (mesmo do lib.rs)
export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || '6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N'
)
export const USDC_DEVNET = new PublicKey(
  import.meta.env.VITE_USDC_MINT_DEVNET || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
)
// Chainlink Store program (não confundir com OCR cjg3oHmg...)
export const CHAINLINK_PROGRAM = new PublicKey('HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny')
export const SOL_USD_FEED_DEVNET = new PublicKey('HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6')

const LOAN_SEED = new TextEncoder().encode('loan')
const VAULT_SEED = new TextEncoder().encode('vault')

async function methodDiscriminator(name: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`global:${name}`))
  return new Uint8Array(buf).slice(0, 8)
}

function u64LE(n: bigint): Uint8Array {
  const buf = new Uint8Array(8)
  new DataView(buf.buffer).setBigUint64(0, n, true)
  return buf
}
function u16LE(n: number): Uint8Array {
  const buf = new Uint8Array(2)
  new DataView(buf.buffer).setUint16(0, n, true)
  return buf
}
function i64LE(n: bigint): Uint8Array {
  const buf = new Uint8Array(8)
  new DataView(buf.buffer).setBigInt64(0, n, true)
  return buf
}

async function fetchVaultTokenAccount(conn: Connection, vault: PublicKey): Promise<PublicKey> {
  const acc = await conn.getAccountInfo(vault)
  if (!acc) throw new Error('Vault account not found on-chain')
  return new PublicKey(acc.data.subarray(8 + 64, 8 + 96))
}

export interface SignScorePayload {
  loanId: string
  cpfHashBytes: number[]
  amountUSDC: string
  score: number
  expiresAt: string
  oraclePubkeyBytes: number[]
  signature: number[]
  messageBytes: number[]
  borrowerWallet: string
}

export interface BuildBorrowerRequestLoanArgs {
  connection: Connection
  payload: SignScorePayload
  borrower: PublicKey
}

/**
 * Constrói tx pronta pra Phantom assinar.
 * Caller faz: wallet.sendTransaction(tx, connection)
 */
export async function buildBorrowerRequestLoanTx({
  connection, payload, borrower,
}: BuildBorrowerRequestLoanArgs): Promise<Transaction> {
  const cpfHash = new Uint8Array(payload.cpfHashBytes)
  const amount = BigInt(payload.amountUSDC)
  const score = payload.score
  const expiresAt = BigInt(payload.expiresAt)
  const oraclePubkey = new Uint8Array(payload.oraclePubkeyBytes)
  const signature = new Uint8Array(payload.signature)
  const message = new Uint8Array(payload.messageBytes)

  // PDAs
  const [vault] = PublicKey.findProgramAddressSync([VAULT_SEED], PROGRAM_ID)
  const [loanPda] = PublicKey.findProgramAddressSync([LOAN_SEED, cpfHash], PROGRAM_ID)
  const vaultTokenAccount = await fetchVaultTokenAccount(connection, vault)
  const borrowerAta = await getAssociatedTokenAddress(USDC_DEVNET, borrower)

  // Ed25519 verify ix (sysvar program)
  const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
    publicKey: oraclePubkey,
    message,
    signature,
  })

  // ATA idempotent — borrower paga rent
  const ataIx = createAssociatedTokenAccountIdempotentInstruction(
    borrower,         // payer
    borrowerAta,
    borrower,
    USDC_DEVNET,
  )

  // borrower_request_loan ix
  const disc = await methodDiscriminator('borrower_request_loan')
  const data = new Uint8Array(disc.length + 32 + 8 + 2 + 8)
  data.set(disc, 0)
  data.set(cpfHash, 8)
  data.set(u64LE(amount), 40)
  data.set(u16LE(score), 48)
  data.set(i64LE(expiresAt), 50)

  // Authority do vault (lido do vault state — hardcoded pq mudar exige redeploy)
  // Admin keypair = 5y4M6HGghXAj5TYupFncUWXMEN7LKjDMDvMLiPsodUCa
  const authority = new PublicKey('5y4M6HGghXAj5TYupFncUWXMEN7LKjDMDvMLiPsodUCa')

  const borrowerIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: borrower, isSigner: true, isWritable: true },
      { pubkey: loanPda, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: borrowerAta, isSigner: false, isWritable: true },
      { pubkey: SOL_USD_FEED_DEVNET, isSigner: false, isWritable: false },
      { pubkey: CHAINLINK_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })

  const tx = new Transaction().add(ed25519Ix).add(ataIx).add(borrowerIx)
  tx.feePayer = borrower
  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  return tx
}
