//! Protocol-wide constants for `pot_index`.
//!
//! Fee rates are protocol constants in the MVP (not per-Pot parameters) so a
//! creator cannot quietly change the economics after people have deposited.

use anchor_lang::prelude::*;

#[constant]
pub const CONFIG_SEED: &[u8] = b"config";
#[constant]
pub const ASSET_SEED: &[u8] = b"asset";
#[constant]
pub const POT_SEED: &[u8] = b"pot";

/// Basis points denominator.
pub const BPS: u64 = 10_000;

/// Entry fee taken from every USDC deposit: 0.30%.
pub const ENTRY_FEE_BPS: u64 = 30;
/// Split of the entry fee (in bps of the fee itself).
pub const FEE_SHARE_REFERRER_BPS: u64 = 4_000; // 40%
pub const FEE_SHARE_CREATOR_BPS: u64 = 4_000; // 40%
pub const FEE_SHARE_PROTOCOL_BPS: u64 = 2_000; // 20%

/// Exit fee kept inside the Pot on every burn: 0.50%.
pub const EXIT_FEE_BPS: u64 = 50;

/// Maximum non-cash legs in a Pot.
pub const MAX_LEGS: usize = 5;
/// Minimum non-cash legs in a Pot.
pub const MIN_LEGS: usize = 2;

/// Index token decimals (matches USDC so 1 share ≈ 1 USD at genesis).
pub const INDEX_DECIMALS: u8 = 6;

/// ERC-4626-style virtual liquidity against first-depositor inflation attacks:
/// the Pot behaves as if a phantom $1 were deposited for 1 index token at genesis.
pub const VIRTUAL_SHARES: u128 = 1_000_000; // 1 index token (6 decimals)
pub const VIRTUAL_ASSETS: u128 = 1_000_000; // $1 in micro-USD

/// Reject oracle prices whose confidence interval is wider than this share of price.
pub const MAX_CONF_BPS: u64 = 200; // 2%

/// Sentinel leg index meaning "the USDC cash leg".
pub const CASH_LEG: u8 = u8::MAX;

/// Hard limits on creator-chosen rebalance parameters.
pub const MAX_SLIPPAGE_BPS: u16 = 300; // 3%
pub const MAX_TRADE_BPS_LIMIT: u16 = 2_500; // 25% of NAV per trade
