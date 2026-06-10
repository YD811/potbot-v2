// PotBot v2 — pot admin instructions
//
// pause_pot / unpause_pot    — emergency kill switch
// set_allowed_mints          — configure mint allowlist + agent_authority
// set_spending_policy        — configure single_swap_cap_bps + daily_budget
// fund_fee_reserve           — deposit SOL into pot.fee_reserve for keeper gas

use anchor_lang::prelude::*;
use crate::state::pot::{PendingRiskParams, PotAccount};
use crate::errors::PotError;

// ─── Pause / Unpause ────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct PausePot<'info> {
        #[account(
                    mut,
                    constraint = authority.key() == pot.authority @ PotError::StrategyNotAdmin,
                )]
        pub pot: Box<Account<'info, PotAccount>>,
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

// ─── Set allowed mints ──────────────────────────────────────────────────────

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
        pub pot: Box<Account<'info, PotAccount>>,
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
        // Exposure counters are slot-aligned with allowed_mints — reordering
        // or replacing the list would re-attach accumulated spend to a
        // different mint (cap bypass / false block). Reset on every change.
        pot.per_mint_daily_spent = [0u64; 16];
        pot.agent_authority = args.agent_authority;
        emit!(AllowedMintsUpdated {
                    pot: pot.key(),
                    count: pot.allowed_mints_count,
                    agent_authority: pot.agent_authority,
        });
        Ok(())
}

// ─── Set spending policy ────────────────────────────────────────────────────

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
        pub pot: Box<Account<'info, PotAccount>>,
        pub authority: Signer<'info>,
}

pub fn set_spending_policy(
        ctx: Context<SetSpendingPolicy>,
        args: SetSpendingPolicyArgs,
    ) -> Result<()> {
        let pot = &mut ctx.accounts.pot;
        let now = Clock::get()?.unix_timestamp;
        // Risky-param change: tightening applies now, loosening waits out
        // risk_param_timelock_secs via pending_params.
        let target = PendingRiskParams {
                is_pending: false,
                effective_at: 0,
                trade_level: pot.governance.trade_level,
                withdraw_level: pot.governance.withdraw_level,
                max_trade_size_bps: pot.config.max_trade_size_bps,
                single_swap_cap_bps: args.single_swap_cap_bps,
                daily_budget_lamports: args.daily_budget_lamports,
                risk_param_timelock_secs: pot.risk_param_timelock_secs,
                max_asset_exposure_bps: pot.max_asset_exposure_bps,
        };
        let staged = pot.stage_or_apply_risk_params(target, now)?;
        msg!(
                "spending policy cap={}bps daily={} — {}",
                args.single_swap_cap_bps,
                args.daily_budget_lamports,
                if staged { "staged (risk-param timelock)" } else { "applied" }
        );
        Ok(())
}

// ─── Set allowed programs (protocol allowlist) ──────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SetAllowedProgramsArgs {
        /// Up to 8 program ids. Pass empty slice to clear (open mode).
        /// FOOTGUN: once non-empty, EVERY CPI target must be listed —
        /// including Jupiter v6, or every swap reverts with
        /// ProgramNotAllowed. Clients should auto-include Jupiter.
    pub programs: Vec<Pubkey>,
}

#[derive(Accounts)]
pub struct SetAllowedPrograms<'info> {
        #[account(
                    mut,
                    constraint = authority.key() == pot.authority @ PotError::StrategyNotAdmin,
                )]
        pub pot: Box<Account<'info, PotAccount>>,
        pub authority: Signer<'info>,
}

pub fn set_allowed_programs(
        ctx: Context<SetAllowedPrograms>,
        args: SetAllowedProgramsArgs,
    ) -> Result<()> {
        require!(args.programs.len() <= 8, PotError::InvalidStrategyConfig);
        let pot = &mut ctx.accounts.pot;
        pot.allowed_programs = [Pubkey::default(); 8];
        for (i, program) in args.programs.iter().enumerate() {
                    pot.allowed_programs[i] = *program;
        }
        pot.allowed_programs_count = args.programs.len() as u8;
        emit!(AllowedProgramsUpdated {
                    pot: pot.key(),
                    count: pot.allowed_programs_count,
        });
        Ok(())
}

// ─── Risk-param timelock config + asset exposure cap ────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SetRiskTimelockArgs {
        /// Seconds a loosening param change must wait. 0 = disabled.
        /// Raising the timelock applies instantly; lowering it is itself a
        /// loosening change and waits out the CURRENT timelock.
    pub risk_param_timelock_secs: i64,
        /// Max daily spend toward one asset, bps of vault. 0 = unlimited.
        /// Tightening (lower, or from 0 to bounded) applies instantly;
        /// loosening waits out the timelock together with the rest.
        pub max_asset_exposure_bps: u16,
}

