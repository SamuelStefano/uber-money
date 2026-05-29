//! Uber Money — Anchor program (Hackanation 2026, devnet only).
//!
//! ⚠️  HACKATHON DEMO — DO NOT DEPLOY TO MAINNET WITHOUT:
//!     - Multisig authority (Squads) replacing single-key oracle
//!     - Per-borrower session keys (currently borrower direto)
//!     - Audit do helper Ed25519 (verify_ed25519_attestation)
//!     - Confirmar feed Chainlink mainnet vs devnet (atual: USDC/USD devnet)
//!
//! DR-004 (28/05/2026): refactor F+ — motorista chama contrato direto.
//!   - borrower é Signer da tx (não admin)
//!   - score validado via Ed25519 attestation pre-instruction (oracle off-chain)
//!   - Chainlink Data Feed USDC/USD lido on-chain como circuit breaker
//!     (se peg < 0.98, halt empréstimo — propósito narrativo claro pro pitch)
//!
//! Legacy `release_loan` mantido como stub deprecated (front antigo precisaria
//! ser migrado, mas feature flag VITE_ONCHAIN_FLOW protege).

use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::{
    load_instruction_at_checked, ID as INSTRUCTIONS_SYSVAR_ID,
};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N");

const SCORE_THRESHOLD: u16 = 600;
// DR-002 D11: on-chain cap = $10 USDC (defense-in-depth). Demo vault pre-fund = $20.
const MAX_AMOUNT_USDC: u64 = 10_000_000;
const VAULT_SEED: &[u8] = b"vault";
const LOAN_SEED: &[u8] = b"loan";

// DR-007 D1: status do Loan onchain (0=Active=padrão pós-init zerado, 1=Repaid)
const LOAN_STATUS_ACTIVE: u8 = 0;
const LOAN_STATUS_REPAID: u8 = 1;

// Oracle pubkey — admin keypair que assina attestations off-chain.
// Mesma key da Vault.authority (devnet single-key Tainan/Samuel).
// Usado em verify_ed25519_attestation pra confirmar que score vem do nosso oracle.
const ORACLE_PUBKEY: Pubkey = pubkey!("5y4M6HGghXAj5TYupFncUWXMEN7LKjDMDvMLiPsodUCa");

// Chainlink Ed25519 program ID (nativo Solana — runs on-chain ed25519 verification)
const ED25519_PROGRAM_ID: Pubkey = pubkey!("Ed25519SigVerify111111111111111111111111111");

// Chainlink Data Feed SOL/USD devnet — circuit breaker (market crash detector)
// Source: smartcontractkit/chainlink-solana-demo + verificado via solana account
// Owner: HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny (Chainlink Store program)
// NOTE: USDC/USD NÃO existe em devnet (verificado 28/05). Usamos SOL/USD como
//       proxy de crash de mercado: se SOL despenca abaixo de $50, halt empréstimo.
const SOL_USD_FEED_DEVNET: Pubkey = pubkey!("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6");

// Crash threshold: SOL abaixo de $10 → halt empréstimo (defesa contra crash).
// Decimals padrão Chainlink Solana = 8, então $10 = 10_00000000.
// NOTE: feed devnet propositadamente STALE em ~$22 (mar/2023). Threshold mainnet
//       seria $50, mas em devnet usamos $10 pra happy path passar com feed stale.
//       Circuit breaker ATIVO se feed cair abaixo de $10 (catastrófico).
const SOL_CRASH_MIN: i128 = 10_00000000;

