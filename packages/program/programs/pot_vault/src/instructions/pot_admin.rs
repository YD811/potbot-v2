// PotBot v2 — pot admin instructions
//
// pause_pot / unpause_pot    — emergency kill switch
// set_allowed_mints          — configure mint allowlist + agent_authority
// set_spending_policy        — configure single_swap_cap_bps + daily_budget

use anchor_lang::prelude::*;
use crate::state::pot::PotAccount;
use crate::errors::PotError;

// ─── Pause / Unpause ──────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct PausePot<'info> {
    #[account(
        mut,
        constraint = authority.key() == pot.authority @ PotError::StrategyNotAdmin,
    )]
    pub pot: Account<'info, PotAccount>,
    pub authority: Signer<'info>,
}

pub fn pause_pot(ctx: Context<PausePot>) -> Result<()> {
    ctx.accounts.pot.paused = true;
    msg!("pot {} paused", ctx.accounts.pot.key());
    Ok(())
}

pub fn unpause_pot(ctx: Context<PausePot>) -> Result<()> {
    ctx.accounts.pot.paused = false;
    msg!("pot {} unpaused", ctx.accounts.pot.key());
    Ok(())
}

// ─── Set allowed mints ────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SetAllowedMintsArgs {
    /// Up to 16 mints. Pass empty slice to clear the allowlist (open mode).
    pub mints: Vec<Pubkey>,
    /// Keeper agent authority for StrategyTrigger mode.
    pub agent_authority: Pubkey,
}

#[derive(Accounts)]
pub struct SetAllowedMints<'info> {
    #[account(
        mut,
        constraint = authority.key() == pot.authority @ PotError::StrategyNotAdmin,
    )]
    pub pot: Account<'info, PotAccount>,
    pub authority: Signer<'info>,
}

pub fn set_allowed_mints(
    ctx: Context<SetAllowedMints>,
    args: SetAllowedMintsArgs,
) -> Result<()> {
    require!(args.mints.len() <= 16, PotError::InvalidStrategyConfig);

    let pot = &mut ctx.accounts.pot;
    pot.allowed_mints = [Pubkey::default(); 16];
    for (i, mint) in args.mints.iter().enumerate() {
        pot.allowed_mints[i] = *mint;
    }
    pot.allowed_mints_count = args.mints.len() as u8;
    pot.agent_authority = args.agent_authority;

    emit!(AllowedMintsUpdated {
        pot: pot.key(),
        count: pot.allowed_mints_count,
        agent_authority: pot.agent_authority,
    });

    Ok(())
}

// ─── Set spending policy ──────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SetSpendingPolicyArgs {
    /// Max single swap as bps of vault balance (0 = unlimited).
    pub single_swap_cap_bps: u16,
    /// Max lamports per UTC day across all strategies (0 = unlimited).
    pub daily_budget_lamports: u64,
}

#[derive(Accounts)]
pub struct SetSpendingPolicy<'info> {
    #[account(
        mut,
        constraint = authority.key() == pot.authority @ PotError::StrategyNotAdmin,
    )]
    pub pot: Account<'info, PotAccount>,
    pub authority: Signer<'info>,
}

pub fn set_spending_policy(
    ctx: Context<SetSpendingPolicy>,
    args: SetSpendingPolicyArgs,
) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    pot.single_swap_cap_bps = args.single_swap_cap_bps;
    pot.daily_budget_lamports = args.daily_budget_lamports;
    Ok(())
}

// ─── Events ───────────────────────────────────────────────────────────────

#[event]
pub struct AllowedMintsUpdated {
    pub pot: Pubkey,
    pub count: u8,
    pub agent_authority: Pubkey,
}
