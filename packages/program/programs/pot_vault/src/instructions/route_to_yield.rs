// PotBot v2 — route_to_yield (Phase 4 stub)
//
// EMIT-ONLY stub: validates governance/allocation guards, emits a YieldRouted
// event, and does NOT perform any external CPI yet. Real Kamino / Meteora
// integrations land in Phase 4 — this stub locks in the on-chain interface so
// the SDK and UI can ship today.
//
// Mapping (canonical 4-variant YieldStrategy enum):
//   Conservative -> Kamino
//   Balanced     -> MeteoraStable
//   Aggressive   -> MeteoraDynamic
//
// The handler enforces:
//   - admin-only (signer == pot.authority)
//   - YieldRouteTarget matches pot.config.yield_strategy
//   - amount <= max_yield_allocation_bps of vault.lamports()
//
// When Phase 4 lands, replace the `// CPI placeholder` block with the real
// CPI call; everything else stays.
//
// NOTE: named `YieldRouteTarget` (not `YieldTarget`) to avoid collision with
// the on-chain `state::strategy::YieldTarget` enum, which has different
// variants and is stored on `StrategyAccount`. Anchor's IDL generator
// rejects two pub types with the same name in one program.

use anchor_lang::prelude::*;

use crate::constants::VAULT_SEED;
use crate::errors::PotError;
use crate::state::pot::{PotAccount, YieldStrategy};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum YieldRouteTarget {
    Kamino,
    MeteoraStable,
    MeteoraDynamic,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RouteToYieldArgs {
    pub amount_lamports: u64,
    pub yield_target: YieldRouteTarget,
}

#[derive(Accounts)]
pub struct RouteToYield<'info> {
    #[account(
        mut,
        constraint = !pot.paused @ PotError::StrategyInactive,
        has_one = authority @ PotError::StrategyNotAdmin,
    )]
    pub pot: Account<'info, PotAccount>,

    /// CHECK: vault PDA. Read-only here — the stub doesn't move SOL yet.
    #[account(
        seeds = [VAULT_SEED, pot.key().as_ref()],
        bump = pot.vault_bump,
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<RouteToYield>, args: RouteToYieldArgs) -> Result<()> {
    require!(args.amount_lamports > 0, PotError::InvalidAmount);

    let pot_key = ctx.accounts.pot.key();
    let vault_lamports = ctx.accounts.vault.lamports();

    // Yield target must align with the pot's configured strategy.
    {
        let pot = &ctx.accounts.pot;
        let aligned = matches!(
            (&args.yield_target, &pot.config.yield_strategy),
            (YieldRouteTarget::Kamino, YieldStrategy::Conservative)
                | (YieldRouteTarget::MeteoraStable, YieldStrategy::Balanced)
                | (YieldRouteTarget::MeteoraDynamic, YieldStrategy::Aggressive)
        );
        require!(aligned, PotError::InvalidYieldStrategy);

        // Allocation cap: amount <= vault * max_yield_allocation_bps / 10_000.
        let cap_bps = pot.config.max_yield_allocation_bps as u128;
        require!(cap_bps > 0, PotError::InvalidYieldStrategy);
        let cap = (vault_lamports as u128)
            .checked_mul(cap_bps)
            .ok_or(error!(PotError::MathOverflow))?
            / 10_000u128;
        require!(
            (args.amount_lamports as u128) <= cap,
            PotError::ExceedsYieldAllocation
        );
    }

    // CPI placeholder — Phase 4 wires Kamino / Meteora here.
    msg!(
        "route_to_yield STUB: target={:?} amount={} pot={}",
        args.yield_target,
        args.amount_lamports,
        pot_key
    );

    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.pot.last_activity_at = now;

    emit!(YieldRouted {
        pot: pot_key,
        target: args.yield_target,
        amount: args.amount_lamports,
        executed: false, // stub — no real CPI yet
        timestamp: now,
    });

    Ok(())
}

#[event]
pub struct YieldRouted {
    pub pot: Pubkey,
    pub target: YieldRouteTarget,
    pub amount: u64,
    pub executed: bool,
    pub timestamp: i64,
}