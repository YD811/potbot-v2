// PotBot v2 — redeem_tokens
//
// Liquid ETF exit: a member burns SPL share-tokens from their ATA and receives
// SOL from the vault PDA at NAV. No AMM needed — the program is the redeemer.
//
// Withdrawal reserve: at most 80% of vault SOL can leave in a single redemption
// to prevent a thundering-herd run from leaving the vault unable to honour
// pending strategies' rent-exempt minimum.

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};

use crate::constants::VAULT_SEED;
use crate::errors::PotError;
use crate::state::pot::PotAccount;

/// Bps of vault SOL that may exit in a single redemption (8000 = 80%).
const MAX_EXIT_BPS: u128 = 8_000;

#[derive(Accounts)]
pub struct RedeemTokens<'info> {
    #[account(mut)]
    pub pot: Account<'info, PotAccount>,

    /// Vault PDA holding the pot's SOL.
    #[account(
        mut,
        seeds = [VAULT_SEED, pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub member: Signer<'info>,

    /// SPL share-token mint pinned to `pot.token_mint`.
    #[account(
        mut,
        constraint = token_mint.key() == pot.token_mint @ PotError::NotTokenized
    )]
    pub token_mint: Account<'info, Mint>,

    /// Member's ATA for the share token. Burned from here.
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = member,
    )]
    pub member_token_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RedeemTokens>, token_amount: u64) -> Result<()> {
    require!(token_amount > 0, PotError::InvalidAmount);
    require!(!ctx.accounts.pot.paused, PotError::PotPaused);

    // Convert SPL token units → internal share units. The mint side
    // (`mint_tokens_to_member`) emits `internal_shares * shares_per_sol`
    // SPL tokens, so the redeem path must divide by the same scale before
    // pricing or decrementing `total_shares`. Otherwise a holder of N
    // tokens would redeem N internal shares' worth of SOL and burn N
    // shares from the pot — overpaying by a factor of `shares_per_sol`.
    let scale = ctx.accounts.pot.shares_per_sol;
    require!(scale > 0, PotError::NotTokenized);
    require!(
        token_amount % scale == 0,
        PotError::InvalidAmount
    ); // disallow fractional internal shares; round at the UI
    let internal_shares = token_amount
        .checked_div(scale)
        .ok_or(error!(PotError::MathOverflow))?;
    require!(internal_shares > 0, PotError::InvalidAmount);

    // Liquid balance = vault.lamports() minus rent-exempt minimum, so the
    // SystemAccount stays rent-exempt after the redemption.
    let rent = Rent::get()?;
    let rent_min = rent.minimum_balance(0);
    let raw = ctx.accounts.vault.lamports();
    let liquid = raw.saturating_sub(rent_min);
    require!(liquid > 0, PotError::InsufficientVaultBalance);

    // NAV: lamports_out = internal_shares * liquid / total_shares.
    let pot = &ctx.accounts.pot;
    let sol_out = pot.shares_to_lamports(internal_shares, liquid);
    require!(sol_out > 0, PotError::InvalidAmount);

    // 80% liquidity reserve: a single redemption can drain at most 80% of
    // the liquid vault. Larger exits must be split across multiple txs.
    let max_exit = (liquid as u128)
        .checked_mul(MAX_EXIT_BPS)
        .ok_or(error!(PotError::MathOverflow))?
        / 10_000u128;
    require!(
        (sol_out as u128) <= max_exit,
        PotError::WithdrawalReserveBreached
    );

    // Burn the SPL tokens before moving SOL — fail-closed if the burn errors.
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.member_token_ata.to_account_info(),
                authority: ctx.accounts.member.to_account_info(),
            },
        ),
        token_amount,
    )?;

    // Transfer SOL vault -> member. Vault is a SystemAccount PDA, so we sign
    // via invoke_signed using its canonical seeds.
    let pot_key = ctx.accounts.pot.key();
    let vault_bump = ctx.accounts.pot.vault_bump;
    let signer_seeds: &[&[u8]] = &[
        VAULT_SEED,
        pot_key.as_ref(),
        core::slice::from_ref(&vault_bump),
    ];
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.member.to_account_info(),
            },
            &[signer_seeds],
        ),
        sol_out,
    )?;

    // Bookkeeping — `total_shares` lives in INTERNAL share units, not SPL units.
    let now = Clock::get()?.unix_timestamp;
    let pot = &mut ctx.accounts.pot;
    pot.total_shares = pot
        .total_shares
        .checked_sub(internal_shares)
        .ok_or(error!(PotError::MathOverflow))?;
    pot.last_activity_at = now;

    emit!(TokensRedeemed {
        pot: pot_key,
        member: ctx.accounts.member.key(),
        tokens_burned: token_amount,
        internal_shares_burned: internal_shares,
        sol_out,
        timestamp: now,
    });

    msg!(
        "Redeemed {} SPL tokens ({} internal shares) -> {} lamports (pot {})",
        token_amount,
        internal_shares,
        sol_out,
        pot_key
    );
    Ok(())
}

#[event]
pub struct TokensRedeemed {
    pub pot: Pubkey,
    pub member: Pubkey,
    pub tokens_burned: u64,
    pub internal_shares_burned: u64,
    pub sol_out: u64,
    pub timestamp: i64,
}
