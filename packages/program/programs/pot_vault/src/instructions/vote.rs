use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PotError;

#[derive(Accounts)]
pub struct Vote<'info> {
    pub pot: Account<'info, PotAccount>,

    #[account(
        mut,
        has_one = pot @ PotError::Unauthorized
    )]
    pub proposal: Account<'info, ProposalAccount>,

    #[account(
        seeds = [b"member", pot.key().as_ref(), voter.key().as_ref()],
        bump = member.bump,
        constraint = member.shares > 0 @ PotError::MemberNotFound
    )]
    pub member: Account<'info, MemberAccount>,

    pub voter: Signer<'info>,
}

pub fn handler(ctx: Context<Vote>, approve: bool) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let pot = &ctx.accounts.pot;
    let member = &ctx.accounts.member;
    let clock = Clock::get()?;

    require!(proposal.status == ProposalStatus::Active, PotError::ProposalNotActive);

    // Add votes weighted by shares
    if approve {
        proposal.yes_shares = proposal
            .yes_shares
            .checked_add(member.shares)
            .ok_or(PotError::MathOverflow)?;
    } else {
        proposal.no_shares = proposal
            .no_shares
            .checked_add(member.shares)
            .ok_or(PotError::MathOverflow)?;
    }

    // Check if proposal can be resolved
    let gov_level = match &proposal.proposal_type {
        ProposalType::Swap { .. } => pot.governance.trade_level,
        ProposalType::Withdraw { .. } => pot.governance.withdraw_level,
        ProposalType::ChangeSettings { .. } => pot.governance.settings_change_level,
        ProposalType::ChangeYield { .. } => pot.governance.yield_change_level,
    };

    let required_bps = PotAccount::required_approval_bps(gov_level);

    if let Some(new_status) = proposal.check_resolution(
        required_bps,
        pot.governance.vote_timeout_seconds,
        clock.unix_timestamp,
    ) {
        proposal.status = new_status;
        proposal.resolved_at = clock.unix_timestamp;
        msg!("Proposal {} resolved: {:?}", proposal.proposal_id, proposal.status);
    }

    msg!(
        "Vote recorded: {} by {} ({} shares)",
        if approve { "YES" } else { "NO" },
        ctx.accounts.voter.key(),
        member.shares
    );
    Ok(())
}
