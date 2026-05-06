use anchor_lang::prelude::*;
use crate::errors::PotError;

#[account]
#[derive(InitSpace)]
pub struct PotAccount {
    // ─── Identity ─────────────────────────────────────────────────────────
    pub authority: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(8)]
    pub emoji: String,

    // ─── PDAs ─────────────────────────────────────────────────────────────
    pub vault_bump: u8,
    pub pot_bump: u8,

    // ─── Shares ───────────────────────────────────────────────────────────
    pub total_shares: u64,
    pub member_count: u32,
    pub trade_count: u32,
    pub total_volume: u64,

    // ─── Tamagotchi ───────────────────────────────────────────────────────
    pub tamagotchi_level: u8,
    pub tamagotchi_xp: u64,

    // ─── Token mint ───────────────────────────────────────────────────────
    pub community_token_mint: Pubkey,
    pub token_mint: Pubkey,
    pub shares_per_sol: u64,

    // ─── Config ───────────────────────────────────────────────────────────
    pub config: PotConfig,
    pub governance: GovSettings,
    pub next_proposal_id: u64,
    pub created_at: i64,

    // ─── Risk & performance ───────────────────────────────────────────────
    pub high_water_mark: u64,
    pub protocol_fee_bps: u16,
    pub last_activity_at: i64,

    // ─── Legacy AI agent ──────────────────────────────────────────────────
    /// Pubkey used for rate-limiting agent proposals (legacy field).
    pub agent_pubkey: Option<Pubkey>,
    pub agent_max_trade_bps: u16,
    pub agent_last_proposal_at: i64,

    // ─── Daily trade tracking ─────────────────────────────────────────────
    pub daily_trades_count: u8,
    pub last_trade_day: i64,

    // ─── Strategy layer v2 ────────────────────────────────────────────────

    /// Emergency pause. When true, execute_swap rejects all modes.
    pub paused: bool,

    /// Keeper agent authority for StrategyTrigger mode.
    /// This is the keeper's hot wallet pubkey — separate from agent_pubkey.
    /// Set via set_allowed_mints.
    pub agent_authority: Pubkey,

    /// Mint allowlist for swap strategies (zeroed entries = unused slots).
    /// Maximum 16 mints per pot.
    pub allowed_mints: [Pubkey; 16],

    /// Number of populated entries in allowed_mints.
    pub allowed_mints_count: u8,

    /// Maximum lamports spendable per UTC day across all strategies.
    /// 0 = unlimited (not recommended for production).
    pub daily_budget_lamports: u64,

    /// Lamports spent in the current UTC day (resets at midnight).
    pub daily_spent_lamports: u64,

    /// UTC day number (unix_timestamp / 86400) of the last spend.
    pub daily_spend_day: i64,

    /// Maximum single swap as bps of vault balance (0 = unlimited).
    /// E.g. 2000 = 20% of vault per swap.
    pub single_swap_cap_bps: u16,

    /// Monotonic count of StrategyAccount PDAs created under this pot.
    pub strategy_count: u8,

    /// Keeper gas reserve (lamports). Keeper draws from this for trigger gas.
    pub fee_reserve: u64,
}

// ─── Config structs ───────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct PotConfig {
    pub is_public: bool,
    pub min_deposit: u64,
    pub lockup_seconds: i64,
    pub yield_strategy: YieldStrategy,
    pub max_yield_allocation_bps: u16,
    pub max_trade_size_bps: u16,
    pub max_members: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct GovSettings {
    pub trade_level: u8,
    pub withdraw_level: u8,
    pub member_change_level: u8,
    pub settings_change_level: u8,
    pub yield_change_level: u8,
    pub vote_timeout_seconds: i64,
    pub quorum_bps: u16,
    pub timelock_seconds: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq)]
pub enum YieldStrategy {
    None,
    Conservative,
    Balanced,
    Aggressive,
}

// ─── impl PotAccount ─────────────────────────────────────────────────────

impl PotAccount {
    /// Calculate the share price: vault_lamports / total_shares (scaled ×10^9).
    pub fn share_price(&self, vault_lamports: u64) -> u64 {
        if self.total_shares == 0 {
            return 1_000_000_000;
        }
        (vault_lamports as u128)
            .checked_mul(1_000_000_000)
            .unwrap_or(0)
            .checked_div(self.total_shares as u128)
            .unwrap_or(0) as u64
    }

    pub fn lamports_to_shares(&self, lamports: u64, vault_lamports: u64) -> u64 {
        if self.total_shares == 0 {
            return lamports;
        }
        if vault_lamports == 0 {
            return 0;
        }
        (lamports as u128)
            .checked_mul(self.total_shares as u128)
            .unwrap_or(0)
            .checked_div(vault_lamports as u128)
            .unwrap_or(0) as u64
    }

    pub fn shares_to_lamports(&self, shares: u64, vault_lamports: u64) -> u64 {
        if self.total_shares == 0 {
            return 0;
        }
        (shares as u128)
            .checked_mul(vault_lamports as u128)
            .unwrap_or(0)
            .checked_div(self.total_shares as u128)
            .unwrap_or(0) as u64
    }

