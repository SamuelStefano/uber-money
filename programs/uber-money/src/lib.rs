//! Uber Money — Anchor program (Hackanation 2026, devnet only).
//!
//! ⚠️  HACKATHON DEMO — DO NOT DEPLOY TO MAINNET WITHOUT:
//!     - Multisig authority (Squads) replacing single-key admin
//!     - Ed25519 score attestation on-chain (currently authority IS the score oracle)
//!     - `borrower: Signer` via session key (currently AccountInfo, trusts admin)
//!     - New program ID + rotated pepper for mainnet deploy
//!
//! Trust model (DR-002 §security):
//! - authority (Tainan single-key) signs `release_loan` trusting score computed off-chain
//! - borrower is AccountInfo, derived from JWT verified by edge admin
//! - PDA seed = sha256(cpf || users.cpf_pepper) — pepper per-user in Supabase
//!
//! Program ID gerado 26/05/2026. Regenerate via:
//!     solana-keygen new -o target/deploy/uber_money-keypair.json
//!     anchor keys list

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N");

const SCORE_THRESHOLD: u16 = 600;
// DR-002 D11: on-chain cap = $10 USDC (defense-in-depth). Demo vault pre-fund = $20.
// Backend cap (R$10) is the user-facing limit; this is the on-chain ceiling.
const MAX_AMOUNT_USDC: u64 = 10_000_000;
const VAULT_SEED: &[u8] = b"vault";
const LOAN_SEED: &[u8] = b"loan";

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

    /// Anti-double: PDA seed = [LOAN, cpf_hash] enforces 1 loan per CPF (lifetime, on-chain).
    /// `init` (not `init_if_needed`) → fails hard if PDA already exists (DR-002 D3).
    /// Off-chain double-defense via UNIQUE constraint on loans.cpf_hash (migration 0005).
    //
    // SECURITY-DEBT: score is signed by admin authority only — no on-chain attestation
    // from CRE. If authority key leaks, vault can be drained up to MAX_AMOUNT_USDC per
    // distinct borrower. Mitigation: pre-fund $20 USDC + key rotation post-demo.
    // Production: Ed25519 attestation via ed25519_program.
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

    /// DR-003 D1 — MOCK do `ccip_receive` real.
    ///
    /// Assinatura compatível com Chainlink CCIP `Any2SolanaMessage` payload:
    /// `(cpf_hash, amount, score, source_chain_selector)`. Em produção, esta
    /// instruction seria invocada via CPI pelo CCIP router program em Solana.
    ///
    /// No demo do hackathon, é chamada pelo authority (admin) direto — o
    /// caminho CRE Sepolia → CCIP `ccipSend` é demonstrado por tx hash + `messageId`
    /// real no explorer, mas o último hop é mockado por restrição de tempo.
    ///
    /// Comportamento idêntico ao `release_loan`. Tx separada pro Solana Explorer
    /// torna o "caminho CCIP" auditável no pitch.
    pub fn admin_disburse(
        ctx: Context<ReleaseLoan>,
        cpf_hash: [u8; 32],
        amount: u64,
        score: u16,
        source_chain_selector: u64,
    ) -> Result<()> {
        // source_chain_selector documenta a origem CCIP (Sepolia = 16015286601757825753).
        // No mock, só loga via msg!; em prod, validaria allowlist.
        msg!("admin_disburse mock: source_chain_selector = {}", source_chain_selector);

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

        emit!(LoanDisbursedViaCcip {
            borrower: loan.borrower,
            cpf_hash,
            amount,
            score,
            source_chain_selector,
            timestamp: loan.released_at,
        });
        Ok(())
    }
}

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
pub struct ReleaseLoan<'info> {
    #[account(mut, has_one = authority)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: borrower passed by admin edge, vinculated to verified JWT.
    /// See SECURITY-DEBT in `release_loan` doc.
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
    pub bump: u8,
}
impl Loan {
    pub const SIZE: usize = 32 + 32 + 8 + 2 + 8 + 1;
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
pub struct LoanDisbursedViaCcip {
    pub borrower: Pubkey,
    pub cpf_hash: [u8; 32],
    pub amount: u64,
    pub score: u16,
    pub source_chain_selector: u64,
    pub timestamp: i64,
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
}
