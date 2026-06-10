use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PotError;

/// `vote_as_delegate` — same effect as `vote`, but signed by a registered
/// MemberDelegate on behalf of the original member. The vote weight comes
/// from `member.shares` (not the delegate). VoterRecord is keyed by the
/// member's wallet so a delegate AND the member cannot both vote on the
/// same proposal.
#[derive(Accounts)]
pub struct VoteAsDelegate<'info> {
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        mut,
        has_one = pot @ PotError::UnauthorizedAccess
    )]
    pub proposal: Account<'info, ProposalAccount>,

    /// Active delegate registration: signer must equal `delegate.delegate`,
    /// `revoked_at == 0`, `pot` matches.
    #[account(
        seeds = [b"delegate", pot.key().as_ref(), member.wallet.as_ref()],
        bump = delegate_account.bump,
        constraint = delegate_account.delegate == delegate_signer.key() @ PotError::UnauthorizedAccess,
        constraint = delegate_account.revoked_at == 0 @ PotError::UnauthorizedAccess,
        constraint = delegate_account.pot == pot.key() @ PotError::UnauthorizedAccess,
    )]
    pub delegate_account: Account<'info, MemberDelegate>,

    #[account(
        seeds = [b"member", pot.key().as_ref(), member.wallet.as_ref()],
        bump = member.bump,
        constraint = member.shares > 0 @ PotError::MemberNotFound,
    )]
    pub member: Account<'info, MemberAccount>,

    /// VoterRecord PDA — keyed by member.wallet (NOT delegate_signer.key).
    /// `init` (not `init_if_needed`) → fails if the member or any prior
    /// delegate already voted on this proposal. Same double-vote prevention
    /// as the original `vote` instruction.
    #[account(
        init,
        payer = delegate_signer,
        space = 8 + VoterRecord::INIT_SPACE,
        seeds = [b"voter", proposal.key().as_ref(), member.wallet.as_ref()],
        bump,
    )]
    pub voter_record: Account<'info, VoterRecord>,

    #[account(mut)]
    pub delegate_signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<VoteAsDelegate>, approve: bool) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let pot = &ctx.accounts.pot;
    let member = &ctx.accounts.member;
    let clock = Clock::get()?;

    require!(proposal.status == ProposalStatus::Active, PotError::ProposalNotActive);

    // Initialise the voter record (prevents double voting at account constraint level)
    let voter_record = &mut ctx.accounts.voter_record;
    voter_record.proposal  = proposal.key();
    voter_record.voter     = member.wallet;  // record the original member, not the delegate
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
        ProposalType::Swap { .. }              => pot.governance.trade_level,
        ProposalType::Withdraw { .. }          => pot.governance.withdraw_level,
        ProposalType::TransferFunds { .. }     => pot.governance.withdraw_level,
        ProposalType::ChangeSettings { .. }    => pot.governance.settings_change_level,
        ProposalType::UpdateRiskConfig { .. }  => pot.governance.settings_change_level,
        ProposalType::ChangeYield { .. }       => pot.governance.yield_change_level,
        ProposalType::AddMember { .. }         => pot.governance.member_change_level,
        ProposalType::RemoveMember { .. }      => pot.governance.member_change_level,
        ProposalType::SetAgent { .. }          => pot.governance.settings_change_level,
        ProposalType::TokenizePot { .. }       => pot.governance.settings_change_level,
        ProposalType::DepositToYield { .. }    => pot.governance.yield_change_level,
        ProposalType::WithdrawFromYield { .. } => pot.governance.yield_change_level,
    };

    let required_bps = PotAccount::required_approval_bps(gov_level);

    if let Some(new_status) = proposal.check_resolution(
        required_bps,
        pot.governance.vote_timeout_seconds,
        clock.unix_timestamp,
    ) {
        if new_status == ProposalStatus::Passed {
            proposal.passed_at = clock.unix_timestamp;
        }
        proposal.status = new_status;
        proposal.resolved_at = clock.unix_timestamp;
        msg!("Proposal {} resolved: {:?}", proposal.proposal_id, proposal.status);
    }

    msg!(
        "Delegate vote: {} by delegate {} for member {} ({} shares) on proposal #{}",
        if approve { "YES" } else { "NO" },
        ctx.accounts.delegate_signer.key(),
        member.wallet,
        member.shares,
        proposal.proposal_id
    );
    Ok(())
}
