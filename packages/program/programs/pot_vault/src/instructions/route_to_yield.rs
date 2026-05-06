use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::state::strategy::YieldTarget;
use crate::state::PotAccount;

#[derive(Accounts)]
pub struct RouteToYield<'info> {
    #[account(
        mut,
        seeds = [b"pot", pot.authority.as_ref(), pot.name.as_bytes()],
        bump = pot.pot_bump,
        has_one = authority @ ErrorCode::UnauthorizedAccess,
    )]
    pub pot: Account<'info, PotAccount>,

    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<RouteToYield>, target: YieldTarget, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidBurnAmount);
    require!(
        !matches!(target, YieldTarget::None),
        ErrorCode::YieldTargetNoneNotRoutable
    );

    let clock = Clock::get()?;

    emit!(RouteToYieldEvent {
        pot: ctx.accounts.pot.key(),
        target,
        amount,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "route_to_yield: pot={} amount={} (emit-only stub, Phase 4)",
        ctx.accounts.pot.key(),
        amount
    );

    Ok(())
}

#[event]
pub struct RouteToYieldEvent {
    pub pot: Pubkey,
    pub target: YieldTarget,
    pub amount: u64,
    pub timestamp: i64,
}
