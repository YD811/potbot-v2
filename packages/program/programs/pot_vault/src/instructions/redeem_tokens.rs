use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};

use crate::errors::ErrorCode;
use crate::state::PotAccount;

#[derive(Accounts)]
pub struct RedeemTokens<'info> {
    #[account(
        mut,
        seeds = [b"pot", pot.authority.as_ref(), pot.name.as_bytes()],
        bump = pot.pot_bump,
    )]
    pub pot: Account<'info, PotAccount>,

    /// CHECK: vault PDA that holds SOL
    #[account(
        mut,
        seeds = [b"vault", pot.key().as_ref()],
        bump = pot.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"token_mint", pot.key().as_ref()],
        bump,
        constraint = token_mint.key() == pot.token_mint @ ErrorCode::NotTokenized,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = member,
    )]
    pub member_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub member: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RedeemTokens>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidBurnAmount);
    require!(
        !ctx.accounts.pot.paused,
        ErrorCode::RedemptionPausedWhilePotPaused
    );

    let vault_balance = ctx.accounts.vault.lamports();
    let token_supply = ctx.accounts.token_mint.supply;

    require!(token_supply > 0, ErrorCode::RedemptionInsufficientVault);
    require!(vault_balance > 0, ErrorCode::RedemptionInsufficientVault);

    let lamports_out = (amount as u128)
        .checked_mul(vault_balance as u128)
        .ok_or(ErrorCode::ArithmeticOverflow)?
        .checked_div(token_supply as u128)
        .ok_or(ErrorCode::ArithmeticOverflow)? as u64;

    let vault_after = vault_balance.saturating_sub(lamports_out);
    let min_reserve = vault_balance / 5;
    require!(vault_after >= min_reserve, ErrorCode::InsufficientReserve);

    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.member_token_account.to_account_info(),
                authority: ctx.accounts.member.to_account_info(),
            },
        ),
        amount,
    )?;

    let pot = &ctx.accounts.pot;
    let pot_key = pot.key();
    let vault_seeds = &[b"vault", pot_key.as_ref(), &[pot.vault_bump]];
    let signer_seeds = &[&vault_seeds[..]];

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.member.to_account_info(),
            },
            signer_seeds,
        ),
        lamports_out,
    )?;

    msg!(
        "Redeemed {} tokens for {} lamports (vault: {} → {})",
        amount,
        lamports_out,
        vault_balance,
        vault_after
    );

    Ok(())
}