#[program]
pub mod uber_money {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.usdc_mint = ctx.accounts.usdc_mint.key();
        vault.token_account = ctx.accounts.vault_token_account.key();
        vault.bump = ctx.bumps.vault;
        vault.total_released = 0;
        Ok(())
    }

    /// DR-004 — MOTORISTA CHAMA O CONTRATO DIRETO (Phantom signer).
    ///
    /// Pre-condições:
    ///   - Ix anterior na tx DEVE ser Ed25519 verify program com:
    ///     * signer pubkey = ORACLE_PUBKEY
    ///     * message = sha256(cpf_hash || amount.to_le_bytes() || score.to_le_bytes() || expires_at.to_le_bytes())
    ///   - Account `chainlink_feed` = USDC_USD_FEED_DEVNET
    ///   - Account `chainlink_program` = chainlink_solana program ID
    ///   - borrower é Signer (paga rent da ATA + rent do loan PDA + fee da tx)
    ///
    /// Faz:
    ///   1. Valida Ed25519 attestation (cala o "score veio de onde?")
    ///   2. Valida peg USDC via Chainlink Data Feed (circuit breaker)
    ///   3. Valida expires_at não passou (anti-replay)
    ///   4. Init PDA Loan + transfer USDC vault → borrower ATA
    pub fn borrower_request_loan(
        ctx: Context<BorrowerRequestLoan>,
        cpf_hash: [u8; 32],
        amount: u64,
        score: u16,
        expires_at: i64,
    ) -> Result<()> {
        // 1. Validações básicas
        require!(score >= SCORE_THRESHOLD, UberError::ScoreTooLow);
        require!(amount > 0, UberError::InvalidAmount);
        require!(amount <= MAX_AMOUNT_USDC, UberError::AmountAboveCap);

        let now = Clock::get()?.unix_timestamp;
        require!(now <= expires_at, UberError::AttestationExpired);

        // 2. Verifica Ed25519 attestation (scan da tx — Phantom v24+ auto-prependa
        //    ComputeBudget IXs pra priority fee, então Ed25519 pode estar em qualquer
        //    posição. Loop até achar uma ix com program_id == ED25519_PROGRAM_ID).
        let ix_sysvar = &ctx.accounts.instructions_sysvar;
        let mut ed25519_data: Option<Vec<u8>> = None;
        for i in 0u16..16u16 {
            match load_instruction_at_checked(i as usize, ix_sysvar) {
                Ok(ix) => {
                    if ix.program_id == ED25519_PROGRAM_ID {
                        ed25519_data = Some(ix.data);
                        break;
                    }
                }
                Err(_) => break, // fim da lista de ixs
            }
        }
        let ed25519_data = ed25519_data.ok_or(UberError::MissingAttestation)?;
        verify_ed25519_attestation(
            &ed25519_data,
            &ORACLE_PUBKEY,
            cpf_hash,
            amount,
            score,
            expires_at,
        )?;

        // 3. Chainlink Data Feed circuit breaker — propósito narrativo (DR-004 D1)
        // Lê SOL/USD on-chain. Se preço crashou abaixo de $50, halt empréstimo.
        let feed = &ctx.accounts.chainlink_feed;
        let chainlink_program = &ctx.accounts.chainlink_program;
        require!(
            *feed.key == SOL_USD_FEED_DEVNET,
            UberError::WrongFeed
        );
        let round = chainlink_solana::latest_round_data(
            chainlink_program.to_account_info(),
            feed.to_account_info(),
        ).map_err(|_| UberError::FeedReadFailed)?;
        let answer: i128 = round.answer;
        require!(answer >= SOL_CRASH_MIN, UberError::MarketCrashHalt);

        // 4. Vault check
        require!(
            ctx.accounts.vault_token_account.amount >= amount,
            UberError::InsufficientVaultBalance
        );

        // 5. Salva PDA Loan
        let loan = &mut ctx.accounts.loan;
        loan.cpf_hash = cpf_hash;
        loan.borrower = ctx.accounts.borrower.key();
        loan.amount = amount;
        loan.score = score;
        loan.released_at = now;
        loan.usdc_feed_answer = answer;
        loan.bump = ctx.bumps.loan;

        let vault = &mut ctx.accounts.vault;
        vault.total_released = vault.total_released.checked_add(amount).unwrap();

        // 6. CPI Transfer USDC vault → borrower (vault PDA assina)
        let vault_seeds = &[VAULT_SEED, &[vault.bump]];
        let signer = &[&vault_seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.borrower_token_account.to_account_info(),
                    authority: vault.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        emit!(LoanReleasedOnChain {
            borrower: loan.borrower,
            cpf_hash,
            amount,
            score,
            usdc_feed_answer: answer,
            timestamp: now,
        });
        Ok(())
    }

    /// LEGACY admin-signed — mantido pra retrocompat (DR-004 D4 feature flag).
    /// Quando todos os clients migrarem, esta ix vira stub que retorna erro.
    pub fn release_loan(
        ctx: Context<ReleaseLoan>,
        cpf_hash: [u8; 32],
        amount: u64,
        score: u16,
    ) -> Result<()> {
        require!(score >= SCORE_THRESHOLD, UberError::ScoreTooLow);
        require!(amount > 0, UberError::InvalidAmount);
        require!(amount <= MAX_AMOUNT_USDC, UberError::AmountAboveCap);
        require!(
            ctx.accounts.vault_token_account.amount >= amount,
            UberError::InsufficientVaultBalance
        );

        let loan = &mut ctx.accounts.loan;
        loan.cpf_hash = cpf_hash;
        loan.borrower = ctx.accounts.borrower.key();
        loan.amount = amount;
        loan.score = score;
        loan.released_at = Clock::get()?.unix_timestamp;
        loan.usdc_feed_answer = 0; // legacy não consulta feed
        loan.bump = ctx.bumps.loan;

        let vault = &mut ctx.accounts.vault;
        vault.total_released = vault.total_released.checked_add(amount).unwrap();

        let seeds = &[VAULT_SEED, &[vault.bump]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.borrower_token_account.to_account_info(),
                    authority: vault.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        emit!(LoanReleased {
            borrower: loan.borrower,
            cpf_hash,
            amount,
            score,
            timestamp: loan.released_at,
        });
        Ok(())
    }

    /// DR-007 — Marker-only repayment (sem CPI USDC; vault contabilmente
    /// desbalanceada pós-repay até V2 com USDC return + close PDA).
    ///
    /// Pre-condições:
    ///   - Ix anterior na tx DEVE ser Ed25519 verify program com:
    ///     * signer pubkey = ORACLE_PUBKEY
    ///     * message = layout REPAY_V1 (ver verify_ed25519_repay_attestation)
    ///   - Loan PDA está Active (status==0)
    ///   - borrower (signer) == loan.borrower (has_one)
    ///
    /// Faz:
    ///   1. Valida status Active + expires_at não passou
    ///   2. Scan Ed25519 attestation prepended
    ///   3. Marca loan.status=Repaid + grava repaid_at, repay_amount_usdc, repay_nonce
    pub fn repay_loan(
        ctx: Context<RepayLoan>,
        cpf_hash: [u8; 32],
        amount_paid_usdc: u64,
        nonce: [u8; 8],
        expires_at: i64,
    ) -> Result<()> {
        let loan = &mut ctx.accounts.loan;
        require!(loan.status == LOAN_STATUS_ACTIVE, UberError::LoanAlreadyRepaid);

        let now = Clock::get()?.unix_timestamp;
        require!(now <= expires_at, UberError::AttestationExpired);

        let ix_sysvar = &ctx.accounts.instructions_sysvar;
        let mut ed25519_data: Option<Vec<u8>> = None;
        for i in 0u16..16u16 {
            match load_instruction_at_checked(i as usize, ix_sysvar) {
                Ok(ix) => {
                    if ix.program_id == ED25519_PROGRAM_ID {
                        ed25519_data = Some(ix.data);
                        break;
                    }
                }
                Err(_) => break,
            }
        }
        let ed25519_data = ed25519_data.ok_or(UberError::MissingAttestation)?;

        verify_ed25519_repay_attestation(
            &ed25519_data,
            &ORACLE_PUBKEY,
            cpf_hash,
            loan.key(),
            ctx.accounts.borrower.key(),
            amount_paid_usdc,
            nonce,
            expires_at,
        )?;

        loan.status = LOAN_STATUS_REPAID;
        loan.repaid_at = now;
        loan.repay_amount_usdc = amount_paid_usdc;
        loan.repay_nonce = nonce;

        emit!(LoanRepaid {
            borrower: ctx.accounts.borrower.key(),
            cpf_hash,
            loan: loan.key(),
            amount_paid_usdc,
            repaid_at: now,
        });
        Ok(())
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/// Parse + valida Ed25519 attestation conforme layout do Ed25519Program nativo.
///
/// Layout do data (https://docs.solanalabs.com/runtime/programs#ed25519-program):
///   [0]    num_signatures (u8) — esperamos 1
///   [1]    padding (u8)
///   [2..4] signature_offset (u16 LE)
///   [4..6] signature_instruction_index (u16 LE)
///   [6..8] public_key_offset (u16 LE)
///   [8..10] public_key_instruction_index (u16 LE)
///   [10..12] message_data_offset (u16 LE)
///   [12..14] message_data_size (u16 LE)
///   [14..16] message_instruction_index (u16 LE)
///   ...signature (64), pubkey (32), message (msg_size)
fn verify_ed25519_attestation(
    data: &[u8],
    expected_signer: &Pubkey,
    cpf_hash: [u8; 32],
    amount: u64,
    score: u16,
    expires_at: i64,
) -> Result<()> {
    require!(data.len() >= 16, UberError::InvalidAttestationLayout);
    require!(data[0] == 1, UberError::InvalidAttestationLayout); // 1 sig

    let pubkey_offset = u16::from_le_bytes([data[6], data[7]]) as usize;
    let msg_offset = u16::from_le_bytes([data[10], data[11]]) as usize;
    let msg_size = u16::from_le_bytes([data[12], data[13]]) as usize;

    require!(pubkey_offset + 32 <= data.len(), UberError::InvalidAttestationLayout);
    require!(msg_offset + msg_size <= data.len(), UberError::InvalidAttestationLayout);

    // 1. Confere signer
    let signer_bytes = &data[pubkey_offset..pubkey_offset + 32];
    require!(
        signer_bytes == expected_signer.to_bytes(),
        UberError::WrongOracleSigner
    );

    // 2. Confere message
    //    payload = cpf_hash (32) || amount LE (8) || score LE (2) || expires_at LE (8) = 50 bytes
    let mut expected = Vec::with_capacity(50);
    expected.extend_from_slice(&cpf_hash);
    expected.extend_from_slice(&amount.to_le_bytes());
    expected.extend_from_slice(&score.to_le_bytes());
    expected.extend_from_slice(&expires_at.to_le_bytes());

    let actual_msg = &data[msg_offset..msg_offset + msg_size];
    require!(actual_msg == expected.as_slice(), UberError::AttestationMismatch);

    Ok(())
}

/// DR-007 D3 — Parse + valida Ed25519 attestation pra repay.
///
/// Mesmo layout do Ed25519Program nativo (ver verify_ed25519_attestation),
/// mas o `message` segue o layout REPAY_V1 (128 bytes):
///
/// ```text
/// b"REPAY_V1"(8) || cpf_hash(32) || loan_pda(32) || borrower(32)
///                || amount_paid_usdc LE(8) || nonce(8) || expires_at LE(8)
/// ```
///
/// Domain separator `REPAY_V1` previne colisão cross-protocol com release.
/// `loan_pda` + `borrower` previnem wallet swap e replay cross-loan.
fn verify_ed25519_repay_attestation(
    data: &[u8],
    expected_signer: &Pubkey,
    cpf_hash: [u8; 32],
    loan_pda: Pubkey,
    borrower: Pubkey,
    amount_paid_usdc: u64,
    nonce: [u8; 8],
    expires_at: i64,
) -> Result<()> {
    require!(data.len() >= 16, UberError::InvalidRepayAttestationLayout);
    require!(data[0] == 1, UberError::InvalidRepayAttestationLayout);

    let pubkey_offset = u16::from_le_bytes([data[6], data[7]]) as usize;
    let msg_offset = u16::from_le_bytes([data[10], data[11]]) as usize;
    let msg_size = u16::from_le_bytes([data[12], data[13]]) as usize;

    require!(pubkey_offset + 32 <= data.len(), UberError::InvalidRepayAttestationLayout);
    require!(msg_offset + msg_size <= data.len(), UberError::InvalidRepayAttestationLayout);

    let signer_bytes = &data[pubkey_offset..pubkey_offset + 32];
    require!(
        signer_bytes == expected_signer.to_bytes(),
        UberError::WrongOracleSigner
    );

    let mut expected = Vec::with_capacity(128);
    expected.extend_from_slice(b"REPAY_V1");
    expected.extend_from_slice(&cpf_hash);
    expected.extend_from_slice(&loan_pda.to_bytes());
    expected.extend_from_slice(&borrower.to_bytes());
    expected.extend_from_slice(&amount_paid_usdc.to_le_bytes());
    expected.extend_from_slice(&nonce);
    expected.extend_from_slice(&expires_at.to_le_bytes());

    let actual_msg = &data[msg_offset..msg_offset + msg_size];
    require!(actual_msg == expected.as_slice(), UberError::RepayAttestationMismatch);

    Ok(())
}

// ─── Accounts ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::SIZE,
        seeds = [VAULT_SEED],
        bump
    )]
    pub vault: Account<'info, Vault>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = vault,
        seeds = [b"vault_token", vault.key().as_ref()],
        bump
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(cpf_hash: [u8; 32])]
pub struct BorrowerRequestLoan<'info> {
    #[account(mut, has_one = authority)]
    pub vault: Account<'info, Vault>,
    /// CHECK: validado por `has_one = authority` no Vault. Não precisa assinar aqui — só verificação.
    pub authority: AccountInfo<'info>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(
        init,
        payer = borrower,
        space = 8 + Loan::SIZE,
        seeds = [LOAN_SEED, cpf_hash.as_ref()],
        bump
    )]
    pub loan: Account<'info, Loan>,
    #[account(mut, address = vault.token_account)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = vault.usdc_mint,
        token::authority = borrower
    )]
    pub borrower_token_account: Account<'info, TokenAccount>,
    /// CHECK: Chainlink Data Feed account (validado por endereço hardcoded)
    pub chainlink_feed: AccountInfo<'info>,
    /// CHECK: chainlink_solana program (validado pelo crate ao chamar)
    pub chainlink_program: AccountInfo<'info>,
    /// CHECK: sysvar instructions (validado por endereço)
    #[account(address = INSTRUCTIONS_SYSVAR_ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(cpf_hash: [u8; 32])]
