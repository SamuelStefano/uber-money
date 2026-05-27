// DR-003 D7: Anchor signer server-side (raw tx, sem IDL).
// Constrói + assina + envia tx pra invocar release_loan / admin_disburse.
//
// Sem dependência de @coral-xyz/anchor (IDL build falhou no toolchain).
// Discriminator computado on-the-fly via sha256("global:<method>").
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from 'https://esm.sh/@solana/web3.js@1.95.3'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from 'https://esm.sh/@solana/spl-token@0.4.8'

const PROGRAM_ID = new PublicKey(Deno.env.get('PROGRAM_ID') ?? '6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N')
const USDC_MINT = new PublicKey(Deno.env.get('USDC_MINT_DEVNET') ?? '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const RPC_URL = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.devnet.solana.com'

const LOAN_SEED = new TextEncoder().encode('loan')
const VAULT_SEED = new TextEncoder().encode('vault')

export async function methodDiscriminator(name: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`global:${name}`))
  return new Uint8Array(buf).slice(0, 8)
}

export function loadAdminKeypair(): Keypair {
  const raw = Deno.env.get('SOLANA_ADMIN_KEYPAIR_JSON')
  if (!raw) throw new Error('SOLANA_ADMIN_KEYPAIR_JSON env missing')
  const bytes = Uint8Array.from(JSON.parse(raw))
  return Keypair.fromSecretKey(bytes)
}

export function connection(): Connection {
  return new Connection(RPC_URL, 'confirmed')
}

export function deriveLoanPda(cpfHash: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([LOAN_SEED, cpfHash], PROGRAM_ID)
}

export function deriveVaultPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([VAULT_SEED], PROGRAM_ID)
}

function u64ToBytesLE(n: bigint): Uint8Array {
  const buf = new Uint8Array(8)
  new DataView(buf.buffer).setBigUint64(0, n, true)
  return buf
}

function u16ToBytesLE(n: number): Uint8Array {
  const buf = new Uint8Array(2)
  new DataView(buf.buffer).setUint16(0, n, true)
  return buf
}

interface VaultState {
  authority: PublicKey
  usdcMint: PublicKey
  tokenAccount: PublicKey
  totalReleased: bigint
  bump: number
}

async function fetchVaultState(conn: Connection, vault: PublicKey): Promise<VaultState> {
  const acc = await conn.getAccountInfo(vault)
  if (!acc) throw new Error(`Vault account not found at ${vault.toBase58()}`)
  // Anchor account layout: 8B discriminator + [authority 32, usdc_mint 32, token_account 32, total_released 8, bump 1]
  const data = acc.data.slice(8)
  return {
    authority: new PublicKey(data.slice(0, 32)),
    usdcMint: new PublicKey(data.slice(32, 64)),
    tokenAccount: new PublicKey(data.slice(64, 96)),
    totalReleased: new DataView(data.buffer, data.byteOffset + 96, 8).getBigUint64(0, true),
    bump: data[104],
  }
}

export interface ReleaseLoanArgs {
  cpfHash: Uint8Array
  amount: bigint
  score: number
  borrower: PublicKey
}

/// Calls `release_loan(cpf_hash, amount, score)` via raw tx + admin signature.
/// Returns tx signature on success.
export async function releaseLoan(args: ReleaseLoanArgs): Promise<string> {
  if (args.cpfHash.length !== 32) throw new Error('cpfHash must be 32 bytes')

  const conn = connection()
  const admin = loadAdminKeypair()
  const [vault] = deriveVaultPda()
  const [loan] = deriveLoanPda(args.cpfHash)
  const vaultState = await fetchVaultState(conn, vault)
  const borrowerAta = await getAssociatedTokenAddress(USDC_MINT, args.borrower)

  // CRIT-3 fix: criar ATA do borrower se não existir (motorista novo nunca recebeu USDC).
  // Admin paga o rent (~0.002 SOL). Verifica antes pra evitar `AccountAlreadyInUse` em re-tries.
  const ataInfo = await conn.getAccountInfo(borrowerAta)
  const preIxs = ataInfo
    ? []
    : [createAssociatedTokenAccountInstruction(admin.publicKey, borrowerAta, args.borrower, USDC_MINT)]

  const disc = await methodDiscriminator('release_loan')
  const data = new Uint8Array(disc.length + 32 + 8 + 2)
  data.set(disc, 0)
  data.set(args.cpfHash, 8)
  data.set(u64ToBytesLE(args.amount), 40)
  data.set(u16ToBytesLE(args.score), 48)

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: args.borrower, isSigner: false, isWritable: false },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: vaultState.tokenAccount, isSigner: false, isWritable: true },
      { pubkey: borrowerAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })

  const tx = new Transaction()
  for (const pre of preIxs) tx.add(pre)
  tx.add(ix)
  tx.feePayer = admin.publicKey
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx.sign(admin)

  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  await conn.confirmTransaction(sig, 'confirmed')
  return sig
}
