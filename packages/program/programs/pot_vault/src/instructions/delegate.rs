use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PotError;

// ─── register_delegate ─────────────────────────────────────────────────────
//
// Member registers (or re-registers) a delegate wallet that can sign votes
// on their behalf. `init_if_needed` lets the member overwrite an existing
// delegation by calling this instruction again — that mirrors `revoke + register`
// without two separate transactions.

#[derive(Accounts)]
pub struct RegisterDelegate<'info> {
    pub pot: Box<Account<'info, PotAccount>>,

    /// The caller must be a member of this pot with non-zero shares.
    #[account(
        seeds = [b"member", pot.key().as_ref(), member_wallet.key().as_ref()],
        bump = member.bump,
        constraint = member.shares > 0 @ PotError::MemberNotFound,
    )]
    pub member: Account<'info, MemberAccount>,

    /// PDA: [b"delegate", pot, member_wallet]
    #[account(
        init_if_needed,
        payer = member_wallet,
        space = 8 + MemberDelegate::INIT_SPACE,
        seeds = [b"delegate", pot.key().as_ref(), member_wallet.key().as_ref()],
        bump,
    )]
    pub delegate_account: Account<'info, MemberDelegate>,

    #[account(mut)]
    pub member_wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register_handler(
    ctx: Context<RegisterDelegate>,
    delegate: Pubkey,
    rules_uri: String,
) -> Result<()> {
    require!(rules_uri.len() <= 200, PotError::DescriptionTooLong);

    let pot_key = ctx.accounts.pot.key();
    let member_key = ctx.accounts.member_wallet.key();
    let now = Clock::get()?.unix_timestamp;

    let acc = &mut ctx.accounts.delegate_account;
    acc.pot           = pot_key;
    acc.member        = member_key;
    acc.delegate      = delegate;
    acc.rules_uri     = rules_uri;
    acc.scope_mask    = 0; // 0 = all proposal types allowed (v1)
    acc.registered_at = now;
    acc.revoked_at    = 0;
    acc.bump          = ctx.bumps.delegate_account;

    msg!(
        "Delegate registered: pot={} member={} delegate={}",
        pot_key, member_key, delegate
    );
    Ok(())
}

// ─── revoke_delegate ───────────────────────────────────────────────────────
//
// Member revokes their delegation. We don't close the account so we keep the
// audit trail (registered_at, revoked_at, rules_uri visible on-chain forever).

#[derive(Accounts)]
pub struct RevokeDelegate<'info> {
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        mut,
        seeds = [b"delegate", pot.key().as_ref(), member_wallet.key().as_ref()],
        bump = delegate_account.bump,
        constraint = delegate_account.member == member_wallet.key() @ PotError::UnauthorizedAccess,
        constraint = delegate_account.revoked_at == 0 @ PotError::UnauthorizedAccess,
    )]
    pub delegate_account: Account<'info, MemberDelegate>,

    #[account(mut)]
    pub member_wallet: Signer<'info>,
}

pub fn revoke_handler(ctx: Context<RevokeDelegate>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let acc = &mut ctx.accounts.delegate_account;
    acc.revoked_at = now;

    msg!(
        "Delegate revoked: pot={} member={} delegate={}",
        acc.pot, acc.member, acc.delegate
    );
    Ok(())
}
