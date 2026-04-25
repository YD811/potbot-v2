// PotBot v2 — ProposalSwapSpec
//
// Attached to a Proposal of kind `Swap`. On execute_swap(Proposal) we load
// this spec and the strategy, and enforce that the two match bit-for-bit:
// input_mint, output_mint, amount_in bounded by max_in, min_out floor.
// If any field drifts, we reject — so a malicious executor can't swap
// in a different direction or for a different amount after the proposal passes.
//
// PDA: [b"proposal_swap", proposal_pubkey]
// Created by attach_proposal_swap. Passed/executed flags set by
// mark_proposal_passed / execute_swap(Proposal).

use anchor_lang::prelude::*;
use crate::errors::PotError;

#[account]
#[derive(Debug)]
pub struct ProposalSwapSpec {
    pub proposal: Pubkey,
    pub pot: Pubkey,
    pub proposal_id: u64,

    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    /// Maximum input the executor may spend. Enforced on-chain: spent ≤ max_in.
    pub max_in: u64,
    /// Minimum output the executor must receive. Enforced: received ≥ min_out.
    pub min_out: u64,
    /// Maximum slippage in bps for the Jupiter route (defence-in-depth).
    pub slippage_bps: u16,
    /// Optional Pyth feed id — if set, execute_swap verifies execution price
    /// is within oracle_deviation_bps of the oracle mid at execution time.
    pub price_feed_id: Option<[u8; 32]>,
    pub oracle_deviation_bps: u16,

    /// Set to true by mark_proposal_passed. Required by execute_swap(Proposal).
    pub passed: bool,
    /// Set to true by execute_swap(Proposal). Prevents double execution.
    pub executed: bool,

    pub created_at: i64,
    pub executed_at: i64,

    pub bump: u8,
}

impl ProposalSwapSpec {
    pub const SIZE: usize = 8   // discriminator
        + 32 + 32 + 8           // proposal, pot, proposal_id
        + 32 + 32               // input_mint, output_mint
        + 8 + 8                 // max_in, min_out
        + 2                     // slippage_bps
        + 1 + 32                // Option<[u8; 32]> price_feed_id
        + 2                     // oracle_deviation_bps
        + 1 + 1                 // passed, executed
        + 8 + 8                 // created_at, executed_at
        + 1                     // bump
        + 64;                   // padding
}

/// Called from execute_swap(Proposal) to validate the attached strategy
/// parameters match the on-chain proposal spec bit-for-bit.
pub fn assert_strategy_matches_spec(
    spec: &ProposalSwapSpec,
    strategy_input: Pubkey,
    strategy_output: Pubkey,
    ix_max_in: u64,
    ix_min_out: u64,
) -> Result<()> {
    require_keys_eq!(
        spec.input_mint,
        strategy_input,
        PotError::ProposalMismatch
    );
    require_keys_eq!(
        spec.output_mint,
        strategy_output,
        PotError::ProposalMismatch
    );
    require!(ix_max_in <= spec.max_in, PotError::ProposalMismatch);
    require!(ix_min_out >= spec.min_out, PotError::ProposalMismatch);
    Ok(())
}
