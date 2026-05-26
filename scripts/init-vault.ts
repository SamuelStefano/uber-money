/**
 * init-vault.ts — inicializa o vault PDA na devnet e (opcional) pré-funda com USDC devnet.
 *
 * Rodar:
 *   bun run scripts/init-vault.ts            # ou ts-node / tsx
 *   # ou: anchor run init-vault
 *
 * Requisitos:
 *   - PROGRAM_ID em src/lib.rs.declare_id! deployado em devnet
 *   - ~/.config/solana/id.json com SOL devnet
 *   - USDC devnet mint = 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
 */
import { AnchorProvider, BN, Program, Wallet, web3 } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from '@solana/spl-token'
import fs from 'node:fs'
import path from 'node:path'

const PROGRAM_ID = new PublicKey('6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N')
const USDC_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const RPC = 'https://api.devnet.solana.com'

const IDL_PATH = path.resolve(__dirname, '../target/idl/uber_money.json')
const KEYPAIR_PATH = process.env.WALLET_PATH ?? `${process.env.HOME}/.config/solana/id.json`

async function main() {
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'))
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8')))
  const authority = Keypair.fromSecretKey(secret)
  console.log('Authority :', authority.publicKey.toBase58())

  const conn = new Connection(RPC, 'confirmed')
  const balance = await conn.getBalance(authority.publicKey)
  console.log('SOL balance:', balance / 1e9)
  if (balance < 0.5e9) {
    console.log('⚠ saldo baixo — rodar: solana airdrop 5')
    process.exit(1)
  }

  const provider = new AnchorProvider(conn, new Wallet(authority), { commitment: 'confirmed' })
  const program = new Program(idl, PROGRAM_ID, provider)

  const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)
  const [vaultTokenPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault_token'), vaultPda.toBuffer()],
    PROGRAM_ID,
  )
  console.log('Vault PDA          :', vaultPda.toBase58())
  console.log('Vault Token Account:', vaultTokenPda.toBase58())

  const existing = await conn.getAccountInfo(vaultPda)
  if (existing) {
    console.log('✓ vault já inicializado')
  } else {
    console.log('Inicializando vault…')
    const sig = await program.methods
      .initializeVault()
      .accounts({
        authority: authority.publicKey,
        vault: vaultPda,
        usdcMint: USDC_DEVNET,
        vaultTokenAccount: vaultTokenPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc()
    console.log('✓ vault inicializado tx:', sig)
    console.log(`  https://explorer.solana.com/tx/${sig}?cluster=devnet`)
  }

  console.log('\nPróximo passo: pre-fund o vault com USDC devnet.')
  console.log(`  Faucet: https://spl-token-faucet.com/?token-name=USDC-Dev`)
  console.log(`  spl-token transfer ${USDC_DEVNET.toBase58()} 100 ${vaultTokenPda.toBase58()} --allow-unfunded-recipient`)
}

main().catch((e) => { console.error(e); process.exit(1) })
