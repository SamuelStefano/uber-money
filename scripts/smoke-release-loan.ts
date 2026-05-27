/**
 * smoke-release-loan.ts — testa release_loan on-chain devnet.
 *
 * Simula: motorista (test wallet) recebe USDC do vault.
 * Cria test wallet → ATA USDC → chama release_loan via admin.
 *
 * Rodar: npx tsx scripts/smoke-release-loan.ts
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import { createHash } from 'node:crypto'
import fs from 'node:fs'

const PROGRAM_ID = new PublicKey('6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N')
const USDC_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const RPC = 'https://api.devnet.solana.com'
const KEYPAIR_PATH = `${process.env.HOME}/.config/solana/id.json`

function methodDiscriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().slice(0, 8)
}

function u64LE(n: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(n, 0)
  return buf
}

function u16LE(n: number): Buffer {
  const buf = Buffer.alloc(2)
  buf.writeUInt16LE(n, 0)
  return buf
}

async function fetchVaultState(conn: Connection, vault: PublicKey) {
  const acc = await conn.getAccountInfo(vault)
  if (!acc) throw new Error('Vault not found')
  const data = acc.data.subarray(8)
  return {
    authority: new PublicKey(data.subarray(0, 32)),
    usdcMint: new PublicKey(data.subarray(32, 64)),
    tokenAccount: new PublicKey(data.subarray(64, 96)),
  }
}

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'))))
  console.log('Admin     :', admin.publicKey.toBase58())

  // Test borrower: deriva nova keypair, mas admin paga rent da ATA
  const borrower = Keypair.generate()
  console.log('Borrower  :', borrower.publicKey.toBase58(), '(novo keypair de teste)')

  // PDA derivations
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)
  const vaultState = await fetchVaultState(conn, vault)
  console.log('Vault     :', vault.toBase58())
  console.log('Vault ATA :', vaultState.tokenAccount.toBase58())

  // Mock cpf_hash (em prod: sha256(cpf || pepper_per_user))
  const cpfHash = createHash('sha256').update('11122233344-mock-pepper').digest()
  const [loanPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('loan'), cpfHash],
    PROGRAM_ID,
  )
  console.log('Loan PDA  :', loanPda.toBase58())

  const borrowerAta = await getAssociatedTokenAddress(USDC_DEVNET, borrower.publicKey)
  console.log('Borrower ATA:', borrowerAta.toBase58())

  // Build tx: (1) create borrower ATA + (2) release_loan
  const tx = new Transaction()
  tx.add(createAssociatedTokenAccountInstruction(
    admin.publicKey,        // payer
    borrowerAta,            // ata
    borrower.publicKey,     // owner
    USDC_DEVNET,            // mint
  ))

  const amount = 1_000_000n  // 1 USDC (6 decimals)
  const score = 720          // > SCORE_THRESHOLD (600)

  const data = Buffer.concat([
    methodDiscriminator('release_loan'),
    cpfHash,
    u64LE(amount),
    u16LE(score),
  ])

  tx.add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: borrower.publicKey, isSigner: false, isWritable: false },
      { pubkey: loanPda, isSigner: false, isWritable: true },
      { pubkey: vaultState.tokenAccount, isSigner: false, isWritable: true },
      { pubkey: borrowerAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  }))

  tx.feePayer = admin.publicKey
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx.sign(admin)

  console.log('\nEnviando tx…')
  const sig = await conn.sendRawTransaction(tx.serialize())
  console.log('Tx sig:', sig)
  await conn.confirmTransaction(sig, 'confirmed')
  console.log('✓ Confirmada!')
  console.log(`  https://explorer.solana.com/tx/${sig}?cluster=devnet`)

  // Verify outcome
  const borrowerBal = await conn.getTokenAccountBalance(borrowerAta).catch(() => null)
  console.log('\nBorrower USDC :', borrowerBal?.value.uiAmount, 'USDC')
  const vaultBal = await conn.getTokenAccountBalance(vaultState.tokenAccount)
  console.log('Vault USDC    :', vaultBal.value.uiAmount, 'USDC')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
