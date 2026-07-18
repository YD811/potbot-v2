use anchor_lang::prelude::*;
use crate::state::strategy_config::RouteKind;

/// Deployed capital for one (pot, mint, route) leg.
/// PDA: ["position", pot, mint, [route as u8]].
///
/// `deployed_base` is the cost basis in base units (what left the idle
/// buffer); `receipt_amount` is what the route handed back (cTokens, LP
/// shares, or — for `Hold` — the raw token amount in the position ATA).
/// NAV values positions off-chain (keeper) and writes the result to the
/// pot's nav_snapshot; the on-chain program never prices receipts itself.
#[account]
#[derive(InitSpace)]
pub struct StrategyPosition {
    pub pot: Pubkey,
    pub mint: Pubkey,
    pub route: RouteKind,
    pub bump: u8,

    /// Cumulative base units deployed into this leg minus withdrawals
    /// (cost basis, not market value).
    pub deployed_base: u64,

    /// Route receipt balance (cTokens / LP / raw amount for Hold).
    pub receipt_amount: u64,

    pub last_updated_ts: i64,

    /// Forward-compatibility tail.
    pub reserved: [u8; 32],
}
