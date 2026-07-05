use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Debug)]
pub enum RedeemStatus {
    /// Waiting for the keeper to free liquidity and settle.
    Pending,
    /// Paid out and closed.
    Settled,
    /// Cancelled by the requester before settlement; tokens returned.
    Cancelled,
}

/// A queued redemption. PDA: ["redeem", pot, member, id_le].
///
/// Created when an instant redemption can't be served from the idle buffer.
/// The member's index tokens are escrowed in the vault's index-token ATA at
/// request time (so queued shares can't be double-spent), and the payout is
/// priced at the NAV snapshot current AT SETTLEMENT, not at request — queue
/// holders bear market risk until settled, same as an ETF redemption.
#[account]
#[derive(InitSpace)]
pub struct RedeemRequest {
    pub pot: Pubkey,
    pub member: Pubkey,
    pub id: u64,
    pub bump: u8,

    /// Index tokens escrowed for this request.
    pub index_amount: u64,

    /// Member's slippage floor on the base-unit payout, checked at settle.
    pub min_out_base: u64,

    pub requested_at: i64,
    pub settled_at: i64,
    pub status: RedeemStatus,

    /// Forward-compatibility tail.
    pub reserved: [u8; 16],
}
