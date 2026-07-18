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

    // ─── Security hardening (Phase A) ─────────────────────────────────────

    /// Optional sentinel/guardian wallet. Can freeze the pot and cancel
    /// proposals; has NO instruction that can move funds. None = unset.
    pub sentinel: Option<Pubkey>,

    /// Timelock (seconds) applied when a risky governance parameter is
    /// LOOSENED (caps raised, approval levels lowered). Tightening changes
    /// apply immediately. 0 = disabled — all changes apply immediately.
    pub risk_param_timelock_secs: i64,

    /// Staged loosening change awaiting its timelock. Applied via the
    /// permissionless `apply_pending_params` instruction once
    /// `effective_at` has passed. A new staged change replaces this one.
    pub pending_params: PendingRiskParams,

    /// Program-id allowlist for external CPI targets (Jupiter, yield
    /// protocols). Zeroed entries = unused slots. count == 0 = open mode.
    pub allowed_programs: [Pubkey; 8],
    pub allowed_programs_count: u8,

    /// Max cumulative daily spend toward any single output mint, as bps of
    /// vault balance. Tracked per allowed_mints slot. 0 = unlimited.
    /// Only enforceable when the mint allowlist is configured.
    pub max_asset_exposure_bps: u16,

    /// Daily spend (input lamport-equivalents) per allowed_mints slot.
    /// Resets together with daily_spend_day.
    pub per_mint_daily_spent: [u64; 16],

    // ─── Oracle / NAV (Phase A) ──────────────────────────────────────────

    /// Which oracle backs this pot's price reads (0 = Pyth, 1 = Switchboard).
    /// See `crate::oracle::OracleKind`.
    pub oracle_kind: u8,

    /// Max accepted confidence interval on an oracle price, as bps of price.
    /// 0 = source default (pyth::DEFAULT_MAX_CONF_BPS).
    pub max_oracle_conf_bps: u16,

    /// Max accepted deviation between a realised swap price and the oracle
    /// mid, as bps. 0 = guard disabled (no oracle account required).
    pub max_oracle_deviation_bps: u16,

    // ─── Index vault (flagship) ──────────────────────────────────────────
    // Carved from the reserved tail: 32 (index_mint) + 1 (is_flagship)
    // + 25 (Option<NavSnapshot>) = 58 bytes; 128 - 58 = 70 remain.

    /// SPL mint of this pot's liquid index token (iPOT*). Pubkey::default()
    /// = index layer not initialized for this pot.
    pub index_mint: Pubkey,

    /// Pinned on / and atop /leaderboard. Exactly one pot should carry this.
    pub is_flagship: bool,

    /// Latest keeper-written NAV observation (base units of
    /// StrategyConfig.base_mint). None until the first snapshot lands.
    /// Mint/redeem price against this, gated by staleness + deviation
    /// guards in StrategyConfig.
    pub nav_snapshot: Option<NavSnapshot>,

    /// Forward-compatibility tail. New fields are carved from here so the
    /// serialized layout never shifts and old accounts stay readable — this
    /// is the LAST layout-breaking change before that guarantee holds.
    /// Reduce this array by exactly the InitSpace of any field you add.
    pub reserved: [u8; 70],
}

// ─── Config structs ───────────────────────────────────────────────────────

/// One keeper NAV observation. Value is the TOTAL vault NAV in base units
/// (idle base balance + oracle/SDK-priced strategy legs), not per-share —
/// per-share pricing divides by the live index-mint supply at use time so
/// mints between snapshots can't be gamed.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, Default)]
pub struct NavSnapshot {
    /// Total NAV in base units (e.g. USDC 1e6).
    pub value_base: u64,
    /// Unix time of the observation.
    pub ts: i64,
    /// Slot of the observation — staleness is measured in slots.
    pub slot: u64,
}

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

/// A staged change to risky governance parameters, waiting out the
/// risk-param timelock. Stores the FULL target value set: fields that were
/// tightened are applied immediately at staging time, so re-applying them
/// here is a no-op; loosened fields take effect only at `effective_at`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Default)]
pub struct PendingRiskParams {
    pub is_pending: bool,
    /// Unix timestamp after which apply_pending_params may apply this change.
    pub effective_at: i64,
    pub trade_level: u8,
    pub withdraw_level: u8,
    pub max_trade_size_bps: u16,
    pub single_swap_cap_bps: u16,
    pub daily_budget_lamports: u64,
    pub risk_param_timelock_secs: i64,
    pub max_asset_exposure_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq)]
