//! Index-token user surface: deposit base (USDC) → mint iPOT shares,
//! instant redemption from the idle buffer, and the redemption queue.
//!
//! Pricing model: every mint/redeem prices against the keeper's NAV
//! snapshot (staleness- and deviation-guarded). Between snapshots the
//! program keeps the snapshot self-consistent by adding deposits and
//! subtracting payouts — flows move NAV and supply proportionally, so the
//! price per share only moves when the keeper reprices strategy legs.
//!
//! Custody: funds only ever sit in vault-PDA-owned token accounts; the only
//! outbound transfers are to the redeeming member's own ATA. The keeper has
//! no instruction that pays anyone.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::PotError;
use crate::state::*;

// ─── shared math ──────────────────────────────────────────────────────────

/// Fresh NAV in base units, or the applicable error.
fn fresh_nav(pot: &PotAccount, config: &StrategyConfig, clock: &Clock) -> Result<u64> {
    let snap = pot.nav_snapshot.ok_or(PotError::NavSnapshotStale)?;
    require!(
        clock.slot.saturating_sub(snap.slot) <= config.nav_staleness_slots,
        PotError::NavSnapshotStale
    );
    Ok(snap.value_base)
}

/// deposit → shares: amount × supply / nav (bootstrap 1:1).
fn shares_for_deposit(amount: u64, supply: u64, nav: u64) -> Result<u64> {
    if supply == 0 {
        return Ok(amount);
    }
    require!(nav > 0, PotError::MathOverflow);
    let shares = (amount as u128)
        .checked_mul(supply as u128)
        .ok_or(PotError::MathOverflow)?
        / nav as u128;
    u64::try_from(shares).map_err(|_| PotError::MathOverflow.into())
}

/// shares → payout: shares × nav / supply.
fn payout_for_shares(shares: u64, supply: u64, nav: u64) -> Result<u64> {
    require!(supply > 0, PotError::MathOverflow);
    let payout = (shares as u128)
        .checked_mul(nav as u128)
        .ok_or(PotError::MathOverflow)?
        / supply as u128;
    u64::try_from(payout).map_err(|_| PotError::MathOverflow.into())
}

fn bump_snapshot(pot: &mut PotAccount, delta: i128, clock: &Clock) {
    let current = pot.nav_snapshot.unwrap_or(NavSnapshot {
        value_base: 0,
        ts: clock.unix_timestamp,
        slot: clock.slot,
    });
    let new_value = (current.value_base as i128).saturating_add(delta).max(0) as u64;
    pot.nav_snapshot = Some(NavSnapshot {
        value_base: new_value,
        ..current
    });
}

// ─── deposit_base ─────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct DepositBase<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump = config.bump,
        constraint = config.pot == pot.key() @ PotError::StrategyPotMismatch
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    /// CHECK: PDA vault — index mint authority + token-account owner.
    #[account(
        seeds = [VAULT_SEED, pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        associated_token::mint = base_mint,
        associated_token::authority = vault
    )]
    pub vault_base_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [INDEX_MINT_SEED, pot.key().as_ref()],
        bump,
        constraint = index_mint.key() == pot.index_mint @ PotError::IndexNotInitialized
    )]
    pub index_mint: Box<Account<'info, Mint>>,

    #[account(address = config.base_mint)]
    pub base_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        constraint = depositor_base_ata.mint == config.base_mint @ PotError::MintNotAllowlisted,
        constraint = depositor_base_ata.owner == depositor.key() @ PotError::UnauthorizedAccess
    )]
    pub depositor_base_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = index_mint,
        associated_token::authority = depositor
    )]
    pub depositor_index_ata: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn deposit_base_handler(
    ctx: Context<DepositBase>,
    amount_base: u64,
    min_shares_out: u64,
) -> Result<()> {
    let pot = &ctx.accounts.pot;
    let config = &ctx.accounts.config;
    let clock = Clock::get()?;

    require!(!pot.paused, PotError::PotFrozen);
    require!(!config.paused, PotError::StrategyPaused);
    require!(amount_base >= config.deposit_min, PotError::DepositBelowMin);
    if config.deposit_max > 0 {
        require!(amount_base <= config.deposit_max, PotError::DepositAboveCap);
    }

    let supply = ctx.accounts.index_mint.supply;

    // Bootstrap: first depositor sets 1 share = 1 base unit and seeds the
    // snapshot at book value (all idle). After that, only the keeper
    // reprices.
    let (nav, shares) = if supply == 0 {
        (0u64, amount_base)
    } else {
        let nav = fresh_nav(pot, config, &clock)?;
        (nav, shares_for_deposit(amount_base, supply, nav)?)
    };

    if config.tvl_cap > 0 {
        require!(
            nav.saturating_add(amount_base) <= config.tvl_cap,
            PotError::TvlCapExceeded
        );
    }
    require!(shares > 0, PotError::InvalidAmount);
    require!(shares >= min_shares_out, PotError::SlippageExceeded);

    // base: depositor → vault ATA
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.depositor_base_ata.to_account_info(),
                to: ctx.accounts.vault_base_ata.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        amount_base,
    )?;

    // shares: vault PDA mints to depositor
    let pot_key = ctx.accounts.pot.key();
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, pot_key.as_ref(), &[ctx.accounts.pot.vault_bump]];
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.index_mint.to_account_info(),
                to: ctx.accounts.depositor_index_ata.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[vault_seeds],
        ),
        shares,
    )?;

    let pot = &mut ctx.accounts.pot;
    bump_snapshot(pot, amount_base as i128, &clock);
    pot.last_activity_at = clock.unix_timestamp;

    msg!(
        "Index deposit: {} base → {} shares (supply was {})",
        amount_base,
        shares,
        supply
    );
    Ok(())
}

