use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{constants::*, errors::PotError, state::*};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreatePotParams {
    pub name: String,
    pub symbol: String,
    /// Max NAV in micro-USD after a deposit (0 = uncapped).
    pub deposit_cap_usd: u64,
    pub slippage_bps: u16,
    pub max_trade_bps: u16,
}

#[derive(Accounts)]
pub struct CreatePot<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// Fresh keypair; its key seeds the Pot PDA so every Pot is unique.
    #[account(
        init,
        payer = creator,
        mint::decimals = INDEX_DECIMALS,
        mint::authority = pot,
        mint::freeze_authority = pot,
    )]
    pub index_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        space = 8 + Pot::INIT_SPACE,
        seeds = [POT_SEED, index_mint.key().as_ref()],
        bump,
    )]
    pub pot: Account<'info, Pot>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        associated_token::mint = usdc_mint,
        associated_token::authority = pot,
    )]
    pub cash_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_create_pot(ctx: Context<CreatePot>, p: CreatePotParams) -> Result<()> {
    require!(!ctx.accounts.config.paused, PotError::ProtocolPaused);
    require!(p.name.len() <= 32 && !p.name.is_empty(), PotError::NameTooLong);
    require!(p.symbol.len() <= 10 && !p.symbol.is_empty(), PotError::NameTooLong);
    require!(p.slippage_bps > 0 && p.slippage_bps <= MAX_SLIPPAGE_BPS, PotError::InvalidParams);
    require!(
        p.max_trade_bps > 0 && p.max_trade_bps <= MAX_TRADE_BPS_LIMIT,
        PotError::InvalidParams
    );

    let pot = &mut ctx.accounts.pot;
    pot.creator = ctx.accounts.creator.key();
    pot.index_mint = ctx.accounts.index_mint.key();
    pot.cash_vault = ctx.accounts.cash_vault.key();
    pot.name = p.name;
    pot.symbol = p.symbol;
    pot.legs = Vec::new();
    pot.finalized = false;
    pot.paused = false;
    pot.deposit_cap_usd = p.deposit_cap_usd;
    pot.slippage_bps = p.slippage_bps;
    pot.max_trade_bps = p.max_trade_bps;
    pot.rebalance = RebalanceState::default();
    pot.total_deposits_usd = 0;
    pot.total_exits_usd = 0;
    pot.created_at = Clock::get()?.unix_timestamp;
    pot.bump = ctx.bumps.pot;

    ctx.accounts.config.pot_count = ctx.accounts.config.pot_count.saturating_add(1);
    Ok(())
}

#[derive(Accounts)]
pub struct AddLeg<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        seeds = [POT_SEED, pot.index_mint.as_ref()],
        bump = pot.bump,
        has_one = creator @ PotError::Unauthorized,
    )]
    pub pot: Account<'info, Pot>,
    #[account(seeds = [ASSET_SEED, mint.key().as_ref()], bump = asset.bump)]
    pub asset: Account<'info, AssetConfig>,
    #[account(address = asset.mint)]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = pot,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_add_leg(ctx: Context<AddLeg>, weight_bps: u16) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    require!(!pot.finalized, PotError::PotAlreadyFinalized);
    require!(ctx.accounts.asset.enabled, PotError::AssetDisabled);
    require!(pot.legs.len() < MAX_LEGS, PotError::TooManyLegs);
    require!(weight_bps >= 1 && weight_bps as u64 <= BPS, PotError::InvalidWeight);
    let mint = ctx.accounts.mint.key();
    require!(pot.legs.iter().all(|l| l.mint != mint), PotError::DuplicateLeg);

    pot.legs.push(Leg {
        mint,
        vault: ctx.accounts.vault.key(),
        feed_id: ctx.accounts.asset.feed_id,
        weight_bps,
        decimals: ctx.accounts.asset.decimals,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct CreatorOnly<'info> {
    pub creator: Signer<'info>,
    #[account(
        mut,
        seeds = [POT_SEED, pot.index_mint.as_ref()],
        bump = pot.bump,
        has_one = creator @ PotError::Unauthorized,
    )]
    pub pot: Account<'info, Pot>,
}

pub fn handle_finalize_pot(ctx: Context<CreatorOnly>) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    require!(!pot.finalized, PotError::PotAlreadyFinalized);
    require!(pot.legs.len() >= MIN_LEGS, PotError::TooFewLegs);
    let sum: u64 = pot.legs.iter().map(|l| l.weight_bps as u64).sum();
    require!(sum == BPS, PotError::WeightsDoNotSum);
    pot.finalized = true;
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PotUpdate {
    pub paused: Option<bool>,
    pub deposit_cap_usd: Option<u64>,
}

/// Creator can pause deposits and change the cap. Weights are immutable after finalize.
pub fn handle_set_pot_params(ctx: Context<CreatorOnly>, u: PotUpdate) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    if let Some(p) = u.paused {
        pot.paused = p;
    }
    if let Some(c) = u.deposit_cap_usd {
        pot.deposit_cap_usd = c;
    }
    Ok(())
}
