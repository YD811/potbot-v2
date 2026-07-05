//! Index-vault admin surface: global token allowlist, per-pot strategy
//! config bootstrap, pause switch, and the keeper NAV crank.
//!
//! Authority model:
//! - TokenAllowlist: its own `authority` (protocol multisig on mainnet).
//! - StrategyConfig: only `pot.authority` may init/update/pause.
//! - update_nav_snapshot: only the allowlisted `config.keeper` (or the pot
//!   authority as a break-glass path). The keeper can never move funds.

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::constants::*;
use crate::errors::PotError;
use crate::state::*;

// ─── init_allowlist ───────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitAllowlist<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + TokenAllowlist::INIT_SPACE,
        seeds = [ALLOWLIST_SEED],
        bump
    )]
    pub allowlist: Account<'info, TokenAllowlist>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn init_allowlist_handler(
    ctx: Context<InitAllowlist>,
    tokens: Vec<AllowedToken>,
) -> Result<()> {
    require!(tokens.len() <= 100, PotError::TooManyTokens);

    let allowlist = &mut ctx.accounts.allowlist;
    allowlist.authority = ctx.accounts.authority.key();
    allowlist.bump = ctx.bumps.allowlist;
    allowlist.tokens = tokens;

    msg!("Allowlist initialized with {} mints", allowlist.tokens.len());
    Ok(())
}

// ─── set_allowlist ────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct SetAllowlist<'info> {
    #[account(
        mut,
        seeds = [ALLOWLIST_SEED],
        bump = allowlist.bump,
        has_one = authority @ PotError::UnauthorizedAccess
    )]
    pub allowlist: Account<'info, TokenAllowlist>,

    pub authority: Signer<'info>,
}

/// Replaces the whole list atomically — simpler to audit than add/remove
/// deltas, and 100 entries fit comfortably in one transaction.
pub fn set_allowlist_handler(ctx: Context<SetAllowlist>, tokens: Vec<AllowedToken>) -> Result<()> {
    require!(tokens.len() <= 100, PotError::TooManyTokens);

    ctx.accounts.allowlist.tokens = tokens;
    msg!(
        "Allowlist replaced: {} mints",
        ctx.accounts.allowlist.tokens.len()
    );
    Ok(())
}

// ─── init_index_mint ──────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitIndexMint<'info> {
    #[account(mut, has_one = authority @ PotError::UnauthorizedAccess)]
    pub pot: Box<Account<'info, PotAccount>>,

    /// CHECK: PDA vault — becomes the index mint authority.
    #[account(
        seeds = [VAULT_SEED, pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    /// Liquid index token of this pot (iPOT*).
    #[account(
        init,
        payer = authority,
        seeds = [INDEX_MINT_SEED, pot.key().as_ref()],
        bump,
        mint::decimals = INDEX_TOKEN_DECIMALS,
        mint::authority = vault
    )]
    pub index_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Step 1 of the index bootstrap (split from init_strategy_config to stay
/// under the 4KB BPF stack frame). Mint authority is the vault PDA.
pub fn init_index_mint_handler(ctx: Context<InitIndexMint>) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    pot.index_mint = ctx.accounts.index_mint.key();
    msg!("Index mint {} for POT \"{}\"", pot.index_mint, pot.name);
    Ok(())
}

// ─── init_strategy_config ─────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitStrategyConfigArgs {
    pub keeper: Pubkey,
    pub weights: Vec<WeightEntry>,
    pub band_bps: u16,
    pub max_slippage_bps: u16,
    pub idle_buffer_bps: u16,
    pub tvl_cap: u64,
    pub deposit_min: u64,
    pub deposit_max: u64,
    pub nav_staleness_slots: u64,
    pub max_nav_deviation_bps: u16,
    pub is_flagship: bool,
}

#[derive(Accounts)]
pub struct InitStrategyConfig<'info> {
    #[account(mut, has_one = authority @ PotError::UnauthorizedAccess)]
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        init,
        payer = authority,
        space = 8 + StrategyConfig::INIT_SPACE,
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    /// Must be the mint created by init_index_mint (step 1).
    #[account(
        seeds = [INDEX_MINT_SEED, pot.key().as_ref()],
        bump,
        constraint = index_mint.key() == pot.index_mint @ PotError::IndexNotInitialized
    )]
    pub index_mint: Box<Account<'info, Mint>>,

    /// Base/accounting mint (USDC).
    pub base_mint: Box<Account<'info, Mint>>,

    /// Global allowlist — every index leg must be listed.
    #[account(seeds = [ALLOWLIST_SEED], bump = allowlist.bump)]
    pub allowlist: Box<Account<'info, TokenAllowlist>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