// ─── redeem_instant ───────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct RedeemInstant<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump = config.bump,
        constraint = config.pot == pot.key() @ PotError::StrategyPotMismatch
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    /// CHECK: PDA vault.
    #[account(
        seeds = [VAULT_SEED, pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        associated_token::mint = base_mint,
        associated_token::authority = vault
    )]
    pub vault_base_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [INDEX_MINT_SEED, pot.key().as_ref()],
        bump,
        constraint = index_mint.key() == pot.index_mint @ PotError::IndexNotInitialized
    )]
    pub index_mint: Box<Account<'info, Mint>>,

    #[account(address = config.base_mint)]
    pub base_mint: Box<Account<'info, Mint>>,

    pub member: Signer<'info>,

    #[account(
        mut,
        constraint = member_index_ata.mint == pot.index_mint @ PotError::IndexNotInitialized,
        constraint = member_index_ata.owner == member.key() @ PotError::UnauthorizedAccess
    )]
    pub member_index_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = member_base_ata.mint == config.base_mint @ PotError::MintNotAllowlisted,
        constraint = member_base_ata.owner == member.key() @ PotError::UnauthorizedAccess
    )]
    pub member_base_ata: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

/// Deliberately NOT gated on pot.paused / config.paused — member exits are
/// never blockable (same contract as redeem_tokens for the SOL path).
pub fn redeem_instant_handler(
    ctx: Context<RedeemInstant>,
    index_amount: u64,
    min_out_base: u64,
) -> Result<()> {
    require!(index_amount > 0, PotError::InvalidBurnAmount);

    let clock = Clock::get()?;
    let nav = fresh_nav(&ctx.accounts.pot, &ctx.accounts.config, &clock)?;
    let supply = ctx.accounts.index_mint.supply;
    let payout = payout_for_shares(index_amount, supply, nav)?;

    require!(payout >= min_out_base, PotError::RedeemBelowMinOut);
    // Instant path is only for what the idle buffer can serve — otherwise
    // the client should fall back to request_redeem (the queue).
    require!(
        ctx.accounts.vault_base_ata.amount >= payout,
        PotError::RedemptionInsufficientVault
    );

    // burn member's index tokens (member signs)
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.index_mint.to_account_info(),
                from: ctx.accounts.member_index_ata.to_account_info(),
                authority: ctx.accounts.member.to_account_info(),
            },
        ),
        index_amount,
    )?;

    // pay base from vault ATA (vault PDA signs)
    let pot_key = ctx.accounts.pot.key();
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, pot_key.as_ref(), &[ctx.accounts.pot.vault_bump]];
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_base_ata.to_account_info(),
                to: ctx.accounts.member_base_ata.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[vault_seeds],
        ),
        payout,
    )?;

    let pot = &mut ctx.accounts.pot;
    bump_snapshot(pot, -(payout as i128), &clock);
    pot.last_activity_at = clock.unix_timestamp;

    msg!("Instant redeem: {} shares → {} base", index_amount, payout);
    Ok(())
}

