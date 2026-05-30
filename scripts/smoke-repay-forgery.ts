import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
  TransactionInstruction, Ed25519Program, SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID, getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token'
import { createHash, randomBytes } from 'node:crypto'
import nacl from 'tweetnacl'
import fs from 'node:fs'

// NEGATIVE TEST: prova on-chain que o guard instruction_index == 0xFFFF mata a
// forja de attestation. Constrói um repay_loan VÁLIDO (oracle assina REPAY_V1),
// mas adultera o campo message_instruction_index da ix Ed25519 de 0xFFFF -> 0x0000.
// Com a ix Ed25519 no índice 0 da tx, 0x0000 aponta pra ela mesma => o programa
// nativo Ed25519 AINDA verifica a mesma mensagem (passa). Pré-fix o repay_loan
// teria aceitado. Pós-fix o guard rejeita: InvalidRepayAttestationLayout.

const PROGRAM_ID = new PublicKey('6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N')
const USDC_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const SOL_USD_FEED_DEVNET = new PublicKey('HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6')
const CHAINLINK_PROGRAM = new PublicKey('HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny')
const RPC = 'https://api.devnet.solana.com'
const KEYPAIR_PATH = `${process.env.HOME}/.config/solana/id.json`
const DOMAIN_REPAY = Buffer.from('REPAY_V1', 'utf8')

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

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'))))
  const borrower = Keypair.generate()
  console.log('Borrower:', borrower.publicKey.toBase58())

  const fundTx = new Transaction().add(SystemProgram.transfer({
    fromPubkey: admin.publicKey, toPubkey: borrower.publicKey, lamports: 50_000_000,
  }))
  fundTx.feePayer = admin.publicKey
  fundTx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  fundTx.sign(admin)
  await conn.confirmTransaction(await conn.sendRawTransaction(fundTx.serialize()), 'confirmed')

  const [vault] = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)
  const vaultTokenAccount = await fetchVaultTokenAccount(conn, vault)
  const cpfHash = createHash('sha256').update('99988877766-forgery-' + Date.now()).digest()
  const [loanPda] = PublicKey.findProgramAddressSync([Buffer.from('loan'), cpfHash], PROGRAM_ID)
  const borrowerAta = await getAssociatedTokenAddress(USDC_DEVNET, borrower.publicKey)

  const amount = 1_000_000n
  const score = 720
  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300)
  const releaseMessage = Buffer.concat([Buffer.from('LOAN_V01'), cpfHash, borrower.publicKey.toBuffer(), u64LE(amount), u16LE(score), i64LE(expiresAt)])
  const releaseSig = nacl.sign.detached(releaseMessage, admin.secretKey)

  console.log('\n[1] borrow (setup do loan Active)…')
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
  const ataIx = createAssociatedTokenAccountIdempotentInstruction(borrower.publicKey, borrowerAta, borrower.publicKey, USDC_DEVNET)
  const tx1 = new Transaction().add(releaseEd25519).add(ataIx).add(releaseIx)
  tx1.feePayer = borrower.publicKey
  tx1.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx1.sign(borrower)
  await conn.confirmTransaction(await conn.sendRawTransaction(tx1.serialize()), 'confirmed')
  console.log('  ✓ loan Active')

  console.log('\n[2] Forja: oracle assina REPAY_V1 legítimo, mas adulteramos o layout…')
  const nonce = randomBytes(8)
  const expiresRepay = BigInt(Math.floor(Date.now() / 1000) + 300)
  const repayMessage = Buffer.concat([
    DOMAIN_REPAY, cpfHash, loanPda.toBytes(), borrower.publicKey.toBytes(),
    u64LE(amount), nonce, i64LE(expiresRepay),
  ])
  const repaySig = nacl.sign.detached(repayMessage, admin.secretKey)
  const repayEd25519 = Ed25519Program.createInstructionWithPublicKey({
    publicKey: admin.publicKey.toBytes(), message: repayMessage, signature: repaySig,
  })

  // ADULTERAÇÃO: message_instruction_index (bytes [14,15] do header) 0xFFFF -> 0x0000.
  // Com a ix Ed25519 no índice 0, 0x0000 aponta pra ela mesma => nativo passa.
  // O guard novo exige 0xFFFF, então deve reverter.
  const before = repayEd25519.data.readUInt16LE(14)
  repayEd25519.data.writeUInt16LE(0x0000, 14)
  console.log(`  msg_instruction_index: 0x${before.toString(16)} -> 0x0000 (aponta pra ix 0 = ela mesma)`)

  const repayData = Buffer.concat([disc('repay_loan'), cpfHash, u64LE(amount), nonce, i64LE(expiresRepay)])
  const repayIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
      { pubkey: loanPda, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: repayData,
  })
  const tx2 = new Transaction().add(repayEd25519).add(repayIx)
  tx2.feePayer = borrower.publicKey
  tx2.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx2.sign(borrower)

  console.log('\n[3] Simulando repay forjado p/ capturar erro exato…')
  const sim = await conn.simulateTransaction(tx2)
  const simLog = (sim.value.logs ?? []).filter((l) => /AnchorError|Error|failed/i.test(l)).join('\n')
  console.log('  sim.err:', JSON.stringify(sim.value.err))
  if (simLog) console.log('  ' + simLog.replace(/\n/g, '\n  '))

  console.log('\n[4] Enviando repay forjado — DEVE FALHAR…')
  try {
    const sig = await conn.sendRawTransaction(tx2.serialize())
    await conn.confirmTransaction(sig, 'confirmed')
    console.error('  ❌ FALHA DE SEGURANÇA: repay forjado foi ACEITO! tx:', sig)
    process.exit(1)
  } catch (e) {
    const msg = String((e as Error).message ?? e)
    const logs = (e as { logs?: string[] }).logs?.join('\n') ?? ''
    const hit = /InvalidRepayAttestationLayout|0x177d|6013/i.test(msg + logs)
    console.log('  ✓ repay forjado REJEITADO on-chain')
    if (hit) {
      console.log('  ✓ guard InvalidRepayAttestationLayout (6013) disparou')
      console.log('\n✅ Forja de attestation morta — guard 0xFFFF confirmado on-chain')
    } else {
      console.error('  ❌ rejeitado por OUTRO erro (não o guard):', msg.slice(0, 200))
      process.exit(1)
    }
  }
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
