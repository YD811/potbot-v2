// PotBot v2 — oracle abstraction (Phase A)
//
// A single seam for reading a validated price, so Switchboard (or any future
// source) can be added without touching NAV / swap-guard / caps call sites.
// BPF has no dyn-trait dispatch worth the cost, so this is a small enum router
// rather than a `dyn PriceSource`. Pyth is the only implemented source today;
// `Switchboard` is wired through to a NotImplemented error behind the same
// signature, so call sites are already source-agnostic.

use anchor_lang::prelude::*;
use crate::errors::PotError;
use crate::pyth::{self, OraclePrice};

/// Selects which oracle program backs a pot's price reads. Stored on the pot
/// as a `u8` (see PotAccount.oracle_kind) so it is layout-cheap and additive.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum OracleKind {
    Pyth,
    Switchboard,
}

impl OracleKind {
    pub fn from_u8(v: u8) -> Result<Self> {
        match v {
            0 => Ok(OracleKind::Pyth),
            1 => Ok(OracleKind::Switchboard),
            _ => err!(PotError::OracleKindUnsupported),
        }
    }
}

/// Read a confidence-checked price from `account` using the configured source.
/// `max_conf_bps` is the pot's confidence bound (0 = source default).
pub fn read_price(
    kind: OracleKind,
    account: &UncheckedAccount,
    max_conf_bps: u16,
) -> Result<OraclePrice> {
    match kind {
        OracleKind::Pyth => pyth::read_price_checked(account, max_conf_bps),
        // Switchboard pull-feed decoding lands behind this same signature in
        // the parallel oracle-fallback task. Until then, fail closed.
        OracleKind::Switchboard => err!(PotError::OracleKindUnsupported),
    }
}

/// Deviation between a realised execution price and the oracle mid, in bps.
/// Both prices must be Q64.64 in the SAME quote unit. Returns u16::MAX if the
/// oracle mid is zero (caller treats that as "reject").
pub fn deviation_bps(executed_x64: u128, oracle_mid_x64: u128) -> u16 {
    if oracle_mid_x64 == 0 {
        return u16::MAX;
    }
    let diff = executed_x64.abs_diff(oracle_mid_x64);
    let bps = diff.saturating_mul(10_000) / oracle_mid_x64;
    bps.min(u16::MAX as u128) as u16
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn oracle_kind_roundtrip() {
        assert_eq!(OracleKind::from_u8(0).unwrap(), OracleKind::Pyth);
        assert_eq!(OracleKind::from_u8(1).unwrap(), OracleKind::Switchboard);
        assert!(OracleKind::from_u8(2).is_err());
    }

    #[test]
    fn deviation_zero_when_equal() {
        assert_eq!(deviation_bps(1_000, 1_000), 0);
    }

    #[test]
    fn deviation_symmetric_one_percent() {
        // 1% above and below the mid both read ~100 bps.
        assert_eq!(deviation_bps(10_100, 10_000), 100);
        assert_eq!(deviation_bps(9_900, 10_000), 100);
    }

    #[test]
    fn deviation_rejects_zero_mid() {
        assert_eq!(deviation_bps(1_000, 0), u16::MAX);
    }

    #[test]
    fn deviation_saturates_huge_gap() {
        // 10x the mid → 90_000 bps, clamped to u16::MAX.
        assert_eq!(deviation_bps(100_000, 10_000), u16::MAX);
    }
}
