use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::PotError;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    /// CHECK: PDA vault that holds SOL
    #[account(
        mut,
        seeds = [b"vault", pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        init_if_needed,
        payer = depositor,
        space = 8 + MemberAccount::INIT_SPACE,
        seeds = [b"member", pot.key().as_ref(), depositor.key().as_ref()],
        bump
    )]
    pub member: Account<'info, MemberAccount>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
    let pot = &ctx.accounts.pot;

    // Frozen pot accepts no new capital (members can still withdraw).
    require!(!pot.paused, PotError::PotFrozen);

    // Validate minimum deposit
    require!(lamports >= pot.config.min_deposit, PotError::DepositTooSmall);

    // Public/private check
    if !pot.config.is_public && ctx.accounts.depositor.key() != pot.authority {
        return Err(PotError::NotPublic.into());
    }

    // Max members check (0 = unlimited)
    let is_new_member = ctx.accounts.member.shares == 0 && ctx.accounts.member.deposit_total == 0;
    if is_new_member && pot.config.max_members > 0 {
        require!(
            pot.member_count < pot.config.max_members as u32,
            PotError::MaxMembersReached
        );
    }

    // Get current vault balance BEFORE transfer (critical for correct share math)
    let vault_lamports = ctx.accounts.vault.lamports();

    // Calculate shares
    let shares = pot.lamports_to_shares(lamports, vault_lamports);
    require!(shares > 0, PotError::ArithmeticOverflow);

    // Transfer SOL: depositor → vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.depositor.to_account_info(),
                to:   ctx.accounts.vault.to_account_info(),
            },
        ),
        lamports,
    )?;

    // Update member account
    let member = &mut ctx.accounts.member;
    let clock  = Clock::get()?;

    if is_new_member {
        member.pot           = ctx.accounts.pot.key();
        member.wallet        = ctx.accounts.depositor.key();
        member.joined_at     = clock.unix_timestamp;
        member.bump          = ctx.bumps.member;
    }

    member.shares           = member.shares.checked_add(shares).ok_or(PotError::ArithmeticOverflow)?;
    member.deposit_total    = member.deposit_total.checked_add(lamports).ok_or(PotError::ArithmeticOverflow)?;
    member.last_deposit_at  = clock.unix_timestamp;

    // Update POT
    let pot = &mut ctx.accounts.pot;
    pot.total_shares     = pot.total_shares.checked_add(shares).ok_or(PotError::ArithmeticOverflow)?;
    pot.last_activity_at = clock.unix_timestamp;
    if is_new_member {
        pot.member_count = pot.member_count.checked_add(1).ok_or(PotError::ArithmeticOverflow)?;
    }
    pot.recalculate_tamagotchi();

    msg!(
        "Deposited {} lamports → {} shares in POT \"{}\" (total shares: {})",
        lamports, shares, pot.name, pot.total_shares
    );
    Ok(())
}
