//! Capital deployment seam: move base units between the idle buffer and
//! per-leg position escrows, under caps.
//!
//! Phase status: positions are held at BOOK VALUE in vault-PDA-owned escrow
//! token accounts (PDA ["position_vault", pot, mint, route]). This is the
//! exact account surface the Phase-2 protocol adapters plug into — the CPI
//! into Kamino klend / kliquidity / Meteora DLMM replaces the escrow
//! transfer below, everything else (guards, positions, NAV accounting)
//! stays as is. Until then `receipt_amount == deployed_base` and the keeper
//! prices legs at book.
//!
//! Rule 1 holds: the keeper can only shuttle funds between vault-owned
//! accounts. There is no path from here to any external wallet.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::PotError;
use crate::state::*;

// ─── init_position ────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(route: RouteKind)]
pub struct InitPosition<'info> {
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump = config.bump,
        constraint = config.pot == pot.key() @ PotError::StrategyPotMismatch
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    /// CHECK: PDA vault — owner of the position escrow.
    #[account(
        seeds = [VAULT_SEED, pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(address = config.base_mint)]
    pub base_mint: Box<Account<'info, Mint>>,

    pub leg_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = keeper,
        space = 8 + StrategyPosition::INIT_SPACE,
        seeds = [POSITION_SEED, pot.key().as_ref(), leg_mint.key().as_ref(), &[route as u8]],
        bump
    )]
    pub position: Box<Account<'info, StrategyPosition>>,

    #[account(mut)]
    pub keeper: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// One-time per-leg bootstrap, step 1: the position record. (One `init` per
/// instruction — two inits in one Accounts struct blows the 4KB BPF stack
/// frame on the current platform-tools.) Keeper or authority.
pub fn init_position_handler(ctx: Context<InitPosition>, route: RouteKind) -> Result<()> {
    let signer = ctx.accounts.keeper.key();
    require!(
        signer == ctx.accounts.config.keeper || signer == ctx.accounts.pot.authority,
        PotError::UnauthorizedKeeper
    );

    let position = &mut ctx.accounts.position;
    position.pot = ctx.accounts.pot.key();
    position.mint = ctx.accounts.leg_mint.key();
    position.route = route;
    position.bump = ctx.bumps.position;
    position.last_updated_ts = Clock::get()?.unix_timestamp;

    msg!("Position initialized: leg {} via {:?}", position.mint, route);
    Ok(())
}

// ─── init_position_vault ──────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(route: RouteKind)]
pub struct InitPositionVault<'info> {
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump = config.bump,
        constraint = config.pot == pot.key() @ PotError::StrategyPotMismatch
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    /// CHECK: PDA vault — owner of the position escrow.
    #[account(
        seeds = [VAULT_SEED, pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(address = config.base_mint)]
    pub base_mint: Box<Account<'info, Mint>>,

    pub leg_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = keeper,
        seeds = [b"position_vault", pot.key().as_ref(), leg_mint.key().as_ref(), &[route as u8]],
        bump,
        token::mint = base_mint,
        token::authority = vault
    )]
    pub position_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub keeper: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// One-time per-leg bootstrap, step 2: the escrow token account.
pub fn init_position_vault_handler(
    ctx: Context<InitPositionVault>,
    route: RouteKind,
) -> Result<()> {
    let signer = ctx.accounts.keeper.key();
    require!(
        signer == ctx.accounts.config.keeper || signer == ctx.accounts.pot.authority,
        PotError::UnauthorizedKeeper
    );
    msg!(
        "Position escrow initialized: leg {} via {:?}",
        ctx.accounts.leg_mint.key(),
        route
    );
    Ok(())
}

