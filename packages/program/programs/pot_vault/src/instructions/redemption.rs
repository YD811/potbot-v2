// PotBot v2 — redemption queue (Phase B, Variant α: payout fixed at request)
//
// request_redemption  — member burns SPL shares; lamports owed are FIXED at
//                       request-time NAV and earmarked in
//                       pot.pending_redemption_lamports. Used when the liquid
//                       reserve can't pay instantly (or by choice).
// fulfill_redemption  — permissionless crank: once the vault holds the SOL,
//                       pay the recorded member exactly owed_lamports. The
//                       keeper can call it but can ONLY pay request.member —
//                       no path to redirect funds.
// cancel_redemption   — member re-mints their shares while still Pending.
//
// Invariant: queued-owed SOL is subtracted from distributable everywhere
// (deposit/redeem/withdraw), so a pending exit never inflates other holders'
// NAV and instant exits never touch earmarked funds.

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount};

// NOTE: the redemption queue operates purely on the SPL share-token + the
// global total_shares ledger — the FUND claim. It deliberately does NOT touch
// per-member `MemberAccount.shares`, which is a vote-weight field: SPL can be
// transferred on a secondary market, so a holder's redeemable claim is their
// token balance, not their (possibly stale) member.shares. Tying the queue to
// member.shares would (a) wrongly let member.shares-based withdraw double-exit
// and (b) block a legitimate secondary-market holder from redeeming. withdraw
// is blocked for tokenized pots; member.shares ↔ SPL reconciliation for vote
// weight is a Phase C governance item.
use crate::constants::VAULT_SEED;
use crate::errors::PotError;
use crate::state::pot::PotAccount;
use crate::state::redemption::{RedemptionRequest, RedemptionStatus};

// ─── request_redemption ──────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct RequestRedemption<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    /// CHECK: vault PDA (read-only here — NAV snapshot only, no SOL moves).
    #[account(seeds = [VAULT_SEED, pot.key().as_ref()], bump = pot.vault_bump)]
    pub vault: SystemAccount<'info>,

    #[account(
        init,
        payer = member,
        space = 8 + RedemptionRequest::INIT_SPACE,
        seeds = [RedemptionRequest::SEED, pot.key().as_ref(), &pot.next_redemption_id.to_le_bytes()],
        bump,
    )]
    pub request: Box<Account<'info, RedemptionRequest>>,

    #[account(mut, constraint = token_mint.key() == pot.token_mint @ PotError::NotTokenized)]
    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        constraint = member_token_ata.mint == token_mint.key() @ PotError::NavLegAccountInvalid,
        constraint = member_token_ata.owner == member.key() @ PotError::NavLegAccountInvalid,
    )]
    pub member_token_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub member: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn request_redemption(ctx: Context<RequestRedemption>, token_amount: u64) -> Result<()> {
    require!(ctx.accounts.pot.liquid_mode, PotError::NotLiquidMode);
    require!(token_amount > 0, PotError::InvalidAmount);

    let scale = ctx.accounts.pot.shares_per_sol;
    require!(scale > 0, PotError::NotTokenized);
    require!(token_amount % scale == 0, PotError::InvalidAmount);
    let internal_shares = token_amount / scale;
    require!(internal_shares > 0, PotError::InvalidAmount);

    let now = Clock::get()?.unix_timestamp;
    let rent_min = Rent::get()?.minimum_balance(0);
    let raw = ctx.accounts.vault.lamports();

    let pot = &ctx.accounts.pot;
    // Distributable already nets out prior pending. owed is fixed here.
    let distributable = pot.distributable_lamports(raw, rent_min);
    let owed_lamports = pot.shares_to_lamports(internal_shares, distributable);
    require!(owed_lamports > 0, PotError::InvalidAmount);
    let nav_snapshot = pot.share_price(distributable);

    // Burn the member's SPL shares now so they can't be double-spent while
    // queued. The internal shares leave the live pool too.
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.member_token_ata.to_account_info(),
                authority: ctx.accounts.member.to_account_info(),
            },
        ),
        token_amount,
    )?;

    let request = &mut ctx.accounts.request;
    request.pot = ctx.accounts.pot.key();
    request.member = ctx.accounts.member.key();
    request.redemption_id = ctx.accounts.pot.next_redemption_id;
    request.internal_shares = internal_shares;
    request.owed_lamports = owed_lamports;
    request.nav_snapshot = nav_snapshot;
    request.requested_at = now;
    request.status = RedemptionStatus::Pending;
    request.bump = ctx.bumps.request;

    let pot = &mut ctx.accounts.pot;
    pot.total_shares = pot.total_shares.checked_sub(internal_shares).ok_or(PotError::ArithmeticOverflow)?;
    pot.pending_redemption_lamports = pot
        .pending_redemption_lamports
        .checked_add(owed_lamports)
        .ok_or(PotError::ArithmeticOverflow)?;
    pot.next_redemption_id = pot.next_redemption_id.checked_add(1).ok_or(PotError::ArithmeticOverflow)?;
    pot.last_activity_at = now;

    emit!(RedemptionRequested {
        pot: pot.key(),
        request: request.key(),
        member: request.member,
        redemption_id: request.redemption_id,
        internal_shares,
        owed_lamports,
    });
    Ok(())
}

