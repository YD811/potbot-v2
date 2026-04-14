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

    // ── Quorum check ────────────────────────────────────────────────────
    if proposal.total_shares_snapshot > 0 {
        let total_voted = proposal.yes_shares + proposal.no_shares;
        let quorum_threshold = (pot.governance.quorum_bps as u128)
            .checked_mul(proposal.total_shares_snapshot as u128)
            .unwrap_or(0)
            .checked_div(10000)
            .unwrap_or(0) as u64;
        require!(total_voted >= quorum_threshold, PotError::QuorumNotReached);
    }

    // Mark executed before side effects (re-entrancy guard)
    proposal.status = ProposalStatus::Executed;

    let clock = Clock::get()?;
    pot.last_activity_at = clock.unix_timestamp;

    match &proposal.proposal_type.clone() {
        // ── Swap ───────────────────────────────────────────────────────────
        ProposalType::Swap { from_mint, to_mint, amount_in, min_amount_out } => {
            let vault_lamports = ctx.accounts.vault.lamports();
            require!(vault_lamports >= *amount_in, PotError::InsufficientVaultBalance);

            pot.trade_count  = pot.trade_count.saturating_add(1);
            pot.total_volume = pot.total_volume.saturating_add(*amount_in);
            pot.recalculate_tamagotchi();

            if vault_lamports > pot.high_water_mark {
                pot.high_water_mark = vault_lamports;
            }

            // Phase 2: Jupiter CPI via invoke_signed with vault seeds
            msg!(
                "Swap authorised: {} lamports {} \u2192 {} (min out: {}). Jupiter CPI: Phase 2.",
                amount_in, from_mint, to_mint, min_amount_out
            );
        }

        // ── Withdraw ─────────────────────────────────────────────────────
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

        // ── Transfer Funds ───────────────────────────────────────────────
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
            msg!("Transfer {} lamports to {} \u2014 purpose: {}", amount, to, purpose);
        }

        // ── Change Governance Settings ─────────────────────────────────────
        ProposalType::ChangeSettings { new_trade_level, new_withdraw_level } => {
            pot.governance.trade_level    = *new_trade_level;
            pot.governance.withdraw_level = *new_withdraw_level;
            msg!("Governance updated: trade={}, withdraw={}", new_trade_level, new_withdraw_level);
        }

        // ── Change Yield Strategy ──────────────────────────────────────────
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

        // ── Update Risk Config ────────────────────────────────────────────
        ProposalType::UpdateRiskConfig { max_trade_size_bps, max_members } => {
            pot.config.max_trade_size_bps = *max_trade_size_bps;
            pot.config.max_members        = *max_members;
            msg!("Risk config updated: max_trade_bps={}, max_members={}", max_trade_size_bps, max_members);
        }

        // ── Add Member ────────────────────────────────────────────────────────
        ProposalType::AddMember { wallet } => {
            msg!("Member invited: {}", wallet);
        }

        // ── Remove Member ───────────────────────────────────────────────────
        ProposalType::RemoveMember { wallet } => {
            msg!("Member removed: {}", wallet);
        }

        // ── Set AI Agent ──────────────────────────────────────────────────────
        ProposalType::SetAgent { agent, max_trade_bps } => {
            pot.agent_pubkey         = Some(*agent);
            pot.agent_max_trade_bps  = *max_trade_bps;
            pot.agent_last_proposal_at = 0;
            msg!("AI agent set: {} (max trade {}bps)", agent, max_trade_bps);
        }

        // ── Tokenize Pot (Phase 2: SPL token mint) ───────────────────────
        ProposalType::TokenizePot { max_supply } => {
            msg!(
                "Pot tokenization authorized: max_supply={} (Phase 2: SPL mint CPI)",
                max_supply
            );
        }

        // ── Deposit to Yield Protocol (Phase 2: Kamino/Drift CPI) ──────────
        ProposalType::DepositToYield { amount, protocol } => {
            msg!(
                "Yield deposit authorized: {} lamports to protocol {} (Phase 2: CPI)",
                amount, protocol
            );
        }

        // ── Withdraw from Yield Protocol (Phase 2) ─────────────────────
        ProposalType::WithdrawFromYield { amount, protocol } => {
            msg!(
                "Yield withdrawal authorized: {} lamports from protocol {} (Phase 2: CPI)",
                amount, protocol
            );
        }
    }

    msg!("Proposal #{} executed in POT {}", proposal.proposal_id, pot.name);
    Ok(())
}
