use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PotAccount {
    /// Creator / initial admin
    pub authority: Pubkey,
    /// Human-readable name (max 32 bytes)
    #[max_len(32)]
    pub name: String,
    /// Emoji identifier
    #[max_len(8)]
    pub emoji: String,
    /// Bump for the vault PDA
    pub vault_bump: u8,
    /// Bump for the pot PDA
    pub pot_bump: u8,
    /// Total share units distributed across all members
    pub total_shares: u64,
    /// Number of active members
    pub member_count: u32,
    /// Running trade counter
    pub trade_count: u32,
    /// Total volume in lamports
    pub total_volume: u64,
    /// Tamagotchi level 0-5
    pub tamagotchi_level: u8,
    /// Tamagotchi XP
    pub tamagotchi_xp: u64,
    /// Community token mint (SPL)
    pub community_token_mint: Pubkey,
    /// Config
    pub config: PotConfig,
    /// Governance settings
    pub governance: GovSettings,
    /// Next proposal ID
    pub next_proposal_id: u64,
    /// Created timestamp
    pub created_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct PotConfig {
    /// Whether anyone can join or invite-only
    pub is_public: bool,
    /// Minimum deposit in lamports
    pub min_deposit: u64,
    /// Lockup period in seconds (0 = no lockup)
    pub lockup_seconds: i64,
    /// Yield strategy
    pub yield_strategy: YieldStrategy,
    /// Max % of vault allocated to yield (basis points, e.g. 5000 = 50%)
    pub max_yield_allocation_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct GovSettings {
    /// Governance level for trades (0=autocracy, 1=advisory, 2=majority, 3=super, 4=consensus)
    pub trade_level: u8,
    /// Governance level for withdrawals
    pub withdraw_level: u8,
    /// Governance level for member changes
    pub member_change_level: u8,
    /// Governance level for settings changes
    pub settings_change_level: u8,
    /// Governance level for yield strategy changes
    pub yield_change_level: u8,
    /// Voting timeout in seconds
    pub vote_timeout_seconds: i64,
    /// Quorum in basis points (e.g. 5000 = 50%)
    pub quorum_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq)]
pub enum YieldStrategy {
    None,
    Conservative,
    Balanced,
    Aggressive,
}

impl PotAccount {
    /// Calculate the share price: vault_lamports / total_shares
    /// Returns lamports per share (scaled by 1e9 for precision)
    pub fn share_price(&self, vault_lamports: u64) -> u64 {
        if self.total_shares == 0 {
            return 1_000_000_000; // 1:1 initial price
        }
        (vault_lamports as u128)
            .checked_mul(1_000_000_000)
            .unwrap()
            .checked_div(self.total_shares as u128)
            .unwrap() as u64
    }

    /// Calculate shares for a given deposit
    pub fn lamports_to_shares(&self, lamports: u64, vault_lamports: u64) -> u64 {
        if self.total_shares == 0 {
            return lamports; // First deposit: 1 lamport = 1 share
        }
        (lamports as u128)
            .checked_mul(self.total_shares as u128)
            .unwrap()
            .checked_div(vault_lamports as u128)
            .unwrap() as u64
    }

    /// Calculate lamports for a given number of shares
    pub fn shares_to_lamports(&self, shares: u64, vault_lamports: u64) -> u64 {
        if self.total_shares == 0 {
            return 0;
        }
        (shares as u128)
            .checked_mul(vault_lamports as u128)
            .unwrap()
            .checked_div(self.total_shares as u128)
            .unwrap() as u64
    }

    /// Check if governance level allows autocracy (owner decides)
    pub fn is_autocracy(&self, level: u8) -> bool {
        level == 0
    }

    /// Required approval BPS for a given governance level
    pub fn required_approval_bps(level: u8) -> u16 {
        match level {
            0 => 0,       // Autocracy
            1 => 0,       // Advisory (veto-based)
            2 => 5001,    // Majority >50%
            3 => 6667,    // Supermajority >66%
            4 => 10000,   // Consensus 100%
            _ => 10000,
        }
    }
}
