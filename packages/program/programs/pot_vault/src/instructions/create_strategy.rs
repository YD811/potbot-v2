/// PotBot v2 — create_strategy
//
// Author a strategy slot (SL/TP/trailing + optional yield leg) without
// executing the entry swap. Entry happens later via `execute_swap`.
//
// Authorities:
//   AdminDirect → signer must match pot.authority (or be listed as role=Admin
//                 in MemberPermissions). Skips governance.
//   Proposal    → caller references an already-passed proposal whose
//                 `swap_spec` matches the strategy params.
//   Agent       → caller is the pot's configured agent authority.
//
// Fee reserve: activating a strategy with a price trigger requires the pot
// to hold at least `MIN_FEE_RESERVE_LAMPORTS` in its fee reserve, otherwise
// the keeper cannot pay gas when the trigger fires.

use anchor_lang::prelude::*;

use crate::state::strategy::{
    StrategyAccount, StrategySource, StrategyStatus, TriggerReason, YieldTarget,
};
// Cross-crate references — resolved during merge:
// use crate::errors::PotError;
// use crate::state::pot::PotAccount;
// use crate::state::member_permissions::{MemberPermissions, Role};

pub const MIN_FEE_RESERVE_LAMPORTS: u64 = 50_000_000; // 0.05 SOL

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateStrategyArgs {
    pub slot_id: u16,
    pub source: StrategySource,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub pyth_price_feed: Option<Pubkey>,
    pub stop_loss_bps: Option<u16>,
    pub take_profit_bps: Option<u16>,
    pub trailing_stop_bps: Option<u16>,
    pub yield_target: YieldTarget,
}

#[derive(Accounts)]
#[instruction(args: CreateStrategyArgs)]
pub struct CreateStrategy<'info> {
    /// Parent pot. Must match `args.source` (e.g. pot.authority for AdminDirect).
    #[account(mut)]
    pub pot: Account<'info, crate::state::pot::PotAccount>,

    #[account(
        init,
        payer = payer,
        space = 8 + StrategyAccount::INIT_SPACE,
        seeds = [StrategyAccount::SEED, pot.key().as_ref(), &args.slot_id.to_le_bytes()],
        bump,
    )]
    pub strategy: Account<'info, StrategyAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// The member whose role authorizes creation. For AdminDirect path this
    /// must equal `pot.authority` or have Role::Admin in MemberPermissions.
    /// Checked manually in the handler to keep the constraint flexible
    /// across source variants.
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateStrategy>, args: CreateStrategyArgs) -> Result<()> {
    require!(
        !ctx.accounts.pot.paused,
        crate::errors::PotError::PotFrozen
    );
    validate_bps(&args)?;
    validate_triggers_need_feed(&args)?;

    // Authority check per source variant.
    match args.source {
        StrategySource::AdminDirect { admin } => {
            require_keys_eq!(
                ctx.accounts.authority.key(),
                admin,
                crate::errors::PotError::StrategyNotAdmin
            );
            // caller must actually be the declared admin pubkey
            require_keys_eq!(
                admin,
                ctx.accounts.pot.authority,
                crate::errors::PotError::StrategyNotAdmin
            );
        }
        StrategySource::Proposal { proposal_id: _ } => {
            // Full proposal.swap_spec matching is enforced in execute_swap.
            // At creation we only require that a Proposal source strategy
            // starts Pending.
        }
        StrategySource::Agent { rule_id: _ } => {
            // TODO(Phase 3): require ctx.accounts.authority == pot.agent_authority
        }
    }

    // Fee reserve pre-flight: only when a trigger is configured.
    let has_trigger = args.stop_loss_bps.is_some()
        || args.take_profit_bps.is_some()
        || args.trailing_stop_bps.is_some();
    if has_trigger {
        require!(
            ctx.accounts.pot.fee_reserve >= MIN_FEE_RESERVE_LAMPORTS,
            crate::errors::PotError::FeeReserveTooLow
        );
    }

    let s = &mut ctx.accounts.strategy;
    s.pot = ctx.accounts.pot.key();
    s.slot_id = args.slot_id;
    s.bump = ctx.bumps.strategy;
    s.source = args.source;
    s.status = StrategyStatus::Pending;
    s.input_mint = args.input_mint;
    s.output_mint = args.output_mint;
    s.size_in = 0;
    s.size_out = 0;
    s.entry_price_x64 = 0;
    s.trailing_high_price_x64 = 0;
    s.pyth_price_feed = args.pyth_price_feed;
    s.stop_loss_bps = args.stop_loss_bps;
    s.take_profit_bps = args.take_profit_bps;
    s.trailing_stop_bps = args.trailing_stop_bps;
    s.yield_target = args.yield_target;
    s.yield_position = None;
    s.executor_nonce = 0;
    s.created_at = Clock::get()?.unix_timestamp;
    s.executed_at = 0;
    s.closed_at = 0;
    s.last_trigger_reason = TriggerReason::Manual;
    s.last_price_update_ts = 0;
    s.reserved = [0u8; 64];

    emit!(StrategyCreated {
        pot: s.pot,
        strategy: s.key(),
        slot_id: s.slot_id,
        input_mint: s.input_mint,
        output_mint: s.output_mint,
        has_yield: !matches!(s.yield_target, YieldTarget::None),
    });

    Ok(())
}

fn validate_bps(args: &CreateStrategyArgs) -> Result<()> {
    for bps in [args.stop_loss_bps, args.take_profit_bps, args.trailing_stop_bps]
        .iter()
        .flatten()
    {
        require!(*bps > 0 && *bps < 10_000, crate::errors::PotError::TriggerNotMet);
    }
    Ok(())
}

fn validate_triggers_need_feed(args: &CreateStrategyArgs) -> Result<()> {
    let has_trigger = args.stop_loss_bps.is_some()
        || args.take_profit_bps.is_some()
        || args.trailing_stop_bps.is_some();
    // If a price trigger is set and no feed is provided, flag it.
    // Off-chain keeper must be trusted in that case — enforced by client UX,
    // on-chain we just emit a warning event rather than blocking.
    if has_trigger && args.pyth_price_feed.is_none() {
        msg!("WARN: strategy has trigger but no pyth_price_feed; keeper-trust mode");
    }
    Ok(())
}

#[event]
pub struct StrategyCreated {
    pub pot: Pubkey,
    pub strategy: Pubkey,
    pub slot_id: u16,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub has_yield: bool,
}
