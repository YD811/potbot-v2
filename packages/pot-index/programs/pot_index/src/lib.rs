//! # pot_index — PotBot Portfolios
//!
//! A Pot is a non-custodial basket of Solana assets with target weights. Depositing USDC mints
//! one SPL index token at NAV; burning it returns a proportional share of every asset in kind.
//! There is no withdraw instruction: assets only leave a Pot as a share. Rebalancing is
//! permissionless but bounded on-chain (see `instructions::rebalance`).
//!
//! Built during Colosseum Crypto World's Fair (Sept 14 – Oct 12, 2026).

#![allow(unexpected_cfgs)]

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod oracle;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("DfKKe9oiPb8E98qxZ95otU3D5y1L1U3L2Eh3A7HQiUxr");

#[program]
pub mod pot_index {
    use super::*;

    // ---- admin
    pub fn init_config(ctx: Context<InitConfig>, treasury: Pubkey, max_price_age_secs: u64) -> Result<()> {
        instructions::admin::handle_init_config(ctx, treasury, max_price_age_secs)
    }
    pub fn set_config(ctx: Context<AdminOnly>, update: ConfigUpdate) -> Result<()> {
        instructions::admin::handle_set_config(ctx, update)
    }
    pub fn accept_admin(ctx: Context<AcceptAdmin>) -> Result<()> {
        instructions::admin::handle_accept_admin(ctx)
    }
    pub fn register_asset(ctx: Context<RegisterAsset>, feed_id: [u8; 32]) -> Result<()> {
        instructions::admin::handle_register_asset(ctx, feed_id)
    }
    pub fn set_asset_enabled(ctx: Context<SetAsset>, enabled: bool) -> Result<()> {
        instructions::admin::handle_set_asset_enabled(ctx, enabled)
    }

    // ---- pot lifecycle (creator)
    pub fn create_pot(ctx: Context<CreatePot>, params: CreatePotParams) -> Result<()> {
        instructions::pot::handle_create_pot(ctx, params)
    }
    pub fn add_leg(ctx: Context<AddLeg>, weight_bps: u16) -> Result<()> {
        instructions::pot::handle_add_leg(ctx, weight_bps)
    }
    pub fn finalize_pot(ctx: Context<CreatorOnly>) -> Result<()> {
        instructions::pot::handle_finalize_pot(ctx)
    }
    pub fn set_pot_params(ctx: Context<CreatorOnly>, update: PotUpdate) -> Result<()> {
        instructions::pot::handle_set_pot_params(ctx, update)
    }

    /// Creator attaches Metaplex token metadata (name/symbol from the Pot, logo via `uri`) to the index mint.
    pub fn set_index_metadata(ctx: Context<SetIndexMetadata>, uri: String) -> Result<()> {
        instructions::pot::handle_set_index_metadata(ctx, uri)
    }

    // ---- users
    pub fn deposit<'info>(
        ctx: Context<'info, Deposit<'info>>,
        amount: u64,
        min_shares_out: u64,
    ) -> Result<()> {
        instructions::deposit::handle_deposit(ctx, amount, min_shares_out)
    }
    pub fn exit<'info>(
        ctx: Context<'info, Exit<'info>>,
        shares: u64,
        min_usdc_out: u64,
    ) -> Result<()> {
        instructions::exit::handle_exit(ctx, shares, min_usdc_out)
    }

    /// Exit straight to USDC: burn, receive legs in kind, sell them in the same transaction,
    /// `exit_usdc_close` enforces the minimum and takes the conversion fee.
    pub fn exit_usdc_open<'info>(
        ctx: Context<'info, ExitUsdcOpen<'info>>,
        shares: u64,
        min_usdc_out: u64,
    ) -> Result<()> {
        instructions::exit_usdc::handle_exit_usdc_open(ctx, shares, min_usdc_out)
    }
    pub fn exit_usdc_close(ctx: Context<ExitUsdcClose>) -> Result<()> {
        instructions::exit_usdc::handle_exit_usdc_close(ctx)
    }

    // ---- keepers (anyone)
    pub fn rebalance_open<'info>(
        ctx: Context<'info, RebalanceOpen<'info>>,
        leg_out: u8,
        leg_in: u8,
        amount_out: u64,
    ) -> Result<()> {
        instructions::rebalance::handle_rebalance_open(ctx, leg_out, leg_in, amount_out)
    }
    pub fn rebalance_close(ctx: Context<RebalanceClose>) -> Result<()> {
        instructions::rebalance::handle_rebalance_close(ctx)
    }
}
