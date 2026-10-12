use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use anchor_spl::token::Mint;

use crate::{constants::*, errors::PotError, oracle, program::PotIndex, state::*};

/// Shared by `init_config` and `set_config` so the bounds cannot drift apart.
fn validate_price_age(secs: u64) -> Result<()> {
    require!((1..=MAX_PRICE_AGE_SECS_LIMIT).contains(&secs), PotError::PriceAgeOutOfRange);
    Ok(())
}

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,
    #[account(address = USDC_MINT @ PotError::BadUsdcMint)]
    pub usdc_mint: Account<'info, Mint>,
    // Only the upgrade authority may initialize, so nobody can front-run the deployer (review F4).
    // "Deploy and init in one transaction" is not an option: the runtime makes a program callable
    // only from the slot after it is deployed.
    #[account(constraint = program.programdata_address()? == Some(program_data.key()) @ PotError::NotUpgradeAuthority)]
    pub program: Program<'info, PotIndex>,
    #[account(constraint = program_data.upgrade_authority_address == Some(admin.key()) @ PotError::NotUpgradeAuthority)]
    pub program_data: Account<'info, ProgramData>,
    pub system_program: Program<'info, System>,
}

pub fn handle_init_config(ctx: Context<InitConfig>, treasury: Pubkey, max_price_age_secs: u64) -> Result<()> {
    validate_price_age(max_price_age_secs)?;
    let c = &mut ctx.accounts.config;
    c.admin = ctx.accounts.admin.key();
    c.pending_admin = Pubkey::default();
    c.treasury = treasury;
    c.usdc_mint = ctx.accounts.usdc_mint.key();
    c.max_price_age_secs = max_price_age_secs;
    c.paused = false;
    c.pot_count = 0;
    c.bump = ctx.bumps.config;
    c.pending_admin_expiry_slot = 0;
    Ok(())
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    pub admin: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ PotError::Unauthorized)]
    pub config: Account<'info, Config>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ConfigUpdate {
    pub paused: Option<bool>,
    pub max_price_age_secs: Option<u64>,
    pub treasury: Option<Pubkey>,
    pub new_admin: Option<Pubkey>,
}

pub fn handle_set_config(ctx: Context<AdminOnly>, u: ConfigUpdate) -> Result<()> {
    let c = &mut ctx.accounts.config;
    let before = (c.paused, c.max_price_age_secs, c.treasury, c.pending_admin, c.pending_admin_expiry_slot);
    if let Some(p) = u.paused {
        c.paused = p;
    }
    if let Some(a) = u.max_price_age_secs {
        validate_price_age(a)?;
        c.max_price_age_secs = a;
    }
    if let Some(t) = u.treasury {
        c.treasury = t;
    }
    if let Some(a) = u.new_admin {
        // Two-step: the new key must accept within PENDING_ADMIN_TTL_SLOTS. The default key cancels.
        c.pending_admin = a;
        c.pending_admin_expiry_slot =
            if a == Pubkey::default() { 0 } else { Clock::get()?.slot.saturating_add(PENDING_ADMIN_TTL_SLOTS) };
    }
    // A successful set_config always changes the config, so an explorer never shows a no-op as one.
    let after = (c.paused, c.max_price_age_secs, c.treasury, c.pending_admin, c.pending_admin_expiry_slot);
    require!(after != before, PotError::NothingToUpdate);
    emit!(ConfigUpdated {
        admin: c.admin,
        paused: c.paused,
        max_price_age_secs: c.max_price_age_secs,
        treasury: c.treasury,
        pending_admin: c.pending_admin,
        pending_admin_expiry_slot: c.pending_admin_expiry_slot,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct AcceptAdmin<'info> {
    pub new_admin: Signer<'info>,
    // No separate "is a transfer pending" check: an empty `pending_admin` is the default key,
    // which nobody can sign for, so it matches no signer.
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.pending_admin == new_admin.key() @ PotError::NotPendingAdmin,
    )]
    pub config: Account<'info, Config>,
}

pub fn handle_accept_admin(ctx: Context<AcceptAdmin>) -> Result<()> {
    let c = &mut ctx.accounts.config;
    require!(Clock::get()?.slot <= c.pending_admin_expiry_slot, PotError::PendingAdminExpired);
    let previous_admin = c.admin;
    c.admin = c.pending_admin;
    c.pending_admin = Pubkey::default();
    c.pending_admin_expiry_slot = 0;
    emit!(AdminAccepted { previous_admin, admin: c.admin });
    Ok(())
}

/// Size of a v1.1 `Config`: everything before `pending_admin_expiry_slot`.
const CONFIG_LEN_V1_1: usize = 8 + Config::INIT_SPACE - 8;

#[derive(Accounts)]
pub struct MigrateConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: a v1.1 `Config`, which `Account<Config>` can no longer deserialize; owner, size,
    /// discriminator and admin are checked in the handler.
    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub config: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

