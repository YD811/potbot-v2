use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PotError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub pot: Account<'info, PotAccount>,

    /// CHECK: PDA vault that holds SOL
    #[account(
        mut,
        seeds = [b"vault", pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"member", pot.key().as_ref(), withdrawer.key().as_ref()],
        bump = member.bump,
        constraint = member.wallet == withdrawer.key() @ PotError::Unauthorized
    )]
    pub member: Account<'info, MemberAccount>,

    #[account(mut)]
    pub withdrawer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
    let member = &ctx.accounts.member;
    let pot = &ctx.accounts.pot;
    let clock = Clock::get()?;

    require!(shares > 0 && shares <= member.shares, PotError::InsufficientShares);

    require!(
        member.can_withdraw(pot.config.lockup_seconds, clock.unix_timestamp),
        PotError::LockupActive
    );

    let vault_lamports = ctx.accounts.vault.lamports();
    let lamports_out = pot.shares_to_lamports(shares, vault_lamports);
    require!(lamports_out > 0, PotError::MathOverflow);

    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(0);
    require!(
        vault_lamports.saturating_sub(lamports_out) >= min_balance,
        PotError::InsufficientVaultBalance
    );

    **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= lamports_out;
    **ctx.accounts.withdrawer.to_account_info().try_borrow_mut_lamports()? += lamports_out;

    let member = &mut ctx.accounts.member;
    member.shares = member.shares.checked_sub(shares).ok_or(PotError::MathOverflow)?;
    member.withdraw_total = member.withdraw_total.checked_add(lamports_out).ok_or(PotError::MathOverflow)?;

    let pot = &mut ctx.accounts.pot;
    pot.total_shares = pot.total_shares.checked_sub(shares).ok_or(PotError::MathOverflow)?;
    pot.last_activity_at = clock.unix_timestamp;

    if member.shares == 0 {
        pot.member_count = pot.member_count.saturating_sub(1);
    }

    msg!("Withdrew {} shares -> {} lamports from POT {}", shares, lamports_out, pot.name);
    Ok(())
}
