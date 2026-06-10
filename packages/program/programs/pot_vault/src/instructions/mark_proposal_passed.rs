// PotBot v2 — mark_proposal_passed
//
// Admin-only instruction that marks a Proposal-sourced strategy as passed,
// enabling execute_swap(Proposal) to proceed.
//
// Security (from 2026-04-23 audit):
//  - Only pot.authority can call. Agent authority bypass removed.
//  - Idempotent: calling again on an already-passed strategy is a no-op.
//  - Sets BOTH strategy.proposal_passed = true AND spec.passed = true
//    so execute_swap can verify both independently.

use anchor_lang::prelude::*;
use crate::state::pot::PotAccount;
use crate::state::strategy::{StrategyAccount, StrategySource};
use crate::state::proposal_swap::ProposalSwapSpec;
use crate::errors::PotError;
use crate::constants::STRATEGY_SEED;

#[derive(Accounts)]
pub struct MarkProposalPassed<'info> {
    #[account(
        mut,
        constraint = pot.key() == strategy.pot @ PotError::StrategyPotMismatch,
    )]
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        mut,
        seeds = [STRATEGY_SEED, pot.key().as_ref(), &strategy.slot_id.to_le_bytes()],
        bump = strategy.bump,
        has_one = pot @ PotError::StrategyPotMismatch,
    )]
    pub strategy: Account<'info, StrategyAccount>,

    /// The ProposalSwapSpec PDA attached to this strategy's proposal.
    /// Must match the proposal_id encoded in strategy.source.
    #[account(
        mut,
        seeds = [b"proposal_swap", proposal_swap_spec.proposal.as_ref()],
        bump = proposal_swap_spec.bump,
        has_one = pot @ PotError::ProposalMismatch,
        constraint = proposal_id_matches(&strategy, &proposal_swap_spec)
            @ PotError::ProposalMismatch,
    )]
    pub proposal_swap_spec: Account<'info, ProposalSwapSpec>,

    /// Must be pot.authority. Agent authority NOT accepted here.
    #[account(
        constraint = authority.key() == pot.authority @ PotError::StrategyNotAdmin,
    )]
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<MarkProposalPassed>) -> Result<()> {
    let strategy = &mut ctx.accounts.strategy;
    let spec = &mut ctx.accounts.proposal_swap_spec;

    // Idempotent: already passed — no-op.
    if strategy.proposal_passed && spec.passed {
        return Ok(());
    }

    // Validate this is actually a Proposal-sourced strategy.
    require!(
        matches!(strategy.source, StrategySource::Proposal { .. }),
        PotError::SwapModeMismatch
    );

    strategy.proposal_passed = true;
    spec.passed = true;

    emit!(ProposalMarkedPassed {
        pot: ctx.accounts.pot.key(),
        strategy: strategy.key(),
        proposal_id: spec.proposal_id,
        marked_by: ctx.accounts.authority.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Constraint helper: proposal_id in strategy.source must match spec.proposal_id.
fn proposal_id_matches(
    strategy: &StrategyAccount,
    spec: &ProposalSwapSpec,
) -> bool {
    match strategy.source {
        StrategySource::Proposal { proposal_id } => proposal_id == spec.proposal_id,
        _ => false,
    }
}

#[event]
pub struct ProposalMarkedPassed {
    pub pot: Pubkey,
    pub strategy: Pubkey,
    pub proposal_id: u64,
    pub marked_by: Pubkey,
    pub timestamp: i64,
}