/// One-off, admin-only: grow a v1.1 `Config` to the current layout by appending
/// `pending_admin_expiry_slot` (zero, i.e. no transfer pending). Every instruction that loads
/// `Config` fails between the program upgrade and this call, so run it right after upgrading.
/// Remove once every deployment has been migrated; fresh deployments never need it.
pub fn handle_migrate_config(ctx: Context<MigrateConfig>) -> Result<()> {
    let config = ctx.accounts.config.to_account_info();
    require_keys_eq!(*config.owner, crate::ID, anchor_lang::error::ErrorCode::AccountOwnedByWrongProgram);
    {
        let data = config.try_borrow_data()?;
        require!(data.len() == CONFIG_LEN_V1_1, PotError::ConfigAlreadyMigrated);
        require!(&data[..8] == Config::DISCRIMINATOR, anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch);
        // `admin` is the first field after the discriminator.
        require!(data[8..40] == ctx.accounts.admin.key().to_bytes(), PotError::Unauthorized);
    }
    let new_len = 8 + Config::INIT_SPACE;
    let missing_rent = Rent::get()?.minimum_balance(new_len).saturating_sub(config.lamports());
    if missing_rent > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer { from: ctx.accounts.admin.to_account_info(), to: config.clone() },
            ),
            missing_rent,
        )?;
    }
    // Zero-extends: the old bytes keep their offsets and the appended field reads 0.
    config.resize(new_len)?;
    Ok(())
}

#[derive(Accounts)]
pub struct RegisterAsset<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ PotError::Unauthorized)]
    pub config: Account<'info, Config>,
    pub mint: Account<'info, Mint>,
    /// CHECK: a Pyth `PriceUpdateV2` for `feed_id`; owner, feed id, age and confidence are
    /// checked by `oracle::read_price` in the handler.
    pub price_update: UncheckedAccount<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + AssetConfig::INIT_SPACE,
        seeds = [ASSET_SEED, mint.key().as_ref()],
        bump,
    )]
    pub asset: Account<'info, AssetConfig>,
    pub system_program: Program<'info, System>,
}

pub fn handle_register_asset(ctx: Context<RegisterAsset>, feed_id: [u8; 32]) -> Result<()> {
    // The cash currency can never be a leg: its vault would be the Pot's cash vault and NAV / exit
    // would count it twice. (Review F5.)
    require_keys_neq!(ctx.accounts.mint.key(), ctx.accounts.config.usdc_mint, PotError::InvalidLeg);
    // A freeze on any leg vault would block every exit, since exits pay every leg (review F8). v1
    // lists only assets nobody can freeze; freezable ones need a product whose exit can skip a leg.
    require!(ctx.accounts.mint.freeze_authority.is_none(), PotError::FreezableMint);
    // The feed must have a live price now. A mistyped or unentitled feed id would otherwise surface
    // only at the first deposit, after a creator has finalized a Pot whose legs cannot change.
    // This proves the feed exists, not that it prices this mint (review F2).
    oracle::read_price(
        &ctx.accounts.price_update.to_account_info(),
        &feed_id,
        &Clock::get()?,
        ctx.accounts.config.max_price_age_secs,
    )?;
    let a = &mut ctx.accounts.asset;
    a.mint = ctx.accounts.mint.key();
    a.feed_id = feed_id;
    a.decimals = ctx.accounts.mint.decimals;
    a.enabled = true;
    a.bump = ctx.bumps.asset;
    emit!(AssetRegistered { mint: a.mint, feed_id });
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateAsset<'info> {
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ PotError::Unauthorized)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [ASSET_SEED, asset.mint.as_ref()], bump = asset.bump)]
    pub asset: Account<'info, AssetConfig>,
    /// CHECK: needed only when `feed_id` changes: a Pyth `PriceUpdateV2` for the new feed,
    /// checked by `oracle::read_price` in the handler.
    pub price_update: Option<UncheckedAccount<'info>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AssetUpdate {
    pub enabled: Option<bool>,
    pub feed_id: Option<[u8; 32]>,
}

/// Enable or disable an asset for new legs, or repoint its Pyth feed (e.g. when Pyth retires one).
/// Legs copy `feed_id` at `add_leg`, so a new feed applies to legs added from now on; existing
/// Pots keep the feed they were built with.
pub fn handle_update_asset(ctx: Context<UpdateAsset>, u: AssetUpdate) -> Result<()> {
    let a = &mut ctx.accounts.asset;
    let before = (a.enabled, a.feed_id);
    if let Some(e) = u.enabled {
        a.enabled = e;
    }
    if let Some(f) = u.feed_id {
        let price_update = ctx.accounts.price_update.as_ref().ok_or(PotError::MissingPriceUpdate)?;
        oracle::read_price(&price_update.to_account_info(), &f, &Clock::get()?, ctx.accounts.config.max_price_age_secs)?;
        a.feed_id = f;
    }
    require!((a.enabled, a.feed_id) != before, PotError::NothingToUpdate);
    emit!(AssetUpdated { mint: a.mint, enabled: a.enabled, feed_id: a.feed_id });
    Ok(())
}

#[event]
pub struct ConfigUpdated {
    pub admin: Pubkey,
    pub paused: bool,
    pub max_price_age_secs: u64,
    pub treasury: Pubkey,
    pub pending_admin: Pubkey,
    pub pending_admin_expiry_slot: u64,
}

#[event]
pub struct AdminAccepted {
    pub previous_admin: Pubkey,
    pub admin: Pubkey,
}

#[event]
pub struct AssetRegistered {
    pub mint: Pubkey,
    pub feed_id: [u8; 32],
}

#[event]
pub struct AssetUpdated {
    pub mint: Pubkey,
    pub enabled: bool,
    pub feed_id: [u8; 32],
}