// ─── request_redeem (queue) ───────────────────────────────────────────────

#[derive(Accounts)]
pub struct RequestRedeem<'info> {
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        mut,
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump = config.bump,
        constraint = config.pot == pot.key() @ PotError::StrategyPotMismatch
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    /// CHECK: PDA vault (escrow owner).
    #[account(
        seeds = [VAULT_SEED, pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        associated_token::mint = index_mint,
        associated_token::authority = vault
    )]
    pub vault_index_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [INDEX_MINT_SEED, pot.key().as_ref()],
        bump,
        constraint = index_mint.key() == pot.index_mint @ PotError::IndexNotInitialized
    )]
    pub index_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = member,
        space = 8 + RedeemRequest::INIT_SPACE,
        seeds = [REDEEM_SEED, pot.key().as_ref(), member.key().as_ref(), config.next_redeem_id.to_le_bytes().as_ref()],
        bump
    )]
    pub request: Box<Account<'info, RedeemRequest>>,

    #[account(mut)]
    pub member: Signer<'info>,

    #[account(
        mut,
        constraint = member_index_ata.mint == pot.index_mint @ PotError::IndexNotInitialized,
        constraint = member_index_ata.owner == member.key() @ PotError::UnauthorizedAccess
    )]
    pub member_index_ata: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Queue a redemption the idle buffer can't serve. Index tokens are
/// escrowed now; pricing happens at settlement NAV (queue holders bear
/// market risk until settled, like an ETF redemption in kind).
pub fn request_redeem_handler(
    ctx: Context<RequestRedeem>,
    index_amount: u64,
    min_out_base: u64,
) -> Result<()> {
    require!(index_amount > 0, PotError::InvalidBurnAmount);

    let clock = Clock::get()?;

    // escrow member's index tokens into the vault-owned ATA
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.member_index_ata.to_account_info(),
                to: ctx.accounts.vault_index_ata.to_account_info(),
                authority: ctx.accounts.member.to_account_info(),
            },
        ),
        index_amount,
    )?;

    let config = &mut ctx.accounts.config;
    let request = &mut ctx.accounts.request;
    request.pot = ctx.accounts.pot.key();
    request.member = ctx.accounts.member.key();
    request.id = config.next_redeem_id;
    request.bump = ctx.bumps.request;
    request.index_amount = index_amount;
    request.min_out_base = min_out_base;
    request.requested_at = clock.unix_timestamp;
    request.status = RedeemStatus::Pending;

    config.next_redeem_id = config
        .next_redeem_id
        .checked_add(1)
        .ok_or(PotError::MathOverflow)?;
    config.pending_redeem_shares = config
        .pending_redeem_shares
        .checked_add(index_amount)
        .ok_or(PotError::MathOverflow)?;

    msg!(
        "Redeem queued: id={} {} shares (queue total {})",
        request.id,
        index_amount,
        config.pending_redeem_shares
    );
    Ok(())
}