// NOTE: the vault's base ATA and index-escrow ATA are created client-side
// via the associated-token program (anyone can create an ATA for a PDA);
// keeping them out of this Accounts struct stays under the BPF stack limit.

fn validate_weights(
    weights: &[WeightEntry],
    allowlist: &TokenAllowlist,
    base_mint: &Pubkey,
) -> Result<()> {
    require!(weights.len() <= 10, PotError::TooManyTokens);
    let sum: u32 = weights.iter().map(|w| w.weight_bps as u32).sum();
    require!(sum == 10_000, PotError::WeightsMustSumTo100);
    for w in weights {
        // The base mint is implicitly allowed (it IS the accounting asset);
        // everything else must be on the global allowlist.
        require!(
            &w.mint == base_mint || allowlist.contains(&w.mint),
            PotError::MintNotAllowlisted
        );
    }
    Ok(())
}

pub fn init_strategy_config_handler(
    ctx: Context<InitStrategyConfig>,
    args: InitStrategyConfigArgs,
) -> Result<()> {
    require!(
        args.max_slippage_bps <= MAX_SLIPPAGE_BPS,
        PotError::InvalidStrategyConfig
    );
    require!(args.idle_buffer_bps <= 10_000, PotError::InvalidStrategyConfig);
    validate_weights(
        &args.weights,
        &ctx.accounts.allowlist,
        &ctx.accounts.base_mint.key(),
    )?;

    let config = &mut ctx.accounts.config;
    config.pot = ctx.accounts.pot.key();
    config.bump = ctx.bumps.config;
    config.base_mint = ctx.accounts.base_mint.key();
    config.keeper = args.keeper;
    config.weights_count = args.weights.len() as u8;
    for (i, w) in args.weights.iter().enumerate() {
        config.weights[i] = *w;
    }
    config.band_bps = args.band_bps;
    config.max_slippage_bps = args.max_slippage_bps;
    config.idle_buffer_bps = args.idle_buffer_bps;
    config.tvl_cap = args.tvl_cap;
    config.deposit_min = args.deposit_min;
    config.deposit_max = args.deposit_max;
    config.nav_staleness_slots = args.nav_staleness_slots;
    config.max_nav_deviation_bps = args.max_nav_deviation_bps;
    config.paused = false;

    let pot = &mut ctx.accounts.pot;
    pot.index_mint = ctx.accounts.index_mint.key();
    pot.is_flagship = args.is_flagship;

    msg!(
        "Index layer initialized for POT \"{}\": {} legs, idle buffer {} bps, flagship={}",
        pot.name,
        config.weights_count,
        config.idle_buffer_bps,
        pot.is_flagship
    );
    Ok(())
}

// ─── update_strategy_config ───────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateStrategyConfigArgs {
    pub keeper: Option<Pubkey>,
    pub weights: Option<Vec<WeightEntry>>,
    pub band_bps: Option<u16>,
    pub max_slippage_bps: Option<u16>,
    pub idle_buffer_bps: Option<u16>,
    pub tvl_cap: Option<u64>,
    pub deposit_min: Option<u64>,
    pub deposit_max: Option<u64>,
    pub nav_staleness_slots: Option<u64>,
    pub max_nav_deviation_bps: Option<u16>,
}

#[derive(Accounts)]
pub struct UpdateStrategyConfig<'info> {
    #[account(has_one = authority @ PotError::UnauthorizedAccess)]
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        mut,
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump = config.bump
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    #[account(seeds = [ALLOWLIST_SEED], bump = allowlist.bump)]
    pub allowlist: Box<Account<'info, TokenAllowlist>>,

    pub authority: Signer<'info>,
}

