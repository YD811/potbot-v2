use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::PotError;

/// Move `amount` lamports out of the vault PDA via a seeds-signed system
/// transfer. Direct lamport debits are rejected by the runtime because the
/// vault is owned by the System program, not by this program.
fn vault_transfer<'info>(
    vault: &SystemAccount<'info>,
    recipient: &UncheckedAccount<'info>,
    system_program: &Program<'info, System>,
    pot_key: &Pubkey,
    vault_bump: u8,
    amount: u64,
) -> Result<()> {
    let bump = [vault_bump];
    let signer_seeds: &[&[u8]] = &[b"vault", pot_key.as_ref(), &bump];
    system_program::transfer(
        CpiContext::new_with_signer(
            system_program.to_account_info(),
            system_program::Transfer {
                from: vault.to_account_info(),
                to: recipient.to_account_info(),
            },
            &[signer_seeds],
        ),
        amount,
    )
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(
        mut,
        constraint = !pot.paused @ PotError::PotFrozen,
    )]
    pub pot: Box<Account<'info, PotAccount>>,

    /// CHECK: PDA vault
    #[account(
        mut,
        seeds = [b"vault", pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        has_one = pot @ PotError::UnauthorizedAccess,
    )]
    pub proposal: Account<'info, ProposalAccount>,

    #[account(mut)]
    pub executor: Signer<'info>,

    /// Destination for fund-moving proposals (Withdraw / TransferFunds).
    /// MUST equal the beneficiary recorded in the proposal — the executor
    /// only cranks the instruction, funds never flow to the executor.
    /// CHECK: validated in the handler against the proposal payload.
    #[account(mut)]
    pub recipient: Option<UncheckedAccount<'info>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecuteProposal>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let pot      = &mut ctx.accounts.pot;

    require!(proposal.status == ProposalStatus::Passed, PotError::ProposalNotPassed);

    // ── Quorum check ──────────────────────────────────────────────────────
    if proposal.total_shares_snapshot > 0 {
        let total_voted = proposal.yes_shares + proposal.no_shares;
        let quorum_threshold = (pot.governance.quorum_bps as u128)
            .saturating_mul(proposal.total_shares_snapshot as u128)
            .checked_div(10000)
            .unwrap_or(0) as u64;
        require!(total_voted >= quorum_threshold, PotError::QuorumNotReached);
    }

    // ── Timelock check ────────────────────────────────────────────────────
    // If timelock_seconds > 0 and proposal has a passed_at timestamp,
    // enforce the delay. Autocracy (passed_at == created_at) can still
    // be subject to timelock if the pot owner configured one.
    let clock = Clock::get()?;
    if pot.governance.timelock_seconds > 0 && proposal.passed_at > 0 {
        require!(
            clock.unix_timestamp >= proposal.passed_at + pot.governance.timelock_seconds,
            PotError::TimelockNotExpired
        );
    }

    proposal.status = ProposalStatus::Executed;
    pot.last_activity_at = clock.unix_timestamp;

    match &proposal.proposal_type.clone() {
        ProposalType::Swap { from_mint, to_mint, amount_in, min_amount_out } => {
            let vault_lamports = ctx.accounts.vault.lamports();
            require!(vault_lamports >= *amount_in, PotError::InsufficientVaultBalance);
            pot.trade_count  = pot.trade_count.saturating_add(1);
            pot.total_volume = pot.total_volume.saturating_add(*amount_in);
            pot.recalculate_tamagotchi();
            if vault_lamports > pot.high_water_mark {
                pot.high_water_mark = vault_lamports;
            }
            msg!("Swap authorised: {} lamports {} -> {} (min out: {}). Jupiter CPI: Phase 2.",
                amount_in, from_mint, to_mint, min_amount_out);
        }

        ProposalType::Withdraw { beneficiary, amount } => {
            let recipient = ctx
                .accounts
                .recipient
                .as_ref()
                .ok_or(PotError::RecipientMissing)?;
            require_keys_eq!(recipient.key(), *beneficiary, PotError::RecipientMismatch);
            let vault_lamports = ctx.accounts.vault.lamports();
            let rent = Rent::get()?;
            let min_balance = rent.minimum_balance(0);
            require!(
                vault_lamports.saturating_sub(*amount) >= min_balance,
                PotError::InsufficientVaultBalance
            );
            vault_transfer(
                &ctx.accounts.vault,
                recipient,
                &ctx.accounts.system_program,
                &pot.key(),
                pot.vault_bump,
                *amount,
            )?;
            msg!("Governance withdrawal: {} lamports to {}", amount, beneficiary);
        }

        ProposalType::TransferFunds { to, amount, purpose } => {
            let recipient = ctx
                .accounts
                .recipient
                .as_ref()
                .ok_or(PotError::RecipientMissing)?;
            require_keys_eq!(recipient.key(), *to, PotError::RecipientMismatch);
            let vault_lamports = ctx.accounts.vault.lamports();
            let rent = Rent::get()?;
            let min_balance = rent.minimum_balance(0);
            require!(
                vault_lamports.saturating_sub(*amount) >= min_balance,
                PotError::InsufficientVaultBalance
            );
            vault_transfer(
                &ctx.accounts.vault,
                recipient,
                &ctx.accounts.system_program,
                &pot.key(),
                pot.vault_bump,
                *amount,
            )?;
            msg!("Transfer {} lamports to {} - purpose: {}", amount, to, purpose);
        }

        ProposalType::ChangeSettings { new_trade_level, new_withdraw_level } => {
            // Risky-param change: tightening applies now, loosening waits
            // out risk_param_timelock_secs via pending_params.
            let target = PendingRiskParams {
                is_pending: false,
                effective_at: 0,
                trade_level: *new_trade_level,
                withdraw_level: *new_withdraw_level,
                max_trade_size_bps: pot.config.max_trade_size_bps,
                single_swap_cap_bps: pot.single_swap_cap_bps,
                daily_budget_lamports: pot.daily_budget_lamports,
                risk_param_timelock_secs: pot.risk_param_timelock_secs,
            };
            let staged = pot.stage_or_apply_risk_params(target, clock.unix_timestamp)?;
            msg!(
                "Governance change trade={}, withdraw={} — {}",
                new_trade_level, new_withdraw_level,
                if staged { "staged (risk-param timelock)" } else { "applied" }
            );
        }

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

        ProposalType::UpdateRiskConfig { max_trade_size_bps, max_members } => {
            // max_members is not a fund-risk parameter — applies immediately.
            pot.config.max_members = *max_members;
            let target = PendingRiskParams {
                is_pending: false,
                effective_at: 0,
                trade_level: pot.governance.trade_level,
                withdraw_level: pot.governance.withdraw_level,
                max_trade_size_bps: *max_trade_size_bps,
                single_swap_cap_bps: pot.single_swap_cap_bps,
                daily_budget_lamports: pot.daily_budget_lamports,
                risk_param_timelock_secs: pot.risk_param_timelock_secs,
            };
            let staged = pot.stage_or_apply_risk_params(target, clock.unix_timestamp)?;
            msg!(
                "Risk config max_trade_bps={}, max_members={} — {}",
                max_trade_size_bps, max_members,
                if staged { "staged (risk-param timelock)" } else { "applied" }
            );
        }

        ProposalType::AddMember { wallet }   => { msg!("Member invited: {}", wallet); }
        ProposalType::RemoveMember { wallet } => { msg!("Member removed: {}", wallet); }

        ProposalType::SetAgent { agent, max_trade_bps } => {
            pot.agent_pubkey           = Some(*agent);
            pot.agent_max_trade_bps    = *max_trade_bps;
            pot.agent_last_proposal_at = 0;
            msg!("AI agent set: {} (max trade {}bps)", agent, max_trade_bps);
        }

        ProposalType::TokenizePot { max_supply } => {
            msg!("Pot tokenization authorized: max_supply={} (Phase 2)", max_supply);
        }

        ProposalType::DepositToYield { amount, protocol } => {
            msg!("Yield deposit authorized: {} lamports to protocol {} (Phase 2)", amount, protocol);
        }

        ProposalType::WithdrawFromYield { amount, protocol } => {
            msg!("Yield withdrawal authorized: {} lamports from protocol {} (Phase 2)", amount, protocol);
        }
    }

    msg!("Proposal #{} executed in POT {}", proposal.proposal_id, pot.name);
    Ok(())
}
