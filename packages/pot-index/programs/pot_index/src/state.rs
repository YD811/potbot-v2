use anchor_lang::prelude::*;

use crate::constants::*;

/// One per protocol. PDA: ["config"].
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    /// Two-step admin transfer: proposed key must call `accept_admin`.
    pub pending_admin: Pubkey,
    /// Wallet that receives the protocol share of entry fees (its USDC ATA is checked at deposit).
    pub treasury: Pubkey,
    pub usdc_mint: Pubkey,
    /// Oldest Pyth price accepted, in seconds.
    pub max_price_age_secs: u64,
    /// Global stop for deposits and rebalances. Exits are never paused.
    pub paused: bool,
    pub pot_count: u64,
    pub bump: u8,
}

/// Allowlisted asset. PDA: ["asset", mint].
#[account]
#[derive(InitSpace)]
pub struct AssetConfig {
    pub mint: Pubkey,
    /// Pyth price feed id (32 bytes) quoting this asset in USD.
    pub feed_id: [u8; 32],
    pub decimals: u8,
    pub enabled: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, Debug, PartialEq, Eq)]
pub struct Leg {
    pub mint: Pubkey,
    /// Pot-owned ATA holding this asset.
    pub vault: Pubkey,
    pub feed_id: [u8; 32],
    pub weight_bps: u16,
    pub decimals: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, Debug, Default, PartialEq, Eq)]
pub struct RebalanceState {
    pub open: bool,
    pub leg_out: u8,
    pub leg_in: u8,
    pub amount_out: u64,
    pub min_in: u64,
    pub in_vault_before: u64,
    pub slot: u64,
}

/// A Pot. PDA: ["pot", index_mint].
#[account]
#[derive(InitSpace)]
pub struct Pot {
    pub creator: Pubkey,
    pub index_mint: Pubkey,
    /// Pot-owned USDC ATA (the cash leg, target weight 0).
    pub cash_vault: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
    #[max_len(5)]
    pub legs: Vec<Leg>,
    /// Weights locked; deposits allowed.
    pub finalized: bool,
    /// Creator-controlled stop for deposits. Exits always work.
    pub paused: bool,
    /// Max NAV in micro-USD after a deposit (0 = no cap).
    pub deposit_cap_usd: u64,
    /// Max adverse price move accepted on a rebalance leg, in bps.
    pub slippage_bps: u16,
    /// Max single rebalance trade as bps of NAV.
    pub max_trade_bps: u16,
    pub rebalance: RebalanceState,
    pub last_rebalance_slot: u64,
    pub total_deposits_usd: u64,
    pub total_exits_usd: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl Pot {
    pub fn seeds(&self) -> [&[u8]; 3] {
        [POT_SEED, self.index_mint.as_ref(), std::slice::from_ref(&self.bump)]
    }

    pub fn leg(&self, idx: u8) -> Option<&Leg> {
        self.legs.get(idx as usize)
    }
}
