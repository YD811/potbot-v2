use anchor_lang::prelude::*;

use crate::state::pot::PotAccount;
use crate::state::private_pot::PrivatePotAccount;
use crate::state::member::MemberAccount;
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(invite_code: String)]
pub struct JoinPrivatePot<'info> {
    #[account(
        mut,
        constraint = !pot.config.is_public @ ErrorCode::NotPrivatePot
    )]
    pub pot: Account<'info, PotAccount>,

    #[account(
        mut,
        seeds = [b"private_pot", pot.key().as_ref()],
        bump = private_pot_account.bump,
        constraint = private_pot_account.pot == pot.key()
    )]
    pub private_pot_account: Account<'info, PrivatePotAccount>,

    #[account(
        init,
        payer = member,
        space = 8 + MemberAccount::INIT_SPACE,
        seeds = [b"member", pot.key().as_ref(), member.key().as_ref()],
        bump
    )]
    pub member_account: Account<'info, MemberAccount>,

    #[account(mut)]
    pub member: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<JoinPrivatePot>, invite_code: String) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    let private_pot = &mut ctx.accounts.private_pot_account;
    let member_account = &mut ctx.accounts.member_account;
    let member_key = ctx.accounts.member.key();

    require!(
        invite_code.to_uppercase() == private_pot.invite_code,
        ErrorCode::InvalidInviteCode
    );
    require!(
        !private_pot.invited_members.contains(&member_key),
        ErrorCode::AlreadyMember
    );
    require!(
        private_pot.invited_members.len() < private_pot.max_invites as usize,
        ErrorCode::InviteLimitReached
    );
    if pot.config.max_members > 0 {
        require!(
            pot.member_count < pot.config.max_members.into(),
            ErrorCode::MaxMembersReached
        );
    }

    member_account.pot = pot.key();
    member_account.wallet = member_key;
    member_account.shares = 0;
    member_account.deposit_total = 0;
    member_account.joined_at = Clock::get()?.unix_timestamp;
    member_account.last_deposit_at = Clock::get()?.unix_timestamp;
    member_account.bump = ctx.bumps.member_account;

    private_pot.invited_members.push(member_key);
    pot.member_count = pot.member_count.checked_add(1).unwrap();
    pot.last_activity_at = Clock::get()?.unix_timestamp;

    msg!(
        "Member {} joined private pot '{}' with invite code: {}",
        member_key,
        pot.name,
        invite_code.to_uppercase()
    );

    Ok(())
}