// ─── deploy_to_strategy ───────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(route: RouteKind)]
pub struct DeployToStrategy<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump = config.bump,
        constraint = config.pot == pot.key() @ PotError::StrategyPotMismatch
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    #[account(seeds = [ALLOWLIST_SEED], bump = allowlist.bump)]
    pub allowlist: Box<Account<'info, TokenAllowlist>>,

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

    #[account(address = config.base_mint)]
    pub base_mint: Box<Account<'info, Mint>>,

    /// The index leg this deployment funds.
    pub leg_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [POSITION_SEED, pot.key().as_ref(), leg_mint.key().as_ref(), &[route as u8]],
        bump = position.bump
    )]
    pub position: Box<Account<'info, StrategyPosition>>,

    /// Position escrow holding deployed base units, owned by the vault PDA.
    /// Created once via init_position.
    #[account(
        mut,
        seeds = [b"position_vault", pot.key().as_ref(), leg_mint.key().as_ref(), &[route as u8]],
        bump,
        token::mint = base_mint,
        token::authority = vault
    )]
    pub position_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub keeper: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn deploy_to_strategy_handler(
    ctx: Context<DeployToStrategy>,
    route: RouteKind,
    amount_base: u64,
) -> Result<()> {
    let pot = &ctx.accounts.pot;
    let config = &ctx.accounts.config;
    let signer = ctx.accounts.keeper.key();
    let clock = Clock::get()?;

    require!(
        signer == config.keeper || signer == pot.authority,
        PotError::UnauthorizedKeeper
    );
    require!(!config.paused, PotError::StrategyPaused);
    require!(!pot.paused, PotError::PotFrozen);
    require!(amount_base > 0, PotError::InvalidAmount);

    let leg_mint = ctx.accounts.leg_mint.key();

    // Leg must be in the configured composition with this exact route, and
    // (unless it's the base mint itself) on the global allowlist.
    let entry = config
        .weight_for_mint(&leg_mint)
        .ok_or(PotError::RouteNotConfigured)?;
    require!(entry.route == route, PotError::RouteNotConfigured);
    require!(
        leg_mint == config.base_mint || ctx.accounts.allowlist.contains(&leg_mint),
        PotError::MintNotAllowlisted
    );

    // Idle buffer floor: after this deploy, the vault base ATA must still
    // hold idle_buffer_bps of NAV for instant redemptions.
    let snap = pot.nav_snapshot.ok_or(PotError::NavSnapshotStale)?;
    require!(
        clock.slot.saturating_sub(snap.slot) <= config.nav_staleness_slots,
        PotError::NavSnapshotStale
    );
    let floor = config.idle_floor(snap.value_base);
    let remaining = ctx
        .accounts
        .vault_base_ata
        .amount
        .checked_sub(amount_base)
        .ok_or(PotError::InsufficientIdleBuffer)?;
    require!(remaining >= floor, PotError::InsufficientIdleBuffer);

    // move base: idle buffer → position escrow (vault PDA signs)
    let pot_key = ctx.accounts.pot.key();
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, pot_key.as_ref(), &[ctx.accounts.pot.vault_bump]];
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_base_ata.to_account_info(),
                to: ctx.accounts.position_vault.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[vault_seeds],
        ),
        amount_base,
    )?;

    let position = &mut ctx.accounts.position;
    position.deployed_base = position
        .deployed_base
        .checked_add(amount_base)
        .ok_or(PotError::MathOverflow)?;
    // Book value until protocol adapters land: receipt == base deployed.
    position.receipt_amount = position
        .receipt_amount
        .checked_add(amount_base)
        .ok_or(PotError::MathOverflow)?;
    position.last_updated_ts = clock.unix_timestamp;

    msg!(
        "Deployed {} base → leg {} via {:?} (position total {})",
        amount_base,
        leg_mint,
        route,
        position.deployed_base
    );
    Ok(())
}

// ─── withdraw_from_strategy ───────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(route: RouteKind)]
pub struct WithdrawFromStrategy<'info> {
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

    #[account(address = config.base_mint)]
    pub base_mint: Box<Account<'info, Mint>>,

    pub leg_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [POSITION_SEED, pot.key().as_ref(), leg_mint.key().as_ref(), &[route as u8]],
        bump = position.bump
    )]
    pub position: Box<Account<'info, StrategyPosition>>,

    #[account(
        mut,
        seeds = [b"position_vault", pot.key().as_ref(), leg_mint.key().as_ref(), &[route as u8]],
        bump,
        token::mint = base_mint,
        token::authority = vault
    )]
    pub position_vault: Box<Account<'info, TokenAccount>>,

    pub keeper: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

/// Unwind (part of) a leg back into the idle buffer — for rebalance or to
/// serve the redemption queue. Withdraws are allowed even while paused:
/// pausing must never trap capital outside the buffer.
pub fn withdraw_from_strategy_handler(
    ctx: Context<WithdrawFromStrategy>,
    _route: RouteKind,
    amount_base: u64,
) -> Result<()> {
    let pot = &ctx.accounts.pot;
    let config = &ctx.accounts.config;
    let signer = ctx.accounts.keeper.key();

    require!(
        signer == config.keeper || signer == pot.authority,
        PotError::UnauthorizedKeeper
    );
    require!(amount_base > 0, PotError::InvalidAmount);

    // move base: position escrow → idle buffer (vault PDA signs)
    let pot_key = ctx.accounts.pot.key();
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, pot_key.as_ref(), &[ctx.accounts.pot.vault_bump]];
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.position_vault.to_account_info(),
                to: ctx.accounts.vault_base_ata.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[vault_seeds],
        ),
        amount_base,
    )?;

    let clock = Clock::get()?;
    let position = &mut ctx.accounts.position;
    position.deployed_base = position
        .deployed_base
        .checked_sub(amount_base)
        .ok_or(PotError::InsufficientVaultBalance)?;
    position.receipt_amount = position.receipt_amount.saturating_sub(amount_base);
    position.last_updated_ts = clock.unix_timestamp;

    msg!(
        "Withdrew {} base from leg {} (position remaining {})",
        amount_base,
        ctx.accounts.leg_mint.key(),
        position.deployed_base
    );
    Ok(())
}
