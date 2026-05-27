/**
 * init-vault-raw.ts — inicializa o vault PDA via raw tx (sem IDL).
 *
 * Necessário porque o IDL build falhou (proc-macro2/nightly mismatch — DR-003).
 * Reproduz a chamada `initialize_vault()` via web3.js + spl-token diretamente.
 *
 * Rodar:
 *   npx tsx scripts/init-vault-raw.ts
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { createHash } from 'node:crypto'
import fs from 'node:fs'

const PROGRAM_ID = new PublicKey('6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N')
const USDC_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
const KEYPAIR_PATH = process.env.WALLET_PATH ?? `${process.env.HOME}/.config/solana/id.json`

function methodDiscriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().slice(0, 8)
}

async function main() {
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8')))
  const authority = Keypair.fromSecretKey(secret)
  console.log('Authority :', authority.publicKey.toBase58())

  const conn = new Connection(RPC, 'confirmed')
  const balance = await conn.getBalance(authority.publicKey)
  console.log('SOL balance:', balance / 1e9)
  if (balance < 0.05e9) {
    console.log('⚠ saldo baixo (precisa ≥ 0.05 SOL)')
    process.exit(1)
  }

  const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID,
  )
  const [vaultTokenPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault_token'), vaultPda.toBuffer()],
    PROGRAM_ID,
  )
  console.log('Vault PDA          :', vaultPda.toBase58(), `(bump ${vaultBump})`)
  console.log('Vault Token Account:', vaultTokenPda.toBase58())

  const existing = await conn.getAccountInfo(vaultPda)
  if (existing) {
    console.log('✓ vault já inicializado')
    process.exit(0)
  }

  console.log('Inicializando vault…')
  const disc = methodDiscriminator('initialize_vault')

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: USDC_DEVNET, isSigner: false, isWritable: false },
      { pubkey: vaultTokenPda, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: disc,
  })

  const tx = new Transaction().add(ix)
  tx.feePayer = authority.publicKey
  const { blockhash } = await conn.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.sign(authority)

  const sig = await conn.sendRawTransaction(tx.serialize())
  console.log('Tx enviada:', sig)
  await conn.confirmTransaction(sig, 'confirmed')
  console.log('✓ vault inicializado')
  console.log(`  https://explorer.solana.com/tx/${sig}?cluster=devnet`)
  console.log('')
  console.log('Próximo passo: pre-fund o vault com USDC devnet')
  console.log(`  Faucet: https://spl-token-faucet.com/?token-name=USDC-Dev (cola ${vaultTokenPda.toBase58()})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