// ─── fulfill_redemption ──────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct FulfillRedemption<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    /// CHECK: vault PDA, pays out via seeds-signed transfer.
    #[account(mut, seeds = [VAULT_SEED, pot.key().as_ref()], bump = pot.vault_bump)]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        has_one = pot @ PotError::UnauthorizedAccess,
        constraint = request.status == RedemptionStatus::Pending @ PotError::RedemptionNotPending,
    )]
    pub request: Box<Account<'info, RedemptionRequest>>,

    /// The recorded beneficiary. MUST equal request.member — the cranker
    /// cannot redirect funds to itself.
    /// CHECK: validated against request.member below.
    #[account(mut, address = request.member @ PotError::UnauthorizedAccess)]
    pub member: UncheckedAccount<'info>,

    /// Permissionless crank (keeper or anyone). Pays gas only.
    pub cranker: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn fulfill_redemption(ctx: Context<FulfillRedemption>) -> Result<()> {
    let owed = ctx.accounts.request.owed_lamports;
    let raw = ctx.accounts.vault.lamports();
    let rent_min = Rent::get()?.minimum_balance(0);

    // Keep rent-exemption AND the rest of the queue's earmark covered after
    // paying `owed`: require raw >= rent + pending (i.e. raw - owed >= rent +
    // (pending - owed)). This prevents fulfilling one request out of order in
    // a way that strands a later request's earmarked SOL (Finding 7).
    let pending = ctx.accounts.pot.pending_redemption_lamports;
    require!(
        raw >= rent_min.saturating_add(pending),
        PotError::RedemptionStillIlliquid
    );

    let pot_key = ctx.accounts.pot.key();
    let vault_bump = ctx.accounts.pot.vault_bump;
    let signer_seeds: &[&[u8]] = &[VAULT_SEED, pot_key.as_ref(), core::slice::from_ref(&vault_bump)];
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.member.to_account_info(),
            },
            &[signer_seeds],
        ),
        owed,
    )?;

    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.request.status = RedemptionStatus::Fulfilled;
    let pot = &mut ctx.accounts.pot;
    pot.pending_redemption_lamports = pot.pending_redemption_lamports.saturating_sub(owed);
    pot.last_activity_at = now;

    emit!(RedemptionFulfilled {
        pot: pot_key,
        request: ctx.accounts.request.key(),
        member: ctx.accounts.member.key(),
        owed_lamports: owed,
    });
    Ok(())
}

// ─── cancel_redemption ───────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct CancelRedemption<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        mut,
        has_one = pot @ PotError::UnauthorizedAccess,
        constraint = request.member == member.key() @ PotError::UnauthorizedAccess,
        constraint = request.status == RedemptionStatus::Pending @ PotError::RedemptionNotPending,
    )]
    pub request: Box<Account<'info, RedemptionRequest>>,

    #[account(mut, constraint = token_mint.key() == pot.token_mint @ PotError::NotTokenized)]
    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        constraint = member_token_ata.mint == token_mint.key() @ PotError::NavLegAccountInvalid,
        constraint = member_token_ata.owner == member.key() @ PotError::NavLegAccountInvalid,
    )]
    pub member_token_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub member: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn cancel_redemption(ctx: Context<CancelRedemption>) -> Result<()> {
    let internal_shares = ctx.accounts.request.internal_shares;
    let owed = ctx.accounts.request.owed_lamports;
    let scale = ctx.accounts.pot.shares_per_sol;
    let mint_amount = internal_shares.checked_mul(scale).ok_or(PotError::ArithmeticOverflow)?;

    // Re-mint the burned SPL shares back to the member.
    let authority_key = ctx.accounts.pot.authority;
    let pot_name = ctx.accounts.pot.name.clone();
    let pot_bump = ctx.accounts.pot.pot_bump;
    let signer_seeds: &[&[u8]] =
        &[b"pot", authority_key.as_ref(), pot_name.as_bytes(), core::slice::from_ref(&pot_bump)];
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.member_token_ata.to_account_info(),
                authority: ctx.accounts.pot.to_account_info(),
            },
            &[signer_seeds],
        ),
        mint_amount,
    )?;

    ctx.accounts.request.status = RedemptionStatus::Cancelled;

    let pot = &mut ctx.accounts.pot;
    pot.total_shares = pot.total_shares.checked_add(internal_shares).ok_or(PotError::ArithmeticOverflow)?;
    pot.pending_redemption_lamports = pot.pending_redemption_lamports.saturating_sub(owed);
    pot.last_activity_at = Clock::get()?.unix_timestamp;

    emit!(RedemptionCancelled {
        pot: pot.key(),
        request: ctx.accounts.request.key(),
        member: ctx.accounts.member.key(),
        internal_shares,
    });
    Ok(())
}

// ─── events ──────────────────────────────────────────────────────────────────

#[event]
pub struct RedemptionRequested {
    pub pot: Pubkey,
    pub request: Pubkey,
    pub member: Pubkey,
    pub redemption_id: u64,
    pub internal_shares: u64,
    pub owed_lamports: u64,
}

#[event]
pub struct RedemptionFulfilled {
    pub pot: Pubkey,
    pub request: Pubkey,
    pub member: Pubkey,
    pub owed_lamports: u64,
}

#[event]
pub struct RedemptionCancelled {
    pub pot: Pubkey,
    pub request: Pubkey,
    pub member: Pubkey,
    pub internal_shares: u64,
}