pub struct ReleaseLoan<'info> {
    #[account(mut, has_one = authority)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: borrower passed by admin edge, vinculated to verified JWT.
    pub borrower: AccountInfo<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Loan::SIZE,
        seeds = [LOAN_SEED, cpf_hash.as_ref()],
        bump
    )]
    pub loan: Account<'info, Loan>,
    #[account(mut, address = vault.token_account)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = vault.usdc_mint,
        token::authority = borrower
    )]
    pub borrower_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(cpf_hash: [u8; 32])]
pub struct RepayLoan<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(
        mut,
        seeds = [LOAN_SEED, cpf_hash.as_ref()],
        bump = loan.bump,
        has_one = borrower,
    )]
    pub loan: Account<'info, Loan>,
    /// CHECK: sysvar instructions (validado por endereço)
    #[account(address = INSTRUCTIONS_SYSVAR_ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

// ─── State ────────────────────────────────────────────────────────────────

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub usdc_mint: Pubkey,
    pub token_account: Pubkey,
    pub total_released: u64,
    pub bump: u8,
}
impl Vault {
    pub const SIZE: usize = 32 + 32 + 32 + 8 + 1;
}

#[account]
pub struct Loan {
    pub cpf_hash: [u8; 32],
    pub borrower: Pubkey,
    pub amount: u64,
    pub score: u16,
    pub released_at: i64,
    pub usdc_feed_answer: i128,  // snapshot do Chainlink USDC/USD no momento (DR-004)
    pub bump: u8,
    // DR-007 V2 — repayment fields (append-only; PDAs antigas devnet ficam órfãs, OK pra hackathon)
    pub status: u8,                    // LOAN_STATUS_ACTIVE | LOAN_STATUS_REPAID
    pub repaid_at: i64,                // 0 = unset
    pub repay_amount_usdc: u64,        // 0 = unset
    pub repay_nonce: [u8; 8],          // anti-replay (= payouts.id trimado)
}
impl Loan {
    pub const SIZE_V1: usize = 32 + 32 + 8 + 2 + 8 + 16 + 1;
    pub const SIZE: usize = Self::SIZE_V1 + 1 + 8 + 8 + 8;
}

