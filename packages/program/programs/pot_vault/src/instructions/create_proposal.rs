use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PotError;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateProposalParams {
    pub proposal_type: ProposalType,
    pub description: String,
}

#[derive(Accounts)]
#[instruction(params: CreateProposalParams)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        init,
        payer = proposer,
        space = 8 + ProposalAccount::INIT_SPACE,
        seeds = [
            b"proposal",
            pot.key().as_ref(),
            &pot.next_proposal_id.to_le_bytes()
        ],
        bump
    )]
    pub proposal: Account<'info, ProposalAccount>,

    #[account(
        seeds = [b"member", pot.key().as_ref(), proposer.key().as_ref()],
        bump = member.bump,
        constraint = member.shares > 0 @ PotError::MemberNotFound
    )]
    pub member: Account<'info, MemberAccount>,

    /// CHECK: vault PDA — read-only, used to validate swap size vs current balance
    #[account(
        seeds = [b"vault", pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub proposer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateProposal>, params: CreateProposalParams) -> Result<()> {
    let clock = Clock::get()?;
    let pot = &mut ctx.accounts.pot;
    let vault_lamports = ctx.accounts.vault.lamports();
    let proposer_key = ctx.accounts.proposer.key();

    // ── Swap-specific validations ──────────────────────────────────────
    if let ProposalType::Swap { amount_in, .. } = &params.proposal_type {
        if pot.config.max_trade_size_bps > 0 {
            let max_trade = (vault_lamports as u128)
                .checked_mul(pot.config.max_trade_size_bps as u128)
                .ok_or(error!(PotError::ArithmeticOverflow))?
                .checked_div(10000)
                .ok_or(error!(PotError::ArithmeticOverflow))? as u64;
            require!(*amount_in <= max_trade, PotError::TradeSizeExceeded);
        }

        if let Some(agent_pk) = pot.agent_pubkey {
            if proposer_key == agent_pk {
                let cooldown_secs = 14400i64;
                require!(
                    clock.unix_timestamp - pot.agent_last_proposal_at >= cooldown_secs,
                    PotError::AgentRateLimited
                );
                if pot.agent_max_trade_bps > 0 {
                    let agent_max = (vault_lamports as u128)
                        .checked_mul(pot.agent_max_trade_bps as u128)
                        .ok_or(error!(PotError::ArithmeticOverflow))?
                        .checked_div(10000)
                        .ok_or(error!(PotError::ArithmeticOverflow))? as u64;
                    require!(*amount_in <= agent_max, PotError::TradeSizeExceeded);
                }
                pot.agent_last_proposal_at = clock.unix_timestamp;
            }
        }
    }

    // ── Initialise proposal ────────────────────────────────────────────
    let proposal = &mut ctx.accounts.proposal;
    proposal.pot                   = pot.key();
    proposal.proposal_id           = pot.next_proposal_id;
    proposal.proposer              = proposer_key;
    proposal.proposal_type         = params.proposal_type;
    proposal.description           = params.description;
    proposal.status                = ProposalStatus::Active;
    proposal.yes_shares            = 0;
    proposal.no_shares             = 0;
    proposal.total_shares_snapshot = pot.total_shares;
    proposal.created_at            = clock.unix_timestamp;
    proposal.resolved_at           = 0;
    proposal.passed_at             = 0;
    proposal.bump                  = ctx.bumps.proposal;

    // ── Governance level for auto-pass check ──────────────────────────
    let gov_level = match &proposal.proposal_type {
        ProposalType::Swap { .. }             => pot.governance.trade_level,
        ProposalType::Withdraw { .. }         => pot.governance.withdraw_level,
        ProposalType::TransferFunds { .. }    => pot.governance.withdraw_level,
        ProposalType::ChangeSettings { .. }   => pot.governance.settings_change_level,
        ProposalType::UpdateRiskConfig { .. } => pot.governance.settings_change_level,
        ProposalType::ChangeYield { .. }      => pot.governance.yield_change_level,
        ProposalType::AddMember { .. }        => pot.governance.member_change_level,
        ProposalType::RemoveMember { .. }     => pot.governance.member_change_level,
        ProposalType::SetAgent { .. }         => pot.governance.settings_change_level,
        ProposalType::TokenizePot { .. }      => pot.governance.settings_change_level,
        ProposalType::DepositToYield { .. }   => pot.governance.yield_change_level,
        ProposalType::WithdrawFromYield { .. } => pot.governance.yield_change_level,
    };

    // Auto-pass in autocracy mode when authority proposes
    if pot.is_autocracy(gov_level) && proposer_key == pot.authority {
        proposal.status      = ProposalStatus::Passed;
        proposal.passed_at   = clock.unix_timestamp; // set for timelock
        proposal.resolved_at = clock.unix_timestamp;
        msg!("Proposal {} auto-passed (autocracy)", proposal.proposal_id);
    }

    pot.next_proposal_id = pot.next_proposal_id.checked_add(1).ok_or(PotError::ArithmeticOverflow)?;
    pot.last_activity_at = clock.unix_timestamp;

    msg!("Proposal {} created in POT {}", proposal.proposal_id, pot.name);
    Ok(())
}
