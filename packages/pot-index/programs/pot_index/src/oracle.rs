//! NAV math: Pyth prices → micro-USD values, with staleness and confidence checks.

use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::{constants::*, errors::PotError, state::Pot};

/// A priced non-cash leg, read from remaining accounts.
#[derive(Clone, Copy, Debug)]
pub struct LegSnapshot {
    pub amount: u64,
    /// Pyth price (mantissa) and exponent, e.g. price=15_000_000_000, expo=-8 → $150.
    pub price: i64,
    /// price + conf: used when the Pot *values what it holds or gives away* (NAV high → fewer shares).
    pub price_hi: i64,
    /// price − conf: used when the Pot *values what it receives* (min_in high).
    pub price_lo: i64,
    pub expo: i32,
    pub decimals: u8,
    /// Conservative value of `amount` in micro-USD (at `price_hi`).
    pub value_usd: u128,
}

/// Convert `amount` of a token with `decimals` at Pyth `price * 10^expo` to micro-USD.
pub fn token_value_usd(amount: u64, decimals: u8, price: i64, expo: i32) -> Result<u128> {
    require!(price > 0, PotError::NonPositivePrice);
    let raw = (amount as u128)
        .checked_mul(price as u128)
        .ok_or(PotError::MathOverflow)?;
    // value_usd6 = amount * price * 10^expo / 10^decimals * 10^6
    let e: i32 = 6 + expo - decimals as i32;
    if e >= 0 {
        raw.checked_mul(10u128.pow(e as u32)).ok_or_else(|| PotError::MathOverflow.into())
    } else {
        Ok(raw / 10u128.pow((-e) as u32))
    }
}

/// Inverse: how many token base units are worth `value_usd` micro-USD at this price.
pub fn usd_to_token_amount(value_usd: u128, decimals: u8, price: i64, expo: i32) -> Result<u64> {
    require!(price > 0, PotError::NonPositivePrice);
    // amount = value_usd * 10^decimals / (price * 10^expo) / 10^6
    let e: i32 = decimals as i32 - 6 - expo;
    let num = if e >= 0 {
        value_usd
            .checked_mul(10u128.pow(e as u32))
            .ok_or(PotError::MathOverflow)?
    } else {
        value_usd / 10u128.pow((-e) as u32)
    };
    let amt = num / (price as u128);
    u64::try_from(amt).map_err(|_| PotError::MathOverflow.into())
}

/// Read and validate a Pyth `PriceUpdateV2` account for `feed_id`. Returns `(price, conf, expo)`.
pub fn read_price(
    info: &AccountInfo,
    feed_id: &[u8; 32],
    clock: &Clock,
    max_age_secs: u64,
) -> Result<(i64, u64, i32)> {
    require_keys_eq!(*info.owner, pyth_solana_receiver_sdk::ID, PotError::BadOracleOwner);
    let data = info.try_borrow_data()?;
    let update = PriceUpdateV2::try_deserialize(&mut &data[..])?;
    let p = update
        .get_price_no_older_than(clock, max_age_secs, feed_id)
        .map_err(|_| PotError::StalePrice)?;
    // Freshness of the posting itself, not only of the publish time: the account must have been
    // written in roughly the same slot, so nobody can shop for a favourable tick inside the window.
    require!(
        update.posted_slot.saturating_add(MAX_POSTED_SLOT_AGE) >= clock.slot,
        PotError::StalePrice
    );
    require!(p.price > 0, PotError::NonPositivePrice);
    // conf / price <= MAX_CONF_BPS / BPS
    let lhs = (p.conf as u128).checked_mul(BPS as u128).ok_or(PotError::MathOverflow)?;
    let rhs = (p.price as u128)
        .checked_mul(MAX_CONF_BPS as u128)
        .ok_or(PotError::MathOverflow)?;
    require!(lhs <= rhs, PotError::OracleConfidence);
    Ok((p.price, p.conf, p.exponent))
}

/// Walk `remaining` as `[vault_i, price_update_i]` pairs in leg order and price every leg.
/// Every vault key is checked against the Pot; every price account is checked for owner,
/// feed id, age and confidence. Nothing here is trusted from the client.
pub fn snapshot_legs<'info>(
    pot: &Pot,
    remaining: &[AccountInfo<'info>],
    clock: &Clock,
    max_age_secs: u64,
) -> Result<Vec<LegSnapshot>> {
    require!(
        remaining.len() == pot.legs.len() * 2,
        PotError::RemainingAccountsMismatch
    );
    let mut out = Vec::with_capacity(pot.legs.len());
    for (i, leg) in pot.legs.iter().enumerate() {
        let vault_info = &remaining[i * 2];
        let price_info = &remaining[i * 2 + 1];
        require_keys_eq!(vault_info.key(), leg.vault, PotError::VaultMismatch);
        require_keys_eq!(*vault_info.owner, anchor_spl::token::ID, PotError::TokenOwnerMismatch);
        let vault = {
            let data = vault_info.try_borrow_data()?;
            TokenAccount::try_deserialize(&mut &data[..])?
        };
        require_keys_eq!(vault.mint, leg.mint, PotError::TokenMintMismatch);
        let (price, conf, expo) = read_price(price_info, &leg.feed_id, clock, max_age_secs)?;
        let conf_i = i64::try_from(conf).map_err(|_| PotError::MathOverflow)?;
        let price_hi = price.checked_add(conf_i).ok_or(PotError::MathOverflow)?;
        let price_lo = price.checked_sub(conf_i).ok_or(PotError::MathOverflow)?;
        require!(price_lo > 0, PotError::NonPositivePrice);
        let value_usd = token_value_usd(vault.amount, leg.decimals, price_hi, expo)?;
        out.push(LegSnapshot {
            amount: vault.amount,
            price,
            price_hi,
            price_lo,
            expo,
            decimals: leg.decimals,
            value_usd,
        });
    }
    Ok(out)
}

