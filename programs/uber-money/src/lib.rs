//! Uber Money — programa Anchor para escrow USDC + liberação de empréstimo.
//!
//! ⚠️ Program ID abaixo é PLACEHOLDER. Gerar real com:
//!     solana-keygen new -o target/deploy/uber_money-keypair.json
//!     anchor keys list   # copiar o pubkey gerado
//! Depois atualizar `declare_id!()` e `Anchor.toml`. Rebuild obrigatório.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("UbrMny1111111111111111111111111111111111111");

const SCORE_THRESHOLD: u16 = 600;
// Hard cap por transação no escrow (sandbox = 100 USDC com 6 decimals = R$ ~500 demo).
// Backend (Edge Function) cap real em R$ 10 (Pix); este é o cinto-e-suspensório on-chain.
const MAX_AMOUNT_USDC: u64 = 100_000_000;
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
        vault.total_repaid = 0;
        Ok(())
    }

    /// Anti-double: PDA seed = [LOAN, borrower] (1 PDA por wallet).
    /// `is_open` controla concorrência; histórico de empréstimos vive em eventos
    /// (`LoanReleased`/`LoanRepaid`) indexados off-chain.
    pub fn release_loan(
        ctx: Context<ReleaseLoan>,
        loan_id: u64,
        amount: u64,
        score: u16,
    ) -> Result<()> {
        require!(score >= SCORE_THRESHOLD, UberError::ScoreTooLow);
        require!(amount > 0, UberError::InvalidAmount);
        require!(amount <= MAX_AMOUNT_USDC, UberError::AmountAboveCap);
        require!(ctx.accounts.vault_token_account.amount >= amount, UberError::InsufficientVaultBalance);

        let loan = &mut ctx.accounts.loan;
        require!(!loan.is_open, UberError::LoanAlreadyOpen);

        loan.borrower = ctx.accounts.borrower.key();
        loan.loan_id = loan_id;
        loan.amount = amount;
        loan.score_at_release = score;
        loan.released_at = Clock::get()?.unix_timestamp;
        loan.is_open = true;
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

        emit!(LoanReleased { borrower: loan.borrower, loan_id, amount, score, timestamp: loan.released_at });
        Ok(())
    }

    pub fn repay_loan(ctx: Context<RepayLoan>, loan_id: u64, amount: u64) -> Result<()> {
        let loan = &mut ctx.accounts.loan;
        require!(loan.is_open, UberError::LoanNotOpen);
        require!(loan.loan_id == loan_id, UberError::LoanIdMismatch);
        require!(amount >= loan.amount, UberError::UnderpaidLoan);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.borrower_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.borrower.to_account_info(),
                },
            ),
            amount,
        )?;

        loan.is_open = false;
        loan.repaid_at = Clock::get()?.unix_timestamp;

        let vault = &mut ctx.accounts.vault;
        vault.total_repaid = vault.total_repaid.checked_add(amount).unwrap();

        emit!(LoanRepaid { borrower: loan.borrower, loan_id, amount, timestamp: loan.repaid_at });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + Vault::SIZE, seeds = [VAULT_SEED], bump)]
    pub vault: Account<'info, Vault>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(init, payer = authority, token::mint = usdc_mint, token::authority = vault, seeds = [b"vault_token", vault.key().as_ref()], bump)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(loan_id: u64)]
pub struct ReleaseLoan<'info> {
    #[account(mut, has_one = authority)]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
    /// CHECK: borrower validated via loan PDA seeds
    pub borrower: AccountInfo<'info>,
    #[account(init_if_needed, payer = authority, space = 8 + Loan::SIZE, seeds = [LOAN_SEED, borrower.key().as_ref()], bump)]
    pub loan: Account<'info, Loan>,
    #[account(mut, address = vault.token_account)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut, token::mint = vault.usdc_mint, token::authority = borrower)]
    pub borrower_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(loan_id: u64)]
pub struct RepayLoan<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(mut, seeds = [LOAN_SEED, borrower.key().as_ref()], bump = loan.bump, has_one = borrower)]
    pub loan: Account<'info, Loan>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(mut, address = vault.token_account)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut, token::mint = vault.usdc_mint, token::authority = borrower)]
    pub borrower_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub usdc_mint: Pubkey,
    pub token_account: Pubkey,
    pub total_released: u64,
    pub total_repaid: u64,
    pub bump: u8,
}
impl Vault { pub const SIZE: usize = 32 + 32 + 32 + 8 + 8 + 1; }

#[account]
pub struct Loan {
    pub borrower: Pubkey,
    pub loan_id: u64,
    pub amount: u64,
    pub score_at_release: u16,
    pub released_at: i64,
    pub repaid_at: i64,
    pub is_open: bool,
    pub bump: u8,
}
impl Loan { pub const SIZE: usize = 32 + 8 + 8 + 2 + 8 + 8 + 1 + 1; }

#[event] pub struct LoanReleased { pub borrower: Pubkey, pub loan_id: u64, pub amount: u64, pub score: u16, pub timestamp: i64 }
#[event] pub struct LoanRepaid   { pub borrower: Pubkey, pub loan_id: u64, pub amount: u64, pub timestamp: i64 }

#[error_code]
pub enum UberError {
    #[msg("Score below threshold (min 600/1000)")] ScoreTooLow,
    #[msg("Invalid amount")] InvalidAmount,
    #[msg("Amount above on-chain cap")] AmountAboveCap,
    #[msg("Insufficient vault balance")] InsufficientVaultBalance,
    #[msg("Borrower already has an open loan")] LoanAlreadyOpen,
    #[msg("No open loan to repay")] LoanNotOpen,
    #[msg("Loan id mismatch")] LoanIdMismatch,
    #[msg("Repayment below principal")] UnderpaidLoan,
}
