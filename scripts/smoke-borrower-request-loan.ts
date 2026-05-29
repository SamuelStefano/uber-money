/**
 * smoke-borrower-request-loan.ts — DR-004 smoke completo.
 *
 * Simula o fluxo F+ direto on-chain (sem edge nem front):
 *   1. Cria borrower keypair fake + funda 0.05 SOL pra rent/fees
 *   2. Cria ATA USDC pro borrower (idempotent — admin paga rent)
 *   3. Admin assina Ed25519 attestation off-chain
 *   4. Monta tx com Ed25519Program verify ix + borrower_request_loan ix
 *   5. Borrower assina + envia
 *   6. Valida USDC chegou + Chainlink feed foi lido
 */
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
// Chainlink Store program (não confundir com OCR program cjg3oHmg...)
const CHAINLINK_PROGRAM = new PublicKey('HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny')
const RPC = 'https://api.devnet.solana.com'
const KEYPAIR_PATH = `${process.env.HOME}/.config/solana/id.json`

function disc(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}
function u64LE(n: bigint): Buffer {
  const b = Buffer.alloc(8); b.writeBigUInt64LE(n, 0); return b
}
function u16LE(n: number): Buffer {
  const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b
}
function i64LE(n: bigint): Buffer {
  const b = Buffer.alloc(8); b.writeBigInt64LE(n, 0); return b
}

async function fetchVaultTokenAccount(conn: Connection, vault: PublicKey): Promise<PublicKey> {
  const acc = await conn.getAccountInfo(vault)
  if (!acc) throw new Error('Vault not found')
  return new PublicKey(acc.data.subarray(8 + 64, 8 + 96))
}

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'))))
  console.log('Admin (oracle):', admin.publicKey.toBase58())

  const borrower = Keypair.generate()
  console.log('Borrower:', borrower.publicKey.toBase58())

  console.log('\n[1] Fundando borrower com 0.05 SOL…')
  const fundTx = new Transaction().add(SystemProgram.transfer({
    fromPubkey: admin.publicKey,
    toPubkey: borrower.publicKey,
    lamports: 50_000_000,
  }))
  fundTx.feePayer = admin.publicKey
  fundTx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  fundTx.sign(admin)
  const fundSig = await conn.sendRawTransaction(fundTx.serialize())
  await conn.confirmTransaction(fundSig, 'confirmed')
  console.log('  ✓ Fund tx:', fundSig)

  const [vault] = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)
  const vaultTokenAccount = await fetchVaultTokenAccount(conn, vault)
  const cpfHash = createHash('sha256').update('99988877766-borrower-test-' + Date.now()).digest()
  const [loanPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('loan'), cpfHash],
    PROGRAM_ID,
  )
  console.log('\n[2] PDAs derivados:')
  console.log('  Vault:', vault.toBase58())
  console.log('  Loan PDA:', loanPda.toBase58())

  const borrowerAta = await getAssociatedTokenAddress(USDC_DEVNET, borrower.publicKey)
  console.log('  Borrower ATA:', borrowerAta.toBase58())

  const amount = 1_000_000n  // 1 USDC
  const score = 720
  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300)
  const message = Buffer.concat([
    cpfHash,
    u64LE(amount),
    u16LE(score),
    i64LE(expiresAt),
  ])
  console.log('\n[3] Message (50 bytes):', message.toString('hex'))

  const signature = nacl.sign.detached(message, admin.secretKey)
  console.log('  Signature (64 bytes):', Buffer.from(signature).toString('hex').slice(0, 32) + '…')

  const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
    publicKey: admin.publicKey.toBytes(),
    message,
    signature: signature,
  })

  const ixData = Buffer.concat([
    disc('borrower_request_loan'),
    cpfHash,
    u64LE(amount),
    u16LE(score),
    i64LE(expiresAt),
  ])

  const borrowerIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: admin.publicKey, isSigner: false, isWritable: false }, // authority check
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
    data: ixData,
  })

  const ataIx = createAssociatedTokenAccountIdempotentInstruction(
    borrower.publicKey,  // payer (borrower paga rent)
    borrowerAta,
    borrower.publicKey,
    USDC_DEVNET,
  )

  const tx = new Transaction().add(ed25519Ix).add(ataIx).add(borrowerIx)
  tx.feePayer = borrower.publicKey
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx.sign(borrower)

  console.log('\n[4] Enviando tx (borrower assina)…')
  const sig = await conn.sendRawTransaction(tx.serialize())
  console.log('  Tx sig:', sig)
  await conn.confirmTransaction(sig, 'confirmed')
  console.log('  ✓ Confirmada!')
  console.log(`  Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`)

  const borrowerBal = await conn.getTokenAccountBalance(borrowerAta).catch(() => null)
  const vaultBal = await conn.getTokenAccountBalance(vaultTokenAccount)
  console.log('\n[5] Resultado:')
  console.log('  Borrower USDC:', borrowerBal?.value.uiAmount)
  console.log('  Vault USDC   :', vaultBal.value.uiAmount)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