#[derive(Accounts)]
pub struct SetRiskTimelock<'info> {
        #[account(
                    mut,
                    constraint = authority.key() == pot.authority @ PotError::StrategyNotAdmin,
                )]
        pub pot: Box<Account<'info, PotAccount>>,
        pub authority: Signer<'info>,
}

pub fn set_risk_timelock(
        ctx: Context<SetRiskTimelock>,
        args: SetRiskTimelockArgs,
    ) -> Result<()> {
        let pot = &mut ctx.accounts.pot;
        let now = Clock::get()?.unix_timestamp;

        // Both the timelock and the exposure cap go through the standard
        // stage-or-apply path: tightening lands instantly, loosening is
        // staged into pending_params and applied after the delay.
        let target = PendingRiskParams {
                is_pending: false,
                effective_at: 0,
                trade_level: pot.governance.trade_level,
                withdraw_level: pot.governance.withdraw_level,
                max_trade_size_bps: pot.config.max_trade_size_bps,
                single_swap_cap_bps: pot.single_swap_cap_bps,
                daily_budget_lamports: pot.daily_budget_lamports,
                risk_param_timelock_secs: args.risk_param_timelock_secs,
                max_asset_exposure_bps: args.max_asset_exposure_bps,
        };
        let staged = pot.stage_or_apply_risk_params(target, now)?;
        msg!(
                "risk timelock={}s exposure_cap={}bps — {}",
                args.risk_param_timelock_secs,
                args.max_asset_exposure_bps,
                if staged { "staged (risk-param timelock)" } else { "applied" }
        );
        Ok(())
}

// ─── Apply pending params (permissionless crank) ────────────────────────────

#[derive(Accounts)]
pub struct ApplyPendingParams<'info> {
        #[account(mut)]
        pub pot: Box<Account<'info, PotAccount>>,
        pub cranker: Signer<'info>,
}

pub fn apply_pending_params(ctx: Context<ApplyPendingParams>) -> Result<()> {
        let pot = &mut ctx.accounts.pot;
        let now = Clock::get()?.unix_timestamp;
        pot.apply_pending(now)?;
        emit!(PendingParamsApplied {
                    pot: pot.key(),
                    applied_at: now,
        });
        msg!("pending risk params applied for pot {}", pot.key());
        Ok(())
}

// ─── Fund fee reserve ───────────────────────────────────────────────────────
//
// Deposits SOL from the authority's account into pot.fee_reserve so that
// keeper nodes can pay gas when a price trigger fires.
// Minimum top-up: MIN_FEE_RESERVE_LAMPORTS (0.05 SOL) so that a single
// create_strategy with triggers cannot be gated by a dust deposit.

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct FundFeeReserveArgs {
        /// Lamports to transfer into pot.fee_reserve.
    pub amount: u64,
}

#[derive(Accounts)]
pub struct FundFeeReserve<'info> {
        #[account(
                    mut,
                    constraint = authority.key() == pot.authority @ PotError::StrategyNotAdmin,
                )]
        pub pot: Box<Account<'info, PotAccount>>,
        #[account(mut)]
        pub authority: Signer<'info>,
        pub system_program: Program<'info, System>,
}

pub fn fund_fee_reserve(
        ctx: Context<FundFeeReserve>,
        args: FundFeeReserveArgs,
    ) -> Result<()> {
        require!(args.amount > 0, PotError::InvalidStrategyConfig);

    // Transfer SOL from authority to the pot account (which holds fee_reserve).
    anchor_lang::system_program::transfer(
                CpiContext::new(
                                ctx.accounts.system_program.to_account_info(),
                                anchor_lang::system_program::Transfer {
                                                    from: ctx.accounts.authority.to_account_info(),
                                                    to: ctx.accounts.pot.to_account_info(),
                                },
                            ),
                args.amount,
            )?;

    ctx.accounts.pot.fee_reserve = ctx
            .accounts
            .pot
            .fee_reserve
            .checked_add(args.amount)
            .ok_or(error!(PotError::MathOverflow))?;

    emit!(FeeReserveFunded {
                pot: ctx.accounts.pot.key(),
                amount: args.amount,
                total: ctx.accounts.pot.fee_reserve,
    });

    Ok(())
}

// ─── Events ─────────────────────────────────────────────────────────────────

#[event]
pub struct AllowedMintsUpdated {
        pub pot: Pubkey,
        pub count: u8,
        pub agent_authority: Pubkey,
}

#[event]
pub struct FeeReserveFunded {
        pub pot: Pubkey,
        pub amount: u64,
        pub total: u64,
}

#[event]
pub struct AllowedProgramsUpdated {
        pub pot: Pubkey,
        pub count: u8,
}

#[event]
pub struct PendingParamsApplied {
        pub pot: Pubkey,
        pub applied_at: i64,
}