#[event]
pub struct LoanReleased {
    pub borrower: Pubkey,
    pub cpf_hash: [u8; 32],
    pub amount: u64,
    pub score: u16,
    pub timestamp: i64,
}

#[event]
pub struct LoanReleasedOnChain {
    pub borrower: Pubkey,
    pub cpf_hash: [u8; 32],
    pub amount: u64,
    pub score: u16,
    pub usdc_feed_answer: i128,
    pub timestamp: i64,
}

#[event]
pub struct LoanRepaid {
    pub borrower: Pubkey,
    pub cpf_hash: [u8; 32],
    pub loan: Pubkey,
    pub amount_paid_usdc: u64,
    pub repaid_at: i64,
}

#[error_code]
pub enum UberError {
    #[msg("Score below threshold (min 600/1000)")]
    ScoreTooLow,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Amount above on-chain cap")]
    AmountAboveCap,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    #[msg("Attestation expired (Ed25519 payload expires_at < now)")]
    AttestationExpired,
    #[msg("Missing Ed25519 attestation as prior instruction")]
    MissingAttestation,
    #[msg("Ed25519 attestation layout invalid")]
    InvalidAttestationLayout,
    #[msg("Ed25519 signer is not the expected oracle")]
    WrongOracleSigner,
    #[msg("Ed25519 message bytes mismatch (cpf_hash || amount || score || expires_at)")]
    AttestationMismatch,
    #[msg("Chainlink feed account mismatch (expected SOL/USD devnet)")]
    WrongFeed,
    #[msg("Chainlink feed read failed")]
    FeedReadFailed,
    #[msg("Market crash detected via Chainlink Data Feed (SOL/USD below threshold) — empréstimo bloqueado")]
    MarketCrashHalt,
    #[msg("Loan already repaid")]
    LoanAlreadyRepaid,
    #[msg("Repay attestation layout invalid")]
    InvalidRepayAttestationLayout,
    #[msg("Repay attestation message mismatch")]
    RepayAttestationMismatch,
}

#[event]
pub struct LoanHalted {
    pub borrower: Pubkey,
    pub reason: u8,
    pub sol_usd_answer: i128,
}