// ─── settle_redeem ────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct SettleRedeem<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        mut,
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump = config.bump,
        constraint = config.pot == pot.key() @ PotError::StrategyPotMismatch
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    /// CHECK: PDA vault.
    #[account(
        seeds = [VAULT_SEED, pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        associated_token::mint = base_mint,
        associated_token::authority = vault
    )]
    pub vault_base_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = index_mint,
        associated_token::authority = vault
    )]
    pub vault_index_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [INDEX_MINT_SEED, pot.key().as_ref()],
        bump,
        constraint = index_mint.key() == pot.index_mint @ PotError::IndexNotInitialized
    )]
    pub index_mint: Box<Account<'info, Mint>>,

    #[account(address = config.base_mint)]
    pub base_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        close = member,
        constraint = request.pot == pot.key() @ PotError::StrategyPotMismatch,
        constraint = request.status == RedeemStatus::Pending @ PotError::RedeemNotPending
    )]
    pub request: Box<Account<'info, RedeemRequest>>,

    /// CHECK: receives the closed request's rent; must be the requester.
    #[account(mut, address = request.member @ PotError::RecipientMismatch)]
    pub member: UncheckedAccount<'info>,

    /// Payout lands in the requester's ATA — never anywhere else, no matter
    /// who cranks the settlement. Created client-side if missing (the ATA
    /// program lets anyone create it; kept out of this struct for the 4KB
    /// BPF stack limit).
    #[account(
        mut,
        associated_token::mint = base_mint,
        associated_token::authority = member
    )]
    pub member_base_ata: Box<Account<'info, TokenAccount>>,

    /// Anyone may crank a settlement (keeper in practice).
    #[account(mut)]
    pub cranker: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn settle_redeem_handler(ctx: Context<SettleRedeem>) -> Result<()> {
    let clock = Clock::get()?;
    let nav = fresh_nav(&ctx.accounts.pot, &ctx.accounts.config, &clock)?;
    let supply = ctx.accounts.index_mint.supply;
    let index_amount = ctx.accounts.request.index_amount;

    let payout = payout_for_shares(index_amount, supply, nav)?;
    require!(
        payout >= ctx.accounts.request.min_out_base,
        PotError::RedeemBelowMinOut
    );
    require!(
        ctx.accounts.vault_base_ata.amount >= payout,
        PotError::RedemptionInsufficientVault
    );

    let pot_key = ctx.accounts.pot.key();
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, pot_key.as_ref(), &[ctx.accounts.pot.vault_bump]];

    // burn the escrowed index tokens (vault PDA owns the escrow)
    token::burn(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.index_mint.to_account_info(),
                from: ctx.accounts.vault_index_ata.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[vault_seeds],
        ),
        index_amount,
    )?;

    // pay the requester
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_base_ata.to_account_info(),
                to: ctx.accounts.member_base_ata.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[vault_seeds],
        ),
        payout,
    )?;

    let request = &mut ctx.accounts.request;
    request.status = RedeemStatus::Settled;
    request.settled_at = clock.unix_timestamp;

    let config = &mut ctx.accounts.config;
    config.pending_redeem_shares = config.pending_redeem_shares.saturating_sub(index_amount);

    let pot = &mut ctx.accounts.pot;
    bump_snapshot(pot, -(payout as i128), &clock);
    pot.last_activity_at = clock.unix_timestamp;

    msg!(
        "Redeem settled: id={} {} shares → {} base",
        request.id,
        index_amount,
        payout
    );
    Ok(())
}

// ─── cancel_redeem ────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct CancelRedeem<'info> {
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        mut,
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump = config.bump,
        constraint = config.pot == pot.key() @ PotError::StrategyPotMismatch
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    /// CHECK: PDA vault (escrow owner).
    #[account(
        seeds = [VAULT_SEED, pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        constraint = vault_index_ata.mint == pot.index_mint @ PotError::IndexNotInitialized,
        constraint = vault_index_ata.owner == vault.key() @ PotError::VaultOwnerMismatch
    )]
    pub vault_index_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        close = member,
        constraint = request.pot == pot.key() @ PotError::StrategyPotMismatch,
        constraint = request.status == RedeemStatus::Pending @ PotError::RedeemNotPending,
        has_one = member @ PotError::UnauthorizedAccess
    )]
    pub request: Box<Account<'info, RedeemRequest>>,

    #[account(mut)]
    pub member: Signer<'info>,

    #[account(
        mut,
        constraint = member_index_ata.mint == pot.index_mint @ PotError::IndexNotInitialized,
        constraint = member_index_ata.owner == member.key() @ PotError::UnauthorizedAccess
    )]
    pub member_index_ata: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

pub fn cancel_redeem_handler(ctx: Context<CancelRedeem>) -> Result<()> {
    let index_amount = ctx.accounts.request.index_amount;

    // return escrowed tokens (vault PDA signs)
    let pot_key = ctx.accounts.pot.key();
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, pot_key.as_ref(), &[ctx.accounts.pot.vault_bump]];
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_index_ata.to_account_info(),
                to: ctx.accounts.member_index_ata.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[vault_seeds],
        ),
        index_amount,
    )?;

    let config = &mut ctx.accounts.config;
    config.pending_redeem_shares = config.pending_redeem_shares.saturating_sub(index_amount);

    msg!("Redeem cancelled: {} shares returned", index_amount);
    Ok(())
}
