/**
 * smoke-admin-disburse.ts — testa o MOCK CCIP receiver (admin_disburse) on-chain devnet.
 *
 * DR-003 D1: admin_disburse tem assinatura compatível com Any2SolanaMessage.
 * No demo, é chamada pelo admin (não pelo router CCIP). Aparece como tx separada
 * no Solana Explorer pro Solange ver os 2 paths (release_loan vs admin_disburse).
 *
 * Rodar: npx tsx scripts/smoke-admin-disburse.ts
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
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token'
import { createHash } from 'node:crypto'
import fs from 'node:fs'

const PROGRAM_ID = new PublicKey('6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N')
const USDC_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const RPC = 'https://api.devnet.solana.com'
const KEYPAIR_PATH = `${process.env.HOME}/.config/solana/id.json`

// Sepolia chain selector — usado pelo CCIP real pra identificar origem da mensagem
const SEPOLIA_CHAIN_SELECTOR = 16015286601757825753n

function disc(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}
function u64LE(n: bigint): Buffer {
  const b = Buffer.alloc(8); b.writeBigUInt64LE(n, 0); return b
}
function u16LE(n: number): Buffer {
  const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b
}

async function fetchVaultTokenAccount(conn: Connection, vault: PublicKey): Promise<PublicKey> {
  const acc = await conn.getAccountInfo(vault)
  if (!acc) throw new Error('Vault not found')
  return new PublicKey(acc.data.subarray(8 + 64, 8 + 96))
}

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'))))
  console.log('Admin              :', admin.publicKey.toBase58())

  const borrower = Keypair.generate()
  console.log('Borrower (test)    :', borrower.publicKey.toBase58())

  const [vault] = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)
  const vaultTokenAccount = await fetchVaultTokenAccount(conn, vault)
  console.log('Vault              :', vault.toBase58())

  // cpf_hash distinto do smoke anterior (pra criar PDA novo)
  const cpfHash = createHash('sha256').update('22233344455-ccip-mock-pepper').digest()
  const [loanPda] = PublicKey.findProgramAddressSync([Buffer.from('loan'), cpfHash], PROGRAM_ID)
  console.log('Loan PDA           :', loanPda.toBase58())

  const borrowerAta = await getAssociatedTokenAddress(USDC_DEVNET, borrower.publicKey)

  const data = Buffer.concat([
    disc('admin_disburse'),
    cpfHash,
    u64LE(1_000_000n),                    // 1 USDC
    u16LE(720),                           // score
    u64LE(SEPOLIA_CHAIN_SELECTOR),        // source_chain_selector (Sepolia)
  ])

  const tx = new Transaction()
    .add(createAssociatedTokenAccountIdempotentInstruction(
      admin.publicKey, borrowerAta, borrower.publicKey, USDC_DEVNET,
    ))
    .add(new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: borrower.publicKey, isSigner: false, isWritable: false },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
        { pubkey: borrowerAta, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    }))

  tx.feePayer = admin.publicKey
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx.sign(admin)

  console.log('\nEnviando admin_disburse (MOCK CCIP receiver, source_chain_selector=Sepolia)…')
  const sig = await conn.sendRawTransaction(tx.serialize())
  await conn.confirmTransaction(sig, 'confirmed')
  console.log('✓ Tx confirmada:', sig)
  console.log(`  https://explorer.solana.com/tx/${sig}?cluster=devnet`)

  const bal = await conn.getTokenAccountBalance(borrowerAta)
  const vaultBal = await conn.getTokenAccountBalance(vaultTokenAccount)
  console.log('\nBorrower USDC      :', bal.value.uiAmount)
  console.log('Vault USDC         :', vaultBal.value.uiAmount)
  console.log('\nEvent emitted      : LoanDisbursedViaCcip { source_chain_selector:', SEPOLIA_CHAIN_SELECTOR.toString(), '}')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
