use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PotError;

#[derive(Accounts)]
pub struct Vote<'info> {
    pub pot: Account<'info, PotAccount>,

    #[account(
        mut,
        has_one = pot @ PotError::UnauthorizedAccess
    )]
    pub proposal: Account<'info, ProposalAccount>,

    #[account(
        seeds = [b"member", pot.key().as_ref(), voter.key().as_ref()],
        bump = member.bump,
        constraint = member.shares > 0 @ PotError::MemberNotFound
    )]
    pub member: Account<'info, MemberAccount>,

    /// VoterRecord PDA — `init` (NOT init_if_needed) means tx fails if already exists.
    /// This is the on-chain double-vote prevention mechanism.
    #[account(
        init,
        payer = voter,
        space = 8 + VoterRecord::INIT_SPACE,
        seeds = [b"voter", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub voter_record: Account<'info, VoterRecord>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Vote>, approve: bool) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let pot = &ctx.accounts.pot;
    let member = &ctx.accounts.member;
    let clock = Clock::get()?;

    require!(proposal.status == ProposalStatus::Active, PotError::ProposalNotActive);

    // Initialise the voter record (prevents double voting at account constraint level)
    let voter_record = &mut ctx.accounts.voter_record;
    voter_record.proposal  = proposal.key();
    voter_record.voter     = ctx.accounts.voter.key();
    voter_record.voted_yes = approve;
    voter_record.voted_at  = clock.unix_timestamp;
    voter_record.bump      = ctx.bumps.voter_record;

    // Tally weighted votes
    if approve {
        proposal.yes_shares = proposal
            .yes_shares
            .checked_add(member.shares)
            .ok_or(PotError::ArithmeticOverflow)?;
    } else {
        proposal.no_shares = proposal
            .no_shares
            .checked_add(member.shares)
            .ok_or(PotError::ArithmeticOverflow)?;
    }

    // Determine governance level for this proposal type
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

    let required_bps = PotAccount::required_approval_bps(gov_level);

    // Try early resolution
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
        "Vote recorded: {} by {} ({} shares) on proposal #{}",
        if approve { "YES" } else { "NO" },
        ctx.accounts.voter.key(),
        member.shares,
        proposal.proposal_id
    );
    Ok(())
}
