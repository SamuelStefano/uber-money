import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
  TransactionInstruction, Ed25519Program, SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID, getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token'
import { createHash } from 'node:crypto'
import nacl from 'tweetnacl'
import fs from 'node:fs'

const PROGRAM_ID = new PublicKey('6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N')
const USDC_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const SOL_USD_FEED_DEVNET = new PublicKey('HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6')
const CHAINLINK_PROGRAM = new PublicKey('HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny')
const RPC = 'https://api.devnet.solana.com'
const KEYPAIR_PATH = `${process.env.HOME}/.config/solana/id.json`

function disc(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}
function u64LE(n: bigint): Buffer { const b = Buffer.alloc(8); b.writeBigUInt64LE(n, 0); return b }
function u16LE(n: number): Buffer { const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b }
function i64LE(n: bigint): Buffer { const b = Buffer.alloc(8); b.writeBigInt64LE(n, 0); return b }

async function fetchVaultTokenAccount(conn: Connection, vault: PublicKey): Promise<PublicKey> {
  const acc = await conn.getAccountInfo(vault)
  if (!acc) throw new Error('Vault not found')
  return new PublicKey(acc.data.subarray(8 + 64, 8 + 96))
}
async function bal(conn: Connection, ata: PublicKey): Promise<bigint> {
  try { return BigInt((await conn.getTokenAccountBalance(ata)).value.amount) } catch { return 0n }
}

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'))))
  const borrower = Keypair.generate()
  console.log('Admin (oracle):', admin.publicKey.toBase58())
  console.log('Borrower:', borrower.publicKey.toBase58())

  console.log('\n[1] Fundando borrower com 0.05 SOL…')
  const fundTx = new Transaction().add(SystemProgram.transfer({
    fromPubkey: admin.publicKey, toPubkey: borrower.publicKey, lamports: 50_000_000,
  }))
  fundTx.feePayer = admin.publicKey
  fundTx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  fundTx.sign(admin)
  await conn.confirmTransaction(await conn.sendRawTransaction(fundTx.serialize()), 'confirmed')

  const [vault] = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)
  const vaultTokenAccount = await fetchVaultTokenAccount(conn, vault)
  const cpfHash = createHash('sha256').update('99988877766-smoke-cashout-' + Date.now()).digest()
  const [loanPda] = PublicKey.findProgramAddressSync([Buffer.from('loan'), cpfHash], PROGRAM_ID)
  const borrowerAta = await getAssociatedTokenAddress(USDC_DEVNET, borrower.publicKey)
  console.log('  Vault token account:', vaultTokenAccount.toBase58())
  console.log('  Loan PDA:', loanPda.toBase58())

  const amount = 20_000n // 0.02 USDC
  const score = 720
  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300)
  const releaseMessage = Buffer.concat([cpfHash, u64LE(amount), u16LE(score), i64LE(expiresAt)])
  const releaseSig = nacl.sign.detached(releaseMessage, admin.secretKey)

  const vaultBefore = await bal(conn, vaultTokenAccount)
  console.log('\n[2] tx 1: borrower_request_loan (vault → borrower)…')
  const releaseEd25519 = Ed25519Program.createInstructionWithPublicKey({
    publicKey: admin.publicKey.toBytes(), message: releaseMessage, signature: releaseSig,
  })
  const releaseData = Buffer.concat([disc('borrower_request_loan'), cpfHash, u64LE(amount), u16LE(score), i64LE(expiresAt)])
  const releaseIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: admin.publicKey, isSigner: false, isWritable: false },
      { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
      { pubkey: loanPda, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: borrowerAta, isSigner: false, isWritable: true },
      { pubkey: SOL_USD_FEED_DEVNET, isSigner: false, isWritable: false },
      { pubkey: CHAINLINK_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: releaseData,
  })
  const ataIx = createAssociatedTokenAccountIdempotentInstruction(
    borrower.publicKey, borrowerAta, borrower.publicKey, USDC_DEVNET,
  )
  const tx1 = new Transaction().add(releaseEd25519).add(ataIx).add(releaseIx)
  tx1.feePayer = borrower.publicKey
  tx1.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx1.sign(borrower)
  await conn.confirmTransaction(await conn.sendRawTransaction(tx1.serialize()), 'confirmed')
  const borrowerAfterRelease = await bal(conn, borrowerAta)
  console.log('  ✓ borrower ATA balance pós-release:', borrowerAfterRelease, '(esperado >=', amount, ')')
  if (borrowerAfterRelease < amount) throw new Error('Borrower did not receive USDC')

  console.log('\n[3] tx 2: cash_out (borrower → vault, swap-back)…')
  const cashOutData = Buffer.concat([disc('cash_out'), cpfHash, u64LE(amount)])
  const cashOutIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: false },
      { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
      { pubkey: loanPda, isSigner: false, isWritable: false },
      { pubkey: borrowerAta, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: cashOutData,
  })
  const tx2 = new Transaction().add(cashOutIx)
  tx2.feePayer = borrower.publicKey
  tx2.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx2.sign(borrower)
  const sig2 = await conn.sendRawTransaction(tx2.serialize())
  await conn.confirmTransaction(sig2, 'confirmed')
  console.log('  ✓ cash_out tx:', sig2)
  console.log(`  Explorer: https://explorer.solana.com/tx/${sig2}?cluster=devnet`)

  const borrowerFinal = await bal(conn, borrowerAta)
  const vaultFinal = await bal(conn, vaultTokenAccount)
  console.log('\n[4] Resultado:')
  console.log('  borrower ATA:', borrowerAfterRelease, '→', borrowerFinal)
  console.log('  vault       :', vaultBefore, '→', vaultFinal)
  if (borrowerFinal !== borrowerAfterRelease - amount) throw new Error('Borrower balance delta wrong')
  if (vaultFinal < vaultBefore) throw new Error('Vault did not recover USDC')
  console.log('  ✅ Swap-back confirmado on-chain — double-spend morto.')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