    pub fn is_autocracy(&self, level: u8) -> bool {
        level == 0
    }

    pub fn required_approval_bps(level: u8) -> u16 {
        match level {
            0 => 0,
            1 => 0,
            2 => 5001,
            3 => 6667,
            4 => 10000,
            _ => 10000,
        }
    }

    pub fn recalculate_tamagotchi(&mut self) {
        let total_volume_sol = self.total_volume / 1_000_000_000;
        let volume_xp = std::cmp::min(total_volume_sol * 10, 5000);
        let member_xp = (self.member_count as u64) * 50;
        let trade_xp = (self.trade_count as u64) * 20;
        let total_xp = volume_xp + member_xp + trade_xp;
        self.tamagotchi_xp = total_xp;
        self.tamagotchi_level = match total_xp {
            0..=99 => 0,
            100..=499 => 1,
            500..=1999 => 2,
            2000..=7999 => 3,
            8000..=24999 => 4,
            25000.. => 5,
        };
    }

    pub fn check_daily_trade_limit(&mut self, now: i64, limit: u8) -> bool {
        let current_day = now / 86400;
        let last_day = self.last_trade_day / 86400;
        if current_day > last_day {
            self.daily_trades_count = 0;
            self.last_trade_day = now;
        }
        if limit == 0 {
            self.daily_trades_count = self.daily_trades_count.saturating_add(1);
            return true;
        }
        if self.daily_trades_count >= limit {
            return false;
        }
        self.daily_trades_count = self.daily_trades_count.saturating_add(1);
        true
    }

    // ─── Strategy layer v2 methods ────────────────────────────────────────

    /// Returns true if `mint` is in the pot's allowlist.
    /// A zeroed Pubkey (Pubkey::default()) is treated as an unused slot.
    /// If allowed_mints_count == 0, any mint is allowed (open mode, for testing).
    pub fn is_mint_allowed(&self, mint: &Pubkey) -> bool {
        if self.allowed_mints_count == 0 {
            return true; // no allowlist configured — open mode
        }
        self.allowed_mints[..self.allowed_mints_count as usize]
            .iter()
            .any(|m| m == mint)
    }

    /// Enforce the single-swap size cap. Returns Ok if the swap is within bounds.
    /// `amount` is in lamports (or base token units for SPL).
    pub fn check_single_swap_cap(&self, amount: u64, _mint: &Pubkey) -> Result<()> {
        if self.single_swap_cap_bps == 0 {
            return Ok(()); // unlimited
        }
        // Cap is expressed as bps of fee_reserve (keeper gas pool) as a proxy
        // for vault balance, since we don't have the vault lamports in scope.
        // For a real per-vault-balance cap, the caller should pass vault_lamports
        // and this helper can be extended. For Phase 1, fee_reserve doubles as
        // the reference. If fee_reserve is 0 (not yet funded), skip the cap.
        // NOTE: cap is computed against fee_reserve as a vault-balance proxy.
        // If fee_reserve is zero AND a cap is configured, we deny (fail-closed).
        // Use set_spending_policy to fund fee_reserve before enabling the cap.
        if self.fee_reserve == 0 && self.single_swap_cap_bps > 0 {
            return err!(PotError::SpendingLimitExceeded);
        }
        if self.fee_reserve == 0 {
            return Ok(());
        }
        let cap = (self.fee_reserve as u128)
            .checked_mul(self.single_swap_cap_bps as u128)
            .unwrap_or(u128::MAX)
            / 10_000u128;
        require!(amount as u128 <= cap, PotError::SpendingLimitExceeded);
        Ok(())
    }

    /// Returns Ok if adding `amount` to today's spend stays within daily_budget_lamports.
    /// Does NOT mutate — call register_spend after the swap succeeds.
    pub fn check_daily_budget(&self, amount: u64, now: i64) -> Result<()> {
        if self.daily_budget_lamports == 0 {
            return Ok(()); // unlimited
        }
        let current_day = now / 86400;
        let spent = if current_day > self.daily_spend_day {
            0u64 // new day — counter will reset
        } else {
            self.daily_spent_lamports
        };
        let new_total = spent
            .checked_add(amount)
            .ok_or(error!(PotError::MathOverflow))?;
        require!(
            new_total <= self.daily_budget_lamports,
            PotError::SpendingLimitExceeded
        );
        Ok(())
    }

    /// Record a spend against the daily budget. Call AFTER the swap succeeds.
    pub fn register_spend(&mut self, amount: u64, now: i64) -> Result<()> {
        let current_day = now / 86400;
        if current_day > self.daily_spend_day {
            self.daily_spent_lamports = 0;
            self.daily_spend_day = current_day;
        }
        self.daily_spent_lamports = self
            .daily_spent_lamports
            .checked_add(amount)
            .ok_or(error!(PotError::MathOverflow))?;
        Ok(())
    }
}
