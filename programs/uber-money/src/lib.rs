
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::{
    load_instruction_at_checked, ID as INSTRUCTIONS_SYSVAR_ID,
};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("6m2ipcrUCRpSqkPSqNNKNH11rNmVsu8KmnBLnBtFsq2N");

const SCORE_THRESHOLD: u16 = 600;
const MAX_AMOUNT_USDC: u64 = 10_000_000;
const VAULT_SEED: &[u8] = b"vault";
const LOAN_SEED: &[u8] = b"loan";

const LOAN_STATUS_ACTIVE: u8 = 0;
const LOAN_STATUS_REPAID: u8 = 1;

const ORACLE_PUBKEY: Pubkey = pubkey!("5y4M6HGghXAj5TYupFncUWXMEN7LKjDMDvMLiPsodUCa");

const ED25519_PROGRAM_ID: Pubkey = pubkey!("Ed25519SigVerify111111111111111111111111111");

const SOL_USD_FEED_DEVNET: Pubkey = pubkey!("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6");

// Chainlink Store program (devnet). Sem pin, um atacante passaria um programa
// falso que devolve answer alto e burlaria o circuit breaker.
const CHAINLINK_PROGRAM_ID: Pubkey = pubkey!("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny");

// feed devnet stale em ~$22 (mar/2023); threshold $10 garante happy path sem false-halt
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

    pub fn borrower_request_loan(
        ctx: Context<BorrowerRequestLoan>,
        cpf_hash: [u8; 32],
        amount: u64,
        score: u16,
        expires_at: i64,
    ) -> Result<()> {
        require!(score >= SCORE_THRESHOLD, UberError::ScoreTooLow);
        require!(amount > 0, UberError::InvalidAmount);
        require!(amount <= MAX_AMOUNT_USDC, UberError::AmountAboveCap);

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
        verify_ed25519_attestation(
            &ed25519_data,
            &ORACLE_PUBKEY,
            cpf_hash,
            ctx.accounts.borrower.key(),
            amount,
            score,
            expires_at,
        )?;

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

        require!(
            ctx.accounts.vault_token_account.amount >= amount,
            UberError::InsufficientVaultBalance
        );

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
        loan.usdc_feed_answer = 0;
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

    pub fn cash_out(ctx: Context<CashOut>, cpf_hash: [u8; 32], amount: u64) -> Result<()> {
        require!(ctx.accounts.loan.status == LOAN_STATUS_ACTIVE, UberError::LoanAlreadyRepaid);
        require!(amount > 0, UberError::InvalidAmount);
        require!(amount <= ctx.accounts.loan.amount, UberError::InvalidAmount);

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

        emit!(LoanCashedOut {
            borrower: ctx.accounts.borrower.key(),
            cpf_hash,
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }
}

// https://docs.solanalabs.com/runtime/programs#ed25519-program
fn verify_ed25519_attestation(
    data: &[u8],
    expected_signer: &Pubkey,
    cpf_hash: [u8; 32],
    borrower: Pubkey,
    amount: u64,
    score: u16,
    expires_at: i64,
) -> Result<()> {
    require!(data.len() >= 16, UberError::InvalidAttestationLayout);
    require!(data[0] == 1, UberError::InvalidAttestationLayout);

    // Os *_instruction_index DEVEM ser 0xFFFF (esta ix). Senão o atacante aponta
    // pubkey/msg/sig pra outra ix com assinatura própria válida — o programa nativo
    // verifica AQUELA, mas nós lemos os bytes do oracle aqui = forja da attestation.
    let sig_ix_idx = u16::from_le_bytes([data[4], data[5]]);
    let pk_ix_idx = u16::from_le_bytes([data[8], data[9]]);
    let msg_ix_idx = u16::from_le_bytes([data[14], data[15]]);
    require!(
        sig_ix_idx == 0xFFFF && pk_ix_idx == 0xFFFF && msg_ix_idx == 0xFFFF,
        UberError::InvalidAttestationLayout
    );

    let pubkey_offset = u16::from_le_bytes([data[6], data[7]]) as usize;
    let msg_offset = u16::from_le_bytes([data[10], data[11]]) as usize;
    let msg_size = u16::from_le_bytes([data[12], data[13]]) as usize;

    require!(pubkey_offset + 32 <= data.len(), UberError::InvalidAttestationLayout);
    require!(msg_offset + msg_size <= data.len(), UberError::InvalidAttestationLayout);

    let signer_bytes = &data[pubkey_offset..pubkey_offset + 32];
    require!(
        signer_bytes == expected_signer.to_bytes(),
        UberError::WrongOracleSigner
    );

    let mut expected = Vec::with_capacity(90);
    expected.extend_from_slice(b"LOAN_V01");
    expected.extend_from_slice(&cpf_hash);
    expected.extend_from_slice(&borrower.to_bytes());
    expected.extend_from_slice(&amount.to_le_bytes());
    expected.extend_from_slice(&score.to_le_bytes());
    expected.extend_from_slice(&expires_at.to_le_bytes());

    let actual_msg = &data[msg_offset..msg_offset + msg_size];
    require!(actual_msg == expected.as_slice(), UberError::AttestationMismatch);

    Ok(())
}

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

    let sig_ix_idx = u16::from_le_bytes([data[4], data[5]]);
    let pk_ix_idx = u16::from_le_bytes([data[8], data[9]]);
    let msg_ix_idx = u16::from_le_bytes([data[14], data[15]]);
    require!(
        sig_ix_idx == 0xFFFF && pk_ix_idx == 0xFFFF && msg_ix_idx == 0xFFFF,
        UberError::InvalidRepayAttestationLayout
    );

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
    /// CHECK: chainlink_solana program (pin por endereço)
    #[account(address = CHAINLINK_PROGRAM_ID)]
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

#[derive(Accounts)]
#[instruction(cpf_hash: [u8; 32])]
pub struct CashOut<'info> {
    #[account(seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(
        seeds = [LOAN_SEED, cpf_hash.as_ref()],
        bump = loan.bump,
        has_one = borrower,
    )]
    pub loan: Account<'info, Loan>,
    #[account(
        mut,
        token::mint = vault.usdc_mint,
        token::authority = borrower
    )]
    pub borrower_token_account: Account<'info, TokenAccount>,
    #[account(mut, address = vault.token_account)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
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
    pub usdc_feed_answer: i128,
    pub bump: u8,
    pub status: u8,
    pub repaid_at: i64,
    pub repay_amount_usdc: u64,
    pub repay_nonce: [u8; 8],
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

#[event]
pub struct LoanCashedOut {
    pub borrower: Pubkey,
    pub cpf_hash: [u8; 32],
    pub amount: u64,
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