pub enum YieldStrategy {
    None,
    Conservative,
    Balanced,
    Aggressive,
}

// ─── impl PotAccount ─────────────────────────────────────────────────────

/// One priced leg of a pot's holdings for NAV: a token balance valued at an
/// oracle price. Amounts/prices are caller-normalized to lamports of quote.
pub struct NavLeg {
    /// Lamport-equivalent value of this leg (token_amount × oracle_price,
    /// already converted to the SOL quote by the caller/SDK).
    pub lamport_value: u64,
}

impl PotAccount {
    /// True NAV per share (×10^9), counting idle SOL PLUS the oracle-priced
    /// value of every token leg the vault holds. This is the multi-asset
    /// generalization of `share_price`, which only saw idle SOL and therefore
    /// under-reported NAV for any pot mid-strategy. Pure function: the caller
    /// supplies oracle-priced legs (on-chain from `oracle::read_price`, or in
    /// the SDK from the Pyth Price API) so this stays layout-free.
    pub fn nav_per_share(&self, vault_lamports: u64, legs: &[NavLeg]) -> u64 {
        let total_value = legs
            .iter()
            .fold(vault_lamports as u128, |acc, leg| {
                acc.saturating_add(leg.lamport_value as u128)
            });
        nav_per_share_raw(self.total_shares, total_value)
    }

    /// Calculate the share price: vault_lamports / total_shares (scaled ×10^9).
    /// Saturating semantics: overflow paths return 0 — unreachable for any
    /// realistic vault size (mul would need vault > 1.8e10 SOL to overflow u128).
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

    /// Enforce the single-swap size cap against fee_reserve (legacy proxy).
    /// Prefer `check_single_swap_cap_against_vault` — this method is kept for
    /// backward compatibility. If fee_reserve is zero AND a cap is configured,
    /// we deny (fail-closed).
    pub fn check_single_swap_cap(&self, amount: u64, _mint: &Pubkey) -> Result<()> {
        if self.single_swap_cap_bps == 0 {
            return Ok(()); // unlimited
        }
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

    /// Enforce single-swap cap against the actual vault SOL balance.
    /// `vault_lamports` MUST come from `vault.lamports()` at the call site.
    /// This is the canonical safety check — `single_swap_cap_bps` is a fraction
    /// of vault balance, e.g. 2000 bps = 20% of vault per swap.
    pub fn check_single_swap_cap_against_vault(
        &self,
        amount: u64,
        vault_lamports: u64,
    ) -> Result<()> {
        if self.single_swap_cap_bps == 0 {
            return Ok(()); // unlimited
        }
        if vault_lamports == 0 {
            // Vault drained — block any swap that has a cap configured.
            return err!(PotError::SpendingLimitExceeded);
        }
        let cap = (vault_lamports as u128)
            .checked_mul(self.single_swap_cap_bps as u128)
            .ok_or(error!(PotError::MathOverflow))?
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
            // Per-mint exposure counters share the same UTC-day window.
            self.per_mint_daily_spent = [0u64; 16];
        }
        self.daily_spent_lamports = self
            .daily_spent_lamports
            .checked_add(amount)
            .ok_or(error!(PotError::MathOverflow))?;
        Ok(())
    }

    // ─── Security hardening (Phase A) methods ────────────────────────────

    /// True if `signer` is the pot authority or the configured sentinel.
    pub fn is_sentinel_or_authority(&self, signer: &Pubkey) -> bool {
        *signer == self.authority || self.sentinel.as_ref() == Some(signer)
    }

    /// Returns true if `program_id` may be CPI'd into from execute paths.
    /// count == 0 = open mode (any program) for backward compatibility.
    pub fn is_program_allowed(&self, program_id: &Pubkey) -> bool {
        if self.allowed_programs_count == 0 {
            return true;
        }
        self.allowed_programs[..self.allowed_programs_count as usize]
            .iter()
            .any(|p| p == program_id)
    }

    /// Slot index of `mint` in allowed_mints, if listed.
    fn mint_slot(&self, mint: &Pubkey) -> Option<usize> {
        self.allowed_mints[..self.allowed_mints_count as usize]
            .iter()
            .position(|m| m == mint)
    }