/// NAV in micro-USD = cash (USDC, 1:1) + Σ leg values.
pub fn nav_usd(cash_amount: u64, legs: &[LegSnapshot]) -> Result<u128> {
    let mut nav = cash_amount as u128;
    for l in legs {
        nav = nav.checked_add(l.value_usd).ok_or(PotError::MathOverflow)?;
    }
    Ok(nav)
}

/// Shares to mint for `net_usd` micro-USD at the current NAV (ERC-4626 virtual offset).
pub fn shares_for_deposit(net_usd: u128, nav_before: u128, supply: u64) -> Result<u64> {
    let num = net_usd
        .checked_mul((supply as u128) + VIRTUAL_SHARES)
        .ok_or(PotError::MathOverflow)?;
    let den = nav_before + VIRTUAL_ASSETS;
    u64::try_from(num / den).map_err(|_| PotError::MathOverflow.into())
}

/// Pro-rata amount of one leg for `shares` out of `supply`, after the exit fee stays in the Pot.
/// Burning the whole supply takes the whole balance: with nobody left to accrue to, a kept fee would
/// be stranded and go to whoever deposits next.
pub fn exit_amount(balance: u64, shares: u64, supply: u64) -> Result<u64> {
    require!(supply > 0, PotError::ZeroShares);
    if shares == supply {
        return Ok(balance);
    }
    let gross = (balance as u128)
        .checked_mul(shares as u128)
        .ok_or(PotError::MathOverflow)?
        / (supply as u128);
    let net = gross
        .checked_mul((BPS - EXIT_FEE_BPS) as u128)
        .ok_or(PotError::MathOverflow)?
        / (BPS as u128);
    u64::try_from(net).map_err(|_| PotError::MathOverflow.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn values_sol() {
        // 2 SOL (9 decimals) at $150 (price 150_00000000, expo -8) = $300 = 300_000_000 micro-USD
        let v = token_value_usd(2_000_000_000, 9, 150_00000000, -8).unwrap();
        assert_eq!(v, 300_000_000);
        // inverse
        let a = usd_to_token_amount(300_000_000, 9, 150_00000000, -8).unwrap();
        assert_eq!(a, 2_000_000_000);
    }

    #[test]
    fn first_deposit_is_one_to_one() {
        // $100 into an empty pot → 100 shares (6 dec) up to virtual rounding
        let s = shares_for_deposit(100_000_000, 0, 0).unwrap();
        assert!(s >= 99_999_000 && s <= 100_000_000, "got {s}");
    }

    #[test]
    fn exit_fee_kept() {
        let out = exit_amount(1_000_000, 50, 100).unwrap(); // half the balance minus 0.5%
        assert_eq!(out, 497_500);
    }

    #[test]
    fn values_across_exponents_and_decimals() {
        // 1 BTC (8 decimals) at $65,000 quoted with expo -5.
        assert_eq!(token_value_usd(100_000_000, 8, 6_500_000_000, -5).unwrap(), 65_000_000_000);
        assert_eq!(usd_to_token_amount(65_000_000_000, 8, 6_500_000_000, -5).unwrap(), 100_000_000);
        // 1 SOL (9 decimals) at $150 quoted with expo -10.
        assert_eq!(token_value_usd(1_000_000_000, 9, 1_500_000_000_000, -10).unwrap(), 150_000_000);
        assert_eq!(usd_to_token_amount(150_000_000, 9, 1_500_000_000_000, -10).unwrap(), 1_000_000_000);
        // 1 token with 6 decimals at $1 quoted with expo -8.
        assert_eq!(token_value_usd(1_000_000, 6, 100_000_000, -8).unwrap(), 1_000_000);
        // Rounding is down, i.e. in the Pot's favour, both ways.
        assert_eq!(token_value_usd(1, 9, 15_000_000_000, -8).unwrap(), 0);
        assert_eq!(usd_to_token_amount(1, 9, 15_000_000_000, -8).unwrap(), 6);
    }

    #[test]
    fn extreme_amounts_are_errors_not_panics() {
        // u64::MAX tokens at i64::MAX fits u128 before it is scaled down.
        assert!(token_value_usd(u64::MAX, 9, i64::MAX, -8).is_ok());
        // Scaling up past u128, or a result past u64, is an error.
        assert!(token_value_usd(u64::MAX, 0, i64::MAX, 0).is_err());
        assert!(usd_to_token_amount(u128::MAX / 2, 9, 1, -8).is_err());
        assert!(usd_to_token_amount(u64::MAX as u128 * 2, 6, 100_000_000, -8).is_err());
        // Non-positive prices.
        assert!(token_value_usd(1, 6, 0, -8).is_err());
        assert!(usd_to_token_amount(1, 6, -1, -8).is_err());
    }

    #[test]
    fn last_holder_takes_everything() {
        assert_eq!(exit_amount(1_000_001, 100, 100).unwrap(), 1_000_001);
        assert_eq!(exit_amount(1_000_001, 99, 100).unwrap(), 985_050); // 99% minus 0.5%, floored
    }
}
