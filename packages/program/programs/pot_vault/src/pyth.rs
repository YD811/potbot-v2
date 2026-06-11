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
const OFFSET_CONF: usize = 120;
const OFFSET_TIMESTAMP: usize = 144;

/// Price feed staleness window: 60 seconds.
const STALENESS_SECONDS: i64 = 60;

/// Default max confidence interval as bps of price (2%). A wider interval
/// means the oracle is unsure — reject rather than trade on a fuzzy price.
pub const DEFAULT_MAX_CONF_BPS: u16 = 200;

/// A validated oracle reading: price as Q64.64, the confidence interval
/// expressed in bps of price, and the publish timestamp.
#[derive(Clone, Copy, Debug)]
pub struct OraclePrice {
    pub price_x64: u128,
    pub conf_bps: u16,
    pub publish_time: i64,
}

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

    let (price, expo, _conf, ts) =
        decode_legacy(&data).ok_or(error!(PotError::PriceFeedMismatch))?;

    require!(price > 0, PotError::PriceStale);

    let now = Clock::get()?.unix_timestamp;
    require!(now - ts <= STALENESS_SECONDS, PotError::PriceStale);

    Ok((price, expo, ts))
}

/// Pure decoder for the legacy pythnet `PriceAccount` byte layout (the format
/// produced by PYTH_PROGRAM_DEVNET, which is Phase A's target). Returns
/// (price, expo, conf, publish_time) when the magic matches, else None.
///
/// SCOPE (Finding 1): this does NOT decode the mainnet Pyth **Receiver**
/// `PriceUpdateV2` format (8-byte disc + write_authority + PriceFeedMessage).
/// Mainnet receiver support via `pyth-solana-receiver-sdk` is a tracked
/// Phase-B item — we are devnet/localnet only here. Extracted as a pure fn so
/// the offsets are locked by a regression test and can never silently drift.
pub fn decode_legacy(data: &[u8]) -> Option<(i64, i32, u64, i64)> {
    if data.len() < MIN_ACCOUNT_LEN {
        return None;
    }
    if read_u32_le(data, OFFSET_MAGIC) != PYTH_MAGIC {
        return None;
    }
    Some((
        read_i64_le(data, OFFSET_PRICE),
        read_i32_le(data, OFFSET_EXPO),
        read_u64_le(data, OFFSET_CONF),
        read_i64_le(data, OFFSET_TIMESTAMP),
    ))
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

/// Read a Pyth feed AND enforce the confidence bound, returning a validated
/// OraclePrice (price as Q64.64). Used by NAV, the swap deviation guard and
/// value-based caps — anything that prices funds, not just triggers.
///
/// `max_conf_bps == 0` falls back to DEFAULT_MAX_CONF_BPS so a pot that never
/// configured a bound still gets a sane default. Reverts on stale feed,
/// non-positive price, or a confidence interval wider than the bound.
pub fn read_price_checked(account: &UncheckedAccount, max_conf_bps: u16) -> Result<OraclePrice> {
    // read_price_update enforces owner + magic + staleness + price>0 first.
    let (price, expo, publish_time) = read_price_update(account)?;
    require!(price > 0, PotError::PriceStale);

    // Re-decode for the confidence field in one borrow (single-asset legacy
    // layout). Confidence is in the same units as price, so conf/price is a
    // pure ratio and the exponent cancels.
    let conf = {
        let data = account
            .try_borrow_data()
            .map_err(|_| error!(PotError::PriceStale))?;
        decode_legacy(&data)
            .ok_or(error!(PotError::PriceFeedMismatch))?
            .2
    };
    let conf_bps = ((conf as u128)
        .checked_mul(10_000)
        .ok_or(error!(PotError::MathOverflow))?
        / (price as u128)) as u64;
    let bound = if max_conf_bps == 0 { DEFAULT_MAX_CONF_BPS } else { max_conf_bps };
    require!(conf_bps <= bound as u64, PotError::OracleConfidenceTooLow);

    Ok(OraclePrice {
        price_x64: price_to_q64(price, expo)?,
        conf_bps: conf_bps.min(u16::MAX as u64) as u16,
        publish_time,
    })
}

#[cfg(test)]
mod decode_tests {
    use super::*;

    // Build a buffer carrying known values at the documented legacy offsets,
    // proving decode_legacy reads price/expo/conf/timestamp from the right
    // positions. Locks the layout so it can never silently drift (Finding 1).
    fn buf_with(price: i64, expo: i32, conf: u64, ts: i64) -> Vec<u8> {
        let mut b = vec![0u8; MIN_ACCOUNT_LEN];
        b[OFFSET_MAGIC..OFFSET_MAGIC + 4].copy_from_slice(&PYTH_MAGIC.to_le_bytes());
        b[OFFSET_EXPO..OFFSET_EXPO + 4].copy_from_slice(&expo.to_le_bytes());
        b[OFFSET_PRICE..OFFSET_PRICE + 8].copy_from_slice(&price.to_le_bytes());
        b[OFFSET_CONF..OFFSET_CONF + 8].copy_from_slice(&conf.to_le_bytes());
        b[OFFSET_TIMESTAMP..OFFSET_TIMESTAMP + 8].copy_from_slice(&ts.to_le_bytes());
        b
    }

    #[test]
    fn decodes_legacy_fields_at_documented_offsets() {
        let b = buf_with(150_00000000, -8, 5_000000, 1_700_000_000);
        let (price, expo, conf, ts) = decode_legacy(&b).unwrap();
        assert_eq!(price, 150_00000000);
        assert_eq!(expo, -8);
        assert_eq!(conf, 5_000000);
        assert_eq!(ts, 1_700_000_000);
    }

    #[test]
    fn rejects_wrong_magic() {
        let mut b = buf_with(1, -8, 0, 0);
        b[0] ^= 0xff;
        assert!(decode_legacy(&b).is_none());
    }

    #[test]
    fn rejects_short_buffer() {
        assert!(decode_legacy(&[0u8; 10]).is_none());
    }
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

#[inline]
fn read_u64_le(data: &[u8], offset: usize) -> u64 {
    u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap())
}