/// Launch-guard tuning (TVL cap, deposit caps, keeper rotation, weights).
/// NOTE: this is authority-gated but NOT timelocked yet — wire loosening
/// changes into the pot's PendingRiskParams machinery before public mainnet
/// deposits (tracked in docs/mainnet runbook).
pub fn update_strategy_config_handler(
    ctx: Context<UpdateStrategyConfig>,
    args: UpdateStrategyConfigArgs,
) -> Result<()> {
    let base_mint = ctx.accounts.config.base_mint;
    let config = &mut ctx.accounts.config;

    if let Some(weights) = &args.weights {
        validate_weights(weights, &ctx.accounts.allowlist, &base_mint)?;
        config.weights = [WeightEntry::default(); 10];
        for (i, w) in weights.iter().enumerate() {
            config.weights[i] = *w;
        }
        config.weights_count = weights.len() as u8;
    }
    if let Some(k) = args.keeper {
        config.keeper = k;
    }
    if let Some(v) = args.band_bps {
        config.band_bps = v;
    }
    if let Some(v) = args.max_slippage_bps {
        require!(v <= MAX_SLIPPAGE_BPS, PotError::InvalidStrategyConfig);
        config.max_slippage_bps = v;
    }
    if let Some(v) = args.idle_buffer_bps {
        require!(v <= 10_000, PotError::InvalidStrategyConfig);
        config.idle_buffer_bps = v;
    }
    if let Some(v) = args.tvl_cap {
        config.tvl_cap = v;
    }
    if let Some(v) = args.deposit_min {
        config.deposit_min = v;
    }
    if let Some(v) = args.deposit_max {
        config.deposit_max = v;
    }
    if let Some(v) = args.nav_staleness_slots {
        config.nav_staleness_slots = v;
    }
    if let Some(v) = args.max_nav_deviation_bps {
        config.max_nav_deviation_bps = v;
    }

    msg!("Strategy config updated for pot {}", config.pot);
    Ok(())
}

// ─── set_strategy_paused ──────────────────────────────────────────────────

#[derive(Accounts)]
pub struct SetStrategyPaused<'info> {
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        mut,
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump = config.bump
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    /// Pot authority OR sentinel may pause; only the authority may unpause
    /// (mirrors freeze_pot/unfreeze_pot semantics).
    pub signer: Signer<'info>,
}

pub fn set_strategy_paused_handler(ctx: Context<SetStrategyPaused>, paused: bool) -> Result<()> {
    let pot = &ctx.accounts.pot;
    let signer = ctx.accounts.signer.key();

    let is_authority = signer == pot.authority;
    let is_sentinel = pot.sentinel == Some(signer);

    if paused {
        require!(is_authority || is_sentinel, PotError::NotSentinelOrAuthority);
    } else {
        require!(is_authority, PotError::SentinelCannotUnfreeze);
    }

    ctx.accounts.config.paused = paused;
    msg!("Strategy paused={} for pot {}", paused, pot.key());
    Ok(())
}

// ─── update_nav_snapshot ──────────────────────────────────────────────────

#[derive(Accounts)]
pub struct UpdateNavSnapshot<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        seeds = [STRATEGY_CONFIG_SEED, pot.key().as_ref()],
        bump = config.bump,
        constraint = config.pot == pot.key() @ PotError::StrategyPotMismatch
    )]
    pub config: Box<Account<'info, StrategyConfig>>,

    pub keeper: Signer<'info>,
}

/// Keeper writes the total NAV in base units (idle base + priced legs,
/// computed off-chain from Kamino/Meteora SDKs + Jupiter Price API).
/// Guards: keeper allowlist, monotonic slot, deviation cap vs the previous
/// snapshot. The deviation guard is the circuit breaker that keeps a
/// compromised keeper from minting cheap shares or draining via redeem.
pub fn update_nav_snapshot_handler(ctx: Context<UpdateNavSnapshot>, value_base: u64) -> Result<()> {
    let signer = ctx.accounts.keeper.key();
    let config = &ctx.accounts.config;
    let pot = &mut ctx.accounts.pot;

    require!(
        signer == config.keeper || signer == pot.authority,
        PotError::UnauthorizedKeeper
    );

    let clock = Clock::get()?;

    if let Some(prev) = pot.nav_snapshot {
        require!(clock.slot >= prev.slot, PotError::NavSnapshotStale);

        if config.max_nav_deviation_bps > 0 && prev.value_base > 0 {
            let old = prev.value_base as u128;
            let new = value_base as u128;
            let diff = if new > old { new - old } else { old - new };
            let deviation_bps = diff.saturating_mul(10_000) / old;
            require!(
                deviation_bps <= config.max_nav_deviation_bps as u128,
                PotError::NavDeviationTooHigh
            );
        }
    }

    pot.nav_snapshot = Some(NavSnapshot {
        value_base,
        ts: clock.unix_timestamp,
        slot: clock.slot,
    });

    msg!("NAV snapshot: {} base units @ slot {}", value_base, clock.slot);
    Ok(())
}
