use anchor_lang::prelude::*;

/// Maximum length of a POT name
pub const MAX_NAME_LEN: usize = 32;

/// Root POT account — one per collective vault
#[account]
pub struct Pot {
    /// Owner wallet (can be multisig in v3)
    pub authority: Pubkey,
    /// Human-readable name
    pub name: String,
    /// Bump for vault PDA
    pub vault_bump: u8,
    /// Total share units minted (lamport precision)
    pub total_shares: u64,
    /// Number of active members
    pub member_count: u32,
    /// Cumulative trade count
    pub trade_count: u64,
    /// Cumulative USD volume (lamports, using SOL price)
    pub total_volume: u64,
    /// Monotonic proposal counter (used as nonce for proposal PDAs)
    pub proposal_count: u64,
    /// Tamagotchi evolution level (0-5)
    pub tamagotchi_level: u8,
    /// Accumulated XP
    pub tamagotchi_xp: u64,
    /// Community SPL token mint (ETF-like)
    pub community_token_mint: Pubkey,
    /// Configurable settings
    pub config: PotConfig,
    /// Governance rules
    pub governance: GovSettings,
    /// Unix timestamp
    pub created_at: i64,
}

impl Pot {
    pub const LEN: usize = 8  // discriminator
        + 32                  // authority
        + 4 + MAX_NAME_LEN    // name string
        + 1                   // vault_bump
        + 8 + 4 + 8 + 8 + 8  // shares, count, trades, volume, proposal_count
        + 1 + 8               // tama level + xp
        + 32                  // community_token_mint
        + PotConfig::LEN
        + GovSettings::LEN
        + 8;                  // created_at
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PotConfig {
    pub is_public: bool,
    pub min_deposit: u64,
    pub lockup_seconds: i64,
    pub privacy_enabled: bool,
    pub yield_strategy: YieldStrategy,
    /// Max % of vault in yield positions (basis points, 10000 = 100%)
    pub max_yield_allocation_bps: u16,
}

impl PotConfig {
    pub const LEN: usize = 1 + 8 + 8 + 1 + 1 + 2;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum YieldStrategy {
    None,
    Conservative,   // Kamino stablecoins 3-6% APY
    Balanced,       // Mixed lending 10-25% APY
    Aggressive,     // High-risk farms 20-50%+ APY
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct GovSettings {
    /// 0=Autocracy, 1=Advisory, 2=Majority, 3=Supermajority, 4=Consensus
    pub trade_level: u8,
    pub withdraw_level: u8,
    pub member_change_level: u8,
    pub settings_change_level: u8,
    pub yield_change_level: u8,
    pub vote_timeout_seconds: i64,
    pub quorum_bps: u16,  // % of members needed for quorum
}

impl GovSettings {
    pub const LEN: usize = 5 + 8 + 2;

    /// Does an action at given governance level require a vote?
    pub fn requires_vote(&self, action_level: u8) -> bool {
        action_level > 0
    }

    /// Minimum approvals needed
    pub fn quorum_count(&self, member_count: u32) -> u32 {
        ((member_count as u64 * self.quorum_bps as u64) / 10_000) as u32
    }
}
