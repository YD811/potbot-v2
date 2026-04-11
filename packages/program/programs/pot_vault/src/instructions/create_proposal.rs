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
    pub pot: Account<'info, PotAccount>,

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

    #[account(mut)]
    pub proposer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateProposal>, params: CreateProposalParams) -> Result<()> {
    let clock = Clock::get()?;
    let pot = &mut ctx.accounts.pot;
    let proposal = &mut ctx.accounts.proposal;

    proposal.pot = pot.key();
    proposal.proposal_id = pot.next_proposal_id;
    proposal.proposer = ctx.accounts.proposer.key();
    proposal.proposal_type = params.proposal_type;
    proposal.description = params.description;
    proposal.status = ProposalStatus::Active;
    proposal.yes_shares = 0;
    proposal.no_shares = 0;
    proposal.total_shares_snapshot = pot.total_shares;
    proposal.created_at = clock.unix_timestamp;
    proposal.resolved_at = 0;
    proposal.bump = ctx.bumps.proposal;

    // If autocracy and proposer is authority, auto-pass
    let gov_level = match &proposal.proposal_type {
        ProposalType::Swap { .. } => pot.governance.trade_level,
        ProposalType::Withdraw { .. } => pot.governance.withdraw_level,
        ProposalType::ChangeSettings { .. } => pot.governance.settings_change_level,
        ProposalType::ChangeYield { .. } => pot.governance.yield_change_level,
    };

    if pot.is_autocracy(gov_level) && ctx.accounts.proposer.key() == pot.authority {
        proposal.status = ProposalStatus::Passed;
        proposal.resolved_at = clock.unix_timestamp;
        msg!("Proposal {} auto-passed (autocracy)", proposal.proposal_id);
    }

    pot.next_proposal_id = pot.next_proposal_id.checked_add(1).ok_or(PotError::MathOverflow)?;

    msg!(
        "Proposal {} created in POT {}",
        proposal.proposal_id,
        pot.name
    );
    Ok(())
}
