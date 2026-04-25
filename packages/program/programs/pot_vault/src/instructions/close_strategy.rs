// PotBot v2 — close_strategy
//
// Close a Pending or Closed StrategyAccount and reclaim rent to the authority.
// Active and Parked strategies CANNOT be closed — the caller must execute
// the exit swap first (Active → Closed) or panic-exit (Parked → Closed).
//
// Authority: pot.authority only (Phase 1). Phase 3 will add any member.

use anchor_lang::prelude::*;
use crate::state::pot::PotAccount;
use crate::state::strategy::{StrategyAccount, StrategyStatus};
use crate::errors::PotError;
use crate::constants::STRATEGY_SEED;

#[derive(Accounts)]
pub struct CloseStrategy<'info> {
    #[account(
        mut,
        constraint = pot.key() == strategy.pot @ PotError::StrategyPotMismatch,
    )]
    pub pot: Account<'info, PotAccount>,

    #[account(
        mut,
        close = authority,
        seeds = [STRATEGY_SEED, pot.key().as_ref(), &strategy.slot_id.to_le_bytes()],
        bump = strategy.bump,
        has_one = pot @ PotError::StrategyPotMismatch,
    )]
    pub strategy: Account<'info, StrategyAccount>,

    /// Receives the reclaimed rent lamports.
    #[account(
        mut,
        constraint = authority.key() == pot.authority @ PotError::StrategyNotAdmin,
    )]
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<CloseStrategy>) -> Result<()> {
    let strategy = &ctx.accounts.strategy;

    // Only Pending (never executed) or Closed (exit swap done) strategies
    // can be cleaned up. Active and Parked have live capital at risk.
    require!(
        matches!(strategy.status, StrategyStatus::Pending | StrategyStatus::Closed),
        PotError::StrategyInactive
    );

    emit!(StrategyClosed {
        pot: ctx.accounts.pot.key(),
        strategy: strategy.key(),
        slot_id: strategy.slot_id,
        closed_by: ctx.accounts.authority.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    // Anchor closes the account and transfers lamports to `authority`
    // via the `close = authority` constraint above.
    Ok(())
}

#[event]
pub struct StrategyClosed {
    pub pot: Pubkey,
    pub strategy: Pubkey,
    pub slot_id: u16,
    pub closed_by: Pubkey,
    pub timestamp: i64,
}
