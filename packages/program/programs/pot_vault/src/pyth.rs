// PotBot v2 — Pyth price oracle integration
//
// Supports Pyth push oracle accounts (owned by the Pyth program).
// For AdminDirect and Proposal swap modes, the pyth_price_update account
// is ignored (pass any valid account as a sentinel).
//
// For StrategyTrigger mode the keeper MUST pass a real Pyth price feed
// account for the relevant pair (e.g. SOL/USD).
//
// Pyth push oracle account layout (no Anchor discriminator):
//   offset  0: magic    u32  = 0xa1b2c3d4
//   offset  4: ver      u32
//   offset  8: atype    u32
//   offset 12: size     u32
//   offset 16: ptype    u32
//   offset 20: expo     i32  ← exponent
//   offset 24: num      u32
//   offset 28: num_qt   u32
//   offset 32: last_slot u64
//   offset 40: valid_slot u64
//   offset 48: twap     PriceConf (16 bytes)
//   offset 64: twac     PriceConf (16 bytes)
//   offset 80: prev_slot u64
//   offset 88: prev_price i64
//   offset 96: prev_conf u64
//   offset 104: prev_timestamp i64
//   offset 112: agg.price i64  ← aggregate price
//   offset 120: agg.conf  u64
//   offset 128: agg.status u32
//   offset 132: agg.corp_act u32
//   offset 136: agg.pub_slot u64
//   offset 144: timestamp i64  ← publish_time

use anchor_lang::prelude::*;
use crate::errors::PotError;
use crate::state::strategy::{StrategyAccount, TriggerReason};

const PYTH_MAGIC: u32 = 0xa1b2c3d4;
const MIN_ACCOUNT_LEN: usize = 152;
const OFFSET_MAGIC: usize = 0;
const OFFSET_EXPO: usize = 20;
const OFFSET_PRICE: usize = 112;
const OFFSET_TIMESTAMP: usize = 144;

/// Price feed staleness window: 60 seconds.
const STALENESS_SECONDS: i64 = 60;

/// Read (price_mantissa, exponent, publish_time) from a Pyth push oracle
/// price feed account. Returns (0, 0, 0) when called in keeper-trusted mode
/// (account has no data or is a system-program sentinel) — callers should
/// check strategy.pyth_price_feed.is_none() before calling.
pub fn read_price_update(account: &UncheckedAccount) -> Result<(i64, i32, i64)> {
    let data = account
        .try_borrow_data()
        .map_err(|_| error!(PotError::PriceStale))?;

    // Keeper-trusted / sentinel mode: no oracle data available.
    if data.len() < MIN_ACCOUNT_LEN {
        return Ok((0, 0, 0));
    }

    // SECURITY: verify the account is owned by the Pyth push oracle program.
    // Without this check, an attacker could craft a fake account with a matching
    // byte layout and PYTH_MAGIC value, causing the program to trust spoofed
    // price data. Placed after the sentinel early-return so AdminDirect /
    // Proposal swap modes (which pass an arbitrary sentinel) keep working.
    require!(
        account.owner == &crate::constants::PYTH_PROGRAM_MAINNET
            || account.owner == &crate::constants::PYTH_PROGRAM_DEVNET,
        PotError::PriceFeedMismatch
    );

    let magic = read_u32_le(&data, OFFSET_MAGIC);
    if magic != PYTH_MAGIC {
        return Err(error!(PotError::PriceFeedMismatch));
    }

    let expo = read_i32_le(&data, OFFSET_EXPO);
    let price = read_i64_le(&data, OFFSET_PRICE);
    let ts = read_i64_le(&data, OFFSET_TIMESTAMP);

    require!(price > 0, PotError::PriceStale);

    let now = Clock::get()?.unix_timestamp;
    require!(now - ts <= STALENESS_SECONDS, PotError::PriceStale);

    Ok((price, expo, ts))
}

/// Convert a Pyth (price_mantissa, exponent) pair to Q64.64 fixed-point.
///
/// Pyth prices: price_usd = mantissa * 10^expo (expo usually negative, e.g. -8)
/// Q64.64:      value = integer_part * 2^64 + fractional_part
///
/// Implementation: price_x64 = mantissa * 2^64 / 10^(-expo)  (for expo < 0)
pub fn price_to_q64(price: i64, expo: i32) -> Result<u128> {
    require!(price > 0, PotError::PriceStale);
    let p = price as u128;

    let result = if expo >= 0 {
        let scale = 10u128
            .checked_pow(expo as u32)
            .ok_or(error!(PotError::MathOverflow))?;
        p.checked_mul(scale)
            .and_then(|v| v.checked_shl(64))
            .ok_or(error!(PotError::MathOverflow))?
    } else {
        let scale = 10u128
            .checked_pow((-expo) as u32)
            .ok_or(error!(PotError::MathOverflow))?;
        p.checked_shl(64)
            .and_then(|v| v.checked_div(scale))
            .ok_or(error!(PotError::MathOverflow))?
    };

    Ok(result)
}

/// Verify that `current_price_x64` satisfies the strategy's trigger conditions,
/// and return the matching TriggerReason. Errors with TriggerNotMet if no
/// condition fires at the given price.
pub fn assert_trigger_is_valid(
    strategy: &StrategyAccount,
    current_price_x64: u128,
) -> Result<TriggerReason> {
    strategy
        .evaluate_trigger(current_price_x64)
        .ok_or(error!(PotError::TriggerNotMet))
}

// ─── byte helpers ─────────────────────────────────────────────────────────

#[inline]
fn read_u32_le(data: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes(data[offset..offset + 4].try_into().unwrap())
}

#[inline]
fn read_i32_le(data: &[u8], offset: usize) -> i32 {
    i32::from_le_bytes(data[offset..offset + 4].try_into().unwrap())
}

#[inline]
fn read_i64_le(data: &[u8], offset: usize) -> i64 {
    i64::from_le_bytes(data[offset..offset + 8].try_into().unwrap())
}