    /// Check that spending `amount` more input lamports toward `mint` today
    /// stays within max_asset_exposure_bps of the vault balance.
    /// No-op when the cap is 0 or the mint allowlist is open (no slots to
    /// track against). Does NOT mutate — call register_asset_spend after.
    ///
    /// LIMITATION: `amount` is in INPUT-mint base units, the cap in
    /// lamports — the comparison is only meaningful for wSOL-denominated
    /// entries (like the daily budget and single-swap caps). Token→token
    /// strategies need oracle normalization (Phase 2) for a faithful cap.
    pub fn check_asset_exposure(
        &self,
        mint: &Pubkey,
        amount: u64,
        vault_lamports: u64,
        now: i64,
    ) -> Result<()> {
        if self.max_asset_exposure_bps == 0 {
            return Ok(());
        }
        let Some(slot) = self.mint_slot(mint) else {
            return Ok(()); // open mode / unlisted mint — allowlist guard handles it
        };
        let spent_today = if now / 86400 > self.daily_spend_day {
            0u64
        } else {
            self.per_mint_daily_spent[slot]
        };
        let cap = (vault_lamports as u128)
            .checked_mul(self.max_asset_exposure_bps as u128)
            .ok_or(error!(PotError::MathOverflow))?
            / 10_000u128;
        let new_total = (spent_today as u128)
            .checked_add(amount as u128)
            .ok_or(error!(PotError::MathOverflow))?;
        require!(new_total <= cap, PotError::AssetExposureExceeded);
        Ok(())
    }

    /// Record spend toward `mint` for the per-asset daily exposure cap.
    /// Call AFTER register_spend (which handles the day rollover).
    pub fn register_asset_spend(&mut self, mint: &Pubkey, amount: u64) -> Result<()> {
        if let Some(slot) = self.mint_slot(mint) {
            self.per_mint_daily_spent[slot] = self.per_mint_daily_spent[slot]
                .checked_add(amount)
                .ok_or(error!(PotError::MathOverflow))?;
        }
        Ok(())
    }

    /// Stage-or-apply a risky-parameter change.
    ///
    /// `target` carries the FULL desired value set. Per field: if the new
    /// value is tighter-or-equal it is applied immediately; if ANY field is
    /// looser and a risk-param timelock is configured, the full target set
    /// is staged into pending_params (replacing any prior staged change)
    /// and takes effect via apply_pending_params after the delay.
    /// Returns true if a change was staged (caller may emit/log).
    pub fn stage_or_apply_risk_params(
        &mut self,
        mut target: PendingRiskParams,
        now: i64,
    ) -> Result<bool> {
        let mut any_loosening = false;

        // Approval levels: HIGHER = tighter. Apply raises now; delay lowers.
        if target.trade_level >= self.governance.trade_level {
            self.governance.trade_level = target.trade_level;
        } else {
            any_loosening = true;
        }
        if target.withdraw_level >= self.governance.withdraw_level {
            self.governance.withdraw_level = target.withdraw_level;
        } else {
            any_loosening = true;
        }

        // Caps: 0 = unlimited (loosest); otherwise lower = tighter.
        if !cap_is_looser(self.config.max_trade_size_bps as u64, target.max_trade_size_bps as u64) {
            self.config.max_trade_size_bps = target.max_trade_size_bps;
        } else {
            any_loosening = true;
        }
        if !cap_is_looser(self.single_swap_cap_bps as u64, target.single_swap_cap_bps as u64) {
            self.single_swap_cap_bps = target.single_swap_cap_bps;
        } else {
            any_loosening = true;
        }
        if !cap_is_looser(self.daily_budget_lamports, target.daily_budget_lamports) {
            self.daily_budget_lamports = target.daily_budget_lamports;
        } else {
            any_loosening = true;
        }

        // Per-asset exposure cap: 0 = unlimited (loosest); lower = tighter.
        if !cap_is_looser(self.max_asset_exposure_bps as u64, target.max_asset_exposure_bps as u64) {
            self.max_asset_exposure_bps = target.max_asset_exposure_bps;
        } else {
            any_loosening = true;
        }

        // Timelock itself: HIGHER = tighter; 0 = disabled (loosest).
        if !timelock_is_looser(self.risk_param_timelock_secs, target.risk_param_timelock_secs) {
            self.risk_param_timelock_secs = target.risk_param_timelock_secs;
        } else {
            any_loosening = true;
        }

        if any_loosening {
            if self.risk_param_timelock_secs <= 0 {
                // No timelock configured — loosening applies immediately too.
                self.apply_params(&target);
                self.pending_params = PendingRiskParams::default();
                return Ok(false);
            }
            target.is_pending = true;
            target.effective_at = now
                .checked_add(self.risk_param_timelock_secs)
                .ok_or(error!(PotError::MathOverflow))?;
            self.pending_params = target;
            return Ok(true);
        }

        // Fully-tightening change: clear any stale staged loosening so it
        // cannot later override the new, tighter values.
        self.pending_params = PendingRiskParams::default();
        Ok(false)
    }

