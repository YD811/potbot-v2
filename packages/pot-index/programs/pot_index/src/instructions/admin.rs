use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::{constants::*, errors::PotError, state::*};

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
    pub usdc_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

pub fn handle_init_config(ctx: Context<InitConfig>, treasury: Pubkey, max_price_age_secs: u64) -> Result<()> {
    require!(max_price_age_secs > 0, PotError::InvalidParams);
    require!(max_price_age_secs <= MAX_PRICE_AGE_SECS_LIMIT, PotError::PriceAgeTooLong);
    require!(ctx.accounts.usdc_mint.decimals == 6, PotError::BadUsdcDecimals);
    let c = &mut ctx.accounts.config;
    c.admin = ctx.accounts.admin.key();
    c.pending_admin = Pubkey::default();
    c.treasury = treasury;
    c.usdc_mint = ctx.accounts.usdc_mint.key();
    c.max_price_age_secs = max_price_age_secs;
    c.paused = false;
    c.pot_count = 0;
    c.bump = ctx.bumps.config;
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
    if let Some(p) = u.paused {
        c.paused = p;
    }
    if let Some(a) = u.max_price_age_secs {
        require!(a > 0, PotError::InvalidParams);
        require!(a <= MAX_PRICE_AGE_SECS_LIMIT, PotError::PriceAgeTooLong);
        c.max_price_age_secs = a;
    }
    if let Some(t) = u.treasury {
        c.treasury = t;
    }
    if let Some(a) = u.new_admin {
        // Two-step: the new key must accept before it holds any power.
        c.pending_admin = a;
    }
    Ok(())
}

#[derive(Accounts)]
pub struct AcceptAdmin<'info> {
    pub new_admin: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
}

pub fn handle_accept_admin(ctx: Context<AcceptAdmin>) -> Result<()> {
    let c = &mut ctx.accounts.config;
    require!(
        c.pending_admin != Pubkey::default() && c.pending_admin == ctx.accounts.new_admin.key(),
        PotError::NotPendingAdmin
    );
    c.admin = c.pending_admin;
    c.pending_admin = Pubkey::default();
    Ok(())
}

#[derive(Accounts)]
pub struct RegisterAsset<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ PotError::Unauthorized)]
    pub config: Account<'info, Config>,
    pub mint: Account<'info, Mint>,
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
    let a = &mut ctx.accounts.asset;
    a.mint = ctx.accounts.mint.key();
    a.feed_id = feed_id;
    a.decimals = ctx.accounts.mint.decimals;
    a.enabled = true;
    a.bump = ctx.bumps.asset;
    Ok(())
}

#[derive(Accounts)]
pub struct SetAsset<'info> {
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ PotError::Unauthorized)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [ASSET_SEED, asset.mint.as_ref()], bump = asset.bump)]
    pub asset: Account<'info, AssetConfig>,
}

pub fn handle_set_asset_enabled(ctx: Context<SetAsset>, enabled: bool) -> Result<()> {
    ctx.accounts.asset.enabled = enabled;
    Ok(())
}
