use anchor_lang::prelude::*;
use crate::errors::PotError;
use crate::state::pot::Pot;
use crate::state::member::Member;
use crate::state::proposal::{Proposal, ProposalAction, ProposalStatus, VoteRecord};

// ── create_proposal ───────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub pot: Account<'info, Pot>,

    #[account(
        seeds = [b"member", pot.key().as_ref(), proposer.key().as_ref()],
        bump,
    )]
    pub member_account: Account<'info, Member>,

    #[account(
        init,
        payer = proposer,
        space = Proposal::LEN,
        seeds = [b"proposal", pot.key().as_ref(), &pot.proposal_count.to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn create_proposal(
    ctx: Context<CreateProposal>,
    action: ProposalAction,
    description: String,
) -> Result<()> {
    require!(description.len() <= Proposal::MAX_DESC_LEN, PotError::NameTooLong);

    let clock = Clock::get()?;
    let pot = &ctx.accounts.pot;
    let proposal = &mut ctx.accounts.proposal;

    pot.proposal_count += 1;

    proposal.pot = pot.key();
    proposal.proposer = ctx.accounts.proposer.key();
    proposal.action = action;
    proposal.description = description;
    proposal.votes_for = 0;
    proposal.votes_against = 0;
    proposal.status = ProposalStatus::Active;
    proposal.created_at = clock.unix_timestamp;
    proposal.expires_at = clock.unix_timestamp + pot.governance.vote_timeout_seconds;

    emit!(ProposalCreated {
        pot: pot.key(),
        proposal: proposal.key(),
        proposer: ctx.accounts.proposer.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct ProposalCreated {
    pub pot: Pubkey,
    pub proposal: Pubkey,
    pub proposer: Pubkey,
    pub timestamp: i64,
}

// ── vote ──────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Vote<'info> {
    pub pot: Account<'info, Pot>,

    #[account(
        mut,
        has_one = pot @ PotError::Unauthorized,
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(
        seeds = [b"member", pot.key().as_ref(), voter.key().as_ref()],
        bump,
    )]
    pub member_account: Account<'info, Member>,

    #[account(
        init,
        payer = voter,
        space = VoteRecord::LEN,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn vote(ctx: Context<Vote>, approve: bool) -> Result<()> {
    let clock = Clock::get()?;
    let proposal = &mut ctx.accounts.proposal;

    require!(proposal.status == ProposalStatus::Active, PotError::ProposalNotActive);
    require!(clock.unix_timestamp <= proposal.expires_at, PotError::ProposalExpired);

    if approve {
        proposal.votes_for += 1;
    } else {
        proposal.votes_against += 1;
    }

    ctx.accounts.vote_record.proposal = proposal.key();
    ctx.accounts.vote_record.voter = ctx.accounts.voter.key();
    ctx.accounts.vote_record.approved = approve;

    // Auto-resolve if quorum reached
    let pot = &ctx.accounts.pot;
    let required = pot.governance.quorum_count(pot.member_count);
    let total_votes = proposal.votes_for + proposal.votes_against;

    if total_votes >= required {
        if proposal.votes_for > proposal.votes_against {
            proposal.status = ProposalStatus::Passed;
        } else {
            proposal.status = ProposalStatus::Rejected;
        }
    }

    Ok(())
}

// ── execute_proposal ──────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub pot: Account<'info, Pot>,

    #[account(
        mut,
        has_one = pot @ PotError::Unauthorized,
    )]
    pub proposal: Account<'info, Proposal>,

    pub executor: Signer<'info>,
}

pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    require!(proposal.status == ProposalStatus::Passed, PotError::ProposalNotPassed);

    // Mark as executed — actual action dispatched by caller with remaining_accounts
    proposal.status = ProposalStatus::Executed;

    emit!(ProposalExecuted {
        pot: ctx.accounts.pot.key(),
        proposal: proposal.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct ProposalExecuted {
    pub pot: Pubkey,
    pub proposal: Pubkey,
    pub timestamp: i64,
}
