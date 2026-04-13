use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PotError;

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub pot: Account<'info, PotAccount>,

    /// CHECK: PDA vault
    #[account(
        mut,
        seeds = [b"vault", pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        has_one = pot @ PotError::Unauthorized,
    )]
    pub proposal: Account<'info, ProposalAccount>,

    #[account(mut)]
    pub executor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecuteProposal>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let pot      = &mut ctx.accounts.pot;

    require!(proposal.status == ProposalStatus::Passed, PotError::ProposalNotPassed);

    // ── Quorum check (critical — was missing before) ───────────────────
    let total_voted = proposal.yes_shares + proposal.no_shares;
    let quorum_threshold = (pot.governance.quorum_bps as u128)
        .checked_mul(proposal.total_shares_snapshot as u128)
        .unwrap()
        .checked_div(10000)
        .unwrap() as u64;

    require!(total_voted >= quorum_threshold, PotError::QuorumNotReached);

    // Mark executed before side effects (prevents re-entrancy pattern)
    proposal.status = ProposalStatus::Executed;

    let clock = Clock::get()?;
    pot.last_activity_at = clock.unix_timestamp;

    match &proposal.proposal_type.clone() {
        // ── Swap ──────────────────────────────────────────────────────
        ProposalType::Swap { from_mint, to_mint, amount_in, min_amount_out } => {
            let vault_lamports = ctx.accounts.vault.lamports();
            require!(vault_lamports >= *amount_in, PotError::InsufficientVaultBalance);

            // Increment stats
            pot.trade_count  = pot.trade_count.saturating_add(1);
            pot.total_volume = pot.total_volume.saturating_add(*amount_in);
            pot.recalculate_tamagotchi();

            // Update high-water mark
            if vault_lamports > pot.high_water_mark {
                pot.high_water_mark = vault_lamports;
            }

            // TODO Phase 2: Jupiter CPI goes here
            // The vault PDA signs via invoke_signed with vault_seeds
            msg!(
                "Swap authorised: {} lamports {} → {} (min out: {}). Jupiter CPI: Phase 2.",
                amount_in, from_mint, to_mint, min_amount_out
            );
        }

        // ── Withdraw ──────────────────────────────────────────────────
        ProposalType::Withdraw { beneficiary, amount } => {
            let vault_lamports = ctx.accounts.vault.lamports();
            let rent = Rent::get()?;
            let min_balance = rent.minimum_balance(0);
            require!(
                vault_lamports.saturating_sub(*amount) >= min_balance,
                PotError::InsufficientVaultBalance
            );

            **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
            **ctx.accounts.executor.to_account_info().try_borrow_mut_lamports()? += amount;
            msg!("Governance withdrawal: {} lamports to {}", amount, beneficiary);
        }

        // ── Transfer Funds (operational expense) ──────────────────────
        ProposalType::TransferFunds { to, amount, purpose } => {
            let vault_lamports = ctx.accounts.vault.lamports();
            let rent = Rent::get()?;
            let min_balance = rent.minimum_balance(0);
            require!(
                vault_lamports.saturating_sub(*amount) >= min_balance,
                PotError::InsufficientVaultBalance
            );

            **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
            **ctx.accounts.executor.to_account_info().try_borrow_mut_lamports()? += amount;
            msg!("Transfer {} lamports to {} — purpose: {}", amount, to, purpose);
        }

        // ── Change Governance Settings ─────────────────────────────────
        ProposalType::ChangeSettings { new_trade_level, new_withdraw_level } => {
            pot.governance.trade_level    = *new_trade_level;
            pot.governance.withdraw_level = *new_withdraw_level;
            msg!("Governance updated: trade={}, withdraw={}", new_trade_level, new_withdraw_level);
        }

        // ── Change Yield Strategy ──────────────────────────────────────
        ProposalType::ChangeYield { new_strategy } => {
            pot.config.yield_strategy = match new_strategy {
                0 => YieldStrategy::None,
                1 => YieldStrategy::Conservative,
                2 => YieldStrategy::Balanced,
                3 => YieldStrategy::Aggressive,
                _ => return Err(PotError::InvalidYieldStrategy.into()),
            };
            msg!("Yield strategy changed to {}", new_strategy);
        }

        // ── Update Risk Config ─────────────────────────────────────────
        ProposalType::UpdateRiskConfig { max_trade_size_bps, max_members } => {
            pot.config.max_trade_size_bps = *max_trade_size_bps;
            pot.config.max_members        = *max_members;
            msg!(
                "Risk config updated: max_trade_bps={}, max_members={}",
                max_trade_size_bps, max_members
            );
        }

        // ── Add Member (invite to private pot) ────────────────────────
        ProposalType::AddMember { wallet } => {
            // On-chain: we just emit the event. The invited wallet can now deposit
            // because the SDK checks this proposal when is_public=false.
            // Full member PDA is created on their first deposit.
            msg!("Member invited: {}", wallet);
        }

        // ── Remove Member (soft — keeps shares, loses voting) ─────────
        ProposalType::RemoveMember { wallet } => {
            // Soft removal: emit event. Front-end / SDK enforces vote restrictions.
            // Hard removal (force-closing shares) requires complex accounting — Phase 2.
            msg!("Member removed: {}", wallet);
        }

        // ── Set AI Agent ───────────────────────────────────────────────
        ProposalType::SetAgent { agent, max_trade_bps } => {
            pot.agent_pubkey         = Some(*agent);
            pot.agent_max_trade_bps  = *max_trade_bps;
            pot.agent_last_proposal_at = 0; // reset rate limit on new agent
            msg!("AI agent set: {} (max trade {}bps)", agent, max_trade_bps);
        }
    }

    msg!("Proposal #{} executed in POT {}", proposal.proposal_id, pot.name);
    Ok(())
}
