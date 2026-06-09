// PotBot v2 — sentinel / guardian role (Phase A security hardening)
//
// set_sentinel       — authority assigns or clears the sentinel wallet
// freeze_pot         — sentinel OR authority halts the pot (paused = true)
// unfreeze_pot       — authority ONLY resumes the pot
// cancel_proposal    — sentinel, authority, or proposer kills a proposal
//
// Invariant: the sentinel has NO instruction that can move funds. It can
// only stop things (freeze, cancel). Withdrawals by members stay open even
// while frozen — non-custodial exit is never blocked.

use anchor_lang::prelude::*;
use crate::state::pot::PotAccount;
use crate::state::proposal::{ProposalAccount, ProposalStatus};
use crate::errors::PotError;

// ─── Set sentinel ───────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct SetSentinel<'info> {
    #[account(
        mut,
        constraint = authority.key() == pot.authority @ PotError::UnauthorizedAccess,
    )]
    pub pot: Account<'info, PotAccount>,
    pub authority: Signer<'info>,
}

pub fn set_sentinel(ctx: Context<SetSentinel>, new_sentinel: Option<Pubkey>) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    pot.sentinel = new_sentinel;
    emit!(SentinelUpdated {
        pot: pot.key(),
        sentinel: new_sentinel,
    });
    msg!("sentinel for pot {} set to {:?}", pot.key(), new_sentinel);
    Ok(())
}

// ─── Freeze / unfreeze ──────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct FreezePot<'info> {
    #[account(
        mut,
        constraint = pot.is_sentinel_or_authority(&signer.key())
            @ PotError::NotSentinelOrAuthority,
    )]
    pub pot: Account<'info, PotAccount>,
    pub signer: Signer<'info>,
}

pub fn freeze_pot(ctx: Context<FreezePot>) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    pot.paused = true;
    emit!(PotFrozenEvent {
        pot: pot.key(),
        by: ctx.accounts.signer.key(),
        frozen: true,
    });
    msg!("pot {} FROZEN by {}", pot.key(), ctx.accounts.signer.key());
    Ok(())
}

#[derive(Accounts)]
pub struct UnfreezePot<'info> {
    #[account(
        mut,
        constraint = signer.key() == pot.authority @ PotError::SentinelCannotUnfreeze,
    )]
    pub pot: Account<'info, PotAccount>,
    pub signer: Signer<'info>,
}

pub fn unfreeze_pot(ctx: Context<UnfreezePot>) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    pot.paused = false;
    emit!(PotFrozenEvent {
        pot: pot.key(),
        by: ctx.accounts.signer.key(),
        frozen: false,
    });
    msg!("pot {} unfrozen by authority", pot.key());
    Ok(())
}

// ─── Cancel proposal ────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct CancelProposal<'info> {
    #[account(mut)]
    pub pot: Account<'info, PotAccount>,

    #[account(
        mut,
        has_one = pot @ PotError::UnauthorizedAccess,
        constraint = pot.is_sentinel_or_authority(&signer.key())
            || signer.key() == proposal.proposer
            @ PotError::NotSentinelOrAuthority,
    )]
    pub proposal: Account<'info, ProposalAccount>,

    pub signer: Signer<'info>,
}

pub fn cancel_proposal(ctx: Context<CancelProposal>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    require!(
        matches!(
            proposal.status,
            ProposalStatus::Active | ProposalStatus::Passed
        ),
        PotError::ProposalNotCancellable
    );
    proposal.status = ProposalStatus::Cancelled;
    proposal.resolved_at = Clock::get()?.unix_timestamp;
    emit!(ProposalCancelled {
        pot: ctx.accounts.pot.key(),
        proposal: proposal.key(),
        proposal_id: proposal.proposal_id,
        by: ctx.accounts.signer.key(),
    });
    msg!(
        "proposal #{} cancelled by {}",
        proposal.proposal_id,
        ctx.accounts.signer.key()
    );
    Ok(())
}

// ─── Events ─────────────────────────────────────────────────────────────────

#[event]
pub struct SentinelUpdated {
    pub pot: Pubkey,
    pub sentinel: Option<Pubkey>,
}

#[event]
pub struct PotFrozenEvent {
    pub pot: Pubkey,
    pub by: Pubkey,
    pub frozen: bool,
}

#[event]
pub struct ProposalCancelled {
    pub pot: Pubkey,
    pub proposal: Pubkey,
    pub proposal_id: u64,
    pub by: Pubkey,
}
