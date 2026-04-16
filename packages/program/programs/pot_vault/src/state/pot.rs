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

    // ── Risk & performance fields ──────────────────────────────────────
    /// High-water mark in lamports (for performance fee tracking)
    pub high_water_mark: u64,
    /// Protocol performance fee in basis points (0-1000 = 0-10%)
    pub protocol_fee_bps: u16,
    /// Last activity timestamp (deposit/trade) — for leaderboard & tamagotchi decay
    pub last_activity_at: i64,

    // ── AI Agent ───────────────────────────────────────────────────────
    /// AI agent wallet pubkey — None = disabled
    pub agent_pubkey: Option<Pubkey>,
    /// Max single trade size the agent can propose (bps of vault, e.g. 1000 = 10%)
    pub agent_max_trade_bps: u16,
    /// Unix timestamp of agent's last proposal (rate limiting)
    pub agent_last_proposal_at: i64,

    // ── Daily trade tracking ───────────────────────────────────────────
    /// Trades executed on the current UTC day
    pub daily_trades_count: u8,
    /// UTC midnight timestamp of the current trading day
    pub last_trade_day: i64,

    /// SPL token mint for vault shares (set by init_token_mint)
    pub token_mint: Pubkey,
    /// How many share tokens per 1 SOL deposited (default 100)
    pub shares_per_sol: u64,
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
    /// Max single swap size as % of vault (basis points, e.g. 2000 = 20%)
    /// 0 = no limit (not recommended for production)
    pub max_trade_size_bps: u16,
    /// Max number of members — 0 = unlimited
    pub max_members: u16,
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

    /// Recalculate tamagotchi XP and level — call after any stat change
    pub fn recalculate_tamagotchi(&mut self) {
        let total_volume_sol = self.total_volume / 1_000_000_000;
        let volume_xp = std::cmp::min(total_volume_sol * 10, 5000);
        let member_xp = (self.member_count as u64) * 50;
        let trade_xp = (self.trade_count as u64) * 20;
        let total_xp = volume_xp + member_xp + trade_xp;

        self.tamagotchi_xp = total_xp;
        self.tamagotchi_level = match total_xp {
            0..=99   => 0,
            100..=499  => 1,
            500..=1999  => 2,
            2000..=7999  => 3,
            8000..=24999 => 4,
            25000..    => 5,
        };
    }

    /// Check and reset daily trade counter if a new UTC day has started.
    /// Returns false if daily limit is reached.
    pub fn check_daily_trade_limit(&mut self, now: i64, limit: u8) -> bool {
        let current_day = now / 86400;
        let last_day = self.last_trade_day / 86400;

        if current_day > last_day {
            self.daily_trades_count = 0;
            self.last_trade_day = now;
        }

        if limit == 0 {
            // No limit configured
            self.daily_trades_count = self.daily_trades_count.saturating_add(1);
            return true;
        }

        if self.daily_trades_count >= limit {
            return false;
        }

        self.daily_trades_count = self.daily_trades_count.saturating_add(1);
        true
    }
}