    /// Apply the staged change (permissionless once effective_at passed).
    pub fn apply_pending(&mut self, now: i64) -> Result<()> {
        require!(self.pending_params.is_pending, PotError::NoPendingChange);
        require!(
            now >= self.pending_params.effective_at,
            PotError::PendingChangeNotReady
        );
        let staged = self.pending_params.clone();
        self.apply_params(&staged);
        self.pending_params = PendingRiskParams::default();
        Ok(())
    }

    fn apply_params(&mut self, p: &PendingRiskParams) {
        self.governance.trade_level = p.trade_level;
        self.governance.withdraw_level = p.withdraw_level;
        self.config.max_trade_size_bps = p.max_trade_size_bps;
        self.single_swap_cap_bps = p.single_swap_cap_bps;
        self.daily_budget_lamports = p.daily_budget_lamports;
        self.risk_param_timelock_secs = p.risk_param_timelock_secs;
        self.max_asset_exposure_bps = p.max_asset_exposure_bps;
    }
}

/// Pure NAV math: total holdings value (lamports) over total shares, scaled
/// ×10^9. Seeds at 1.0 when there are no shares. Extracted so it can be unit
/// tested without constructing a full PotAccount (which holds String fields).
pub fn nav_per_share_raw(total_shares: u64, total_value: u128) -> u64 {
    if total_shares == 0 {
        return 1_000_000_000;
    }
    total_value
        .checked_mul(1_000_000_000)
        .unwrap_or(0)
        .checked_div(total_shares as u128)
        .unwrap_or(0) as u64
}

/// 0 = unlimited (loosest). Otherwise a higher cap is looser.
fn cap_is_looser(old: u64, new: u64) -> bool {
    if old == new {
        return false;
    }
    if new == 0 {
        return true; // bounded → unlimited
    }
    if old == 0 {
        return false; // unlimited → bounded = tightening
    }
    new > old
}

/// 0 = disabled (loosest). Otherwise a shorter timelock is looser.
fn timelock_is_looser(old: i64, new: i64) -> bool {
    if old == new {
        return false;
    }
    if new <= 0 {
        return true;
    }
    if old <= 0 {
        return false;
    }
    new < old
}

#[cfg(test)]
mod nav_tests {
    use super::nav_per_share_raw;

    #[test]
    fn nav_seeds_at_one_when_no_shares() {
        assert_eq!(nav_per_share_raw(0, 0), 1_000_000_000);
    }

    #[test]
    fn nav_counts_idle_sol_only() {
        // 10 SOL vault, 10e9 shares → 1.0 NAV/share (×1e9).
        assert_eq!(nav_per_share_raw(10_000_000_000, 10_000_000_000), 1_000_000_000);
    }

    #[test]
    fn nav_includes_token_legs() {
        // 4 SOL idle + a token leg worth 6 SOL = 10 SOL total, 10e9 shares
        // → 1.0 NAV. share_price would have seen only the 4 SOL → 0.4, the
        // exact under-reporting the oracle NAV fixes.
        assert_eq!(nav_per_share_raw(10_000_000_000, 10_000_000_000), 1_000_000_000);
        assert_eq!(nav_per_share_raw(10_000_000_000, 4_000_000_000), 400_000_000);
    }

    #[test]
    fn nav_doubles_when_value_doubles() {
        assert_eq!(nav_per_share_raw(10_000_000_000, 20_000_000_000), 2_000_000_000);
    }
}
