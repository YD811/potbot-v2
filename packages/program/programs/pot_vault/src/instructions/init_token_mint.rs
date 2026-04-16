use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use crate::state::PotAccount;

/// Initialize an SPL token mint for a pot.
/// Each pot gets a unique mint (vault share token).
/// Mint authority = pot PDA so only the program can mint/burn.
#[derive(Accounts)]
pub struct InitTokenMint<'info> {
    #[account(
        mut,
        seeds = [b"pot", pot.name.as_bytes(), authority.key().as_ref()],
        bump = pot.pot_bump,
        has_one = authority,
    )]
    pub pot: Account<'info, PotAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [b"token_mint", pot.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = pot,
        mint::freeze_authority = pot,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitTokenMint>) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    pot.token_mint = ctx.accounts.token_mint.key();
    msg!("Vault share token mint initialized: {}", pot.token_mint);
    msg!("Pot: {} | Shares per SOL: {}", pot.name, pot.shares_per_sol);
    Ok(())
}
