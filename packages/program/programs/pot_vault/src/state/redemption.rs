// PotBot v2 — RedemptionRequest (Phase B, Liquid Vaults)
//
// A queued redemption: created when a member's redeem cannot be paid instantly
// (liquid SOL below the withdrawal reserve). The member's SPL share-tokens are
// burned at request time (so they can't be double-spent while queued); the
// recorded `shares` is the INTERNAL share amount owed. A keeper/curator unwinds
// tokens→SOL via the normal propose/execute path, then `fulfill_redemption`
// pays the recorded member from the vault. The member may `cancel_redemption`
// to re-mint their shares while still Pending.
//
// Trust invariant: fulfillment can ONLY pay the `member` recorded here; the
// keeper has no path to redirect funds to itself.

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RedemptionRequest {
    pub pot: Pubkey,
    pub member: Pubkey,
    /// Monotonic id within the pot (pot.next_redemption_id at creation).
    pub redemption_id: u64,
    /// Internal share units owed (already burned from the member's SPL ATA
    /// and removed from total_shares at request time).
    pub internal_shares: u64,
    /// Lamports owed, FIXED at request-time NAV (Variant α). Fulfillment pays
    /// exactly this; it is earmarked in pot.pending_redemption_lamports.
    pub owed_lamports: u64,
    /// NAV-per-share (×10^9) snapshotted at request time, for UI/transparency.
    pub nav_snapshot: u64,
    pub requested_at: i64,
    pub status: RedemptionStatus,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq, Debug)]
pub enum RedemptionStatus {
    Pending,
    Fulfilled,
    Cancelled,
}

impl RedemptionRequest {
    pub const SEED: &'static [u8] = b"redemption";
}
