// PotBot v2 — StrategyAccount
// Phase 0 of swap-strategy architecture.
//
// Lifecycle:
//   Pending  --entry execute_swap-->  Active
//   Active   --route_to_yield-->      Parked
//   Parked   --unwrap_yield-->        Active
//   Active   --exit execute_swap-->   Closed
//   Parked   --exit execute_swap-->   Closed  (panic exit, unwraps + exits)

use anchor_lang::prelude::*;

// ─── Enums ────────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum StrategyStatus {
    Pending,
    Active,
    Parked,
    Closed,
}

/// Who authored the strategy. Determines auth path in execute_swap.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, InitSpace)]
pub enum StrategySource {
    AdminDirect { admin: Pubkey },
    Proposal { proposal_id: u64 },
    Agent { rule_id: [u8; 32] },
}

/// Where idle capital is parked between entry and exit.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum YieldTarget {
    None,
    KaminoLend { reserve: Pubkey },
    KaminoVault { strategy: Pubkey },
    MeteoraDlmm { pool: Pubkey, lower_bin: i32, upper_bin: i32 },
    MeteoraDynamic { vault: Pubkey },
}

/// Reason a keeper-submitted trigger fired.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum TriggerReason {
    Manual,
    StopLoss,
    TakeProfit,
    TrailingStop,
}

/// Concrete record of the strategy's current yield deposit.
/// None while the strategy is in spot (Pending/Active/Closed).
/// Set by route_to_yield, cleared by unwrap_yield.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum YieldPosition {
    KaminoLend {
        reserve: Pubkey,
        collateral_ata: Pubkey,
        liquidity_deposited: u64,
        entered_at: i64,
    },
    MeteoraDlmm {
        position: Pubkey,
        pool: Pubkey,
        lower_bin_id: i32,
        upper_bin_id: i32,
        entered_at: i64,
    },
}

// ─── Account ──────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace, Debug)]
pub struct StrategyAccount {
    pub pot: Pubkey,
    pub slot_id: u16,
    pub bump: u8,

    pub source: StrategySource,
    pub status: StrategyStatus,

    pub input_mint: Pubkey,
    pub output_mint: Pubkey,

    /// Actual input spent (filled on entry swap).
    pub size_in: u64,
    /// Actual output received (filled on entry swap).
    pub size_out: u64,

    /// Entry price in Q64.64 fixed-point (size_out / size_in * 2^64).
    pub entry_price_x64: u128,

    /// Latest observed price for trailing-stop math.
    pub trailing_high_price_x64: u128,

    /// Pyth price feed account. None = keeper-trusted mode.
    pub pyth_price_feed: Option<Pubkey>,

    pub stop_loss_bps: Option<u16>,
    pub take_profit_bps: Option<u16>,
    pub trailing_stop_bps: Option<u16>,

    pub yield_target: YieldTarget,

    /// Live record of the current yield deposit. None in spot.
    pub yield_position: Option<YieldPosition>,

    /// Incremented on every successful execute_swap. Prevents replay.
    pub executor_nonce: u32,

    /// For Proposal-sourced strategies: set to true by mark_proposal_passed.
    /// execute_swap(Proposal) requires this to be true.
    pub proposal_passed: bool,

    pub created_at: i64,
    pub executed_at: i64,
    pub closed_at: i64,
    pub last_trigger_reason: TriggerReason,

    /// Last publish_time consumed from Pyth (for UI "last priced N min ago").
    pub last_price_update_ts: i64,

    /// Reserved for forward compatibility.
    pub reserved: [u8; 64],
}

impl StrategyAccount {
    pub const SEED: &'static [u8] = b"strategy";

    pub fn pda(program_id: &Pubkey, pot: &Pubkey, slot_id: u16) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[Self::SEED, pot.as_ref(), &slot_id.to_le_bytes()],
            program_id,
        )
    }

    pub fn has_yield(&self) -> bool {
        !matches!(self.yield_target, YieldTarget::None)
    }

    pub fn is_executable(&self) -> bool {
        matches!(
            self.status,
            StrategyStatus::Pending | StrategyStatus::Active | StrategyStatus::Parked
        )
    }

    /// Check if any price trigger condition is satisfied.
    /// Pure function — used by keeper (off-chain) and execute_swap (on-chain).
    pub fn evaluate_trigger(&self, current_price_x64: u128) -> Option<TriggerReason> {
        if self.status != StrategyStatus::Active && self.status != StrategyStatus::Parked {
            return None;
        }

        if let Some(bps) = self.stop_loss_bps {
            let drop = (self.entry_price_x64 / 10_000).saturating_mul(bps as u128);
            let threshold = self.entry_price_x64.saturating_sub(drop);
            if current_price_x64 <= threshold {
                return Some(TriggerReason::StopLoss);
            }
        }

        if let Some(bps) = self.take_profit_bps {
            let rise = (self.entry_price_x64 / 10_000).saturating_mul(bps as u128);
            let threshold = self.entry_price_x64.saturating_add(rise);
            if current_price_x64 >= threshold {
                return Some(TriggerReason::TakeProfit);
            }
        }

        if let Some(bps) = self.trailing_stop_bps {
            let drop = (self.trailing_high_price_x64 / 10_000).saturating_mul(bps as u128);
            let threshold = self.trailing_high_price_x64.saturating_sub(drop);
            if current_price_x64 <= threshold {
                return Some(TriggerReason::TrailingStop);
            }
        }

        None
    }

    /// Bump trailing high if the new price is higher. Returns true if updated.
    pub fn bump_trailing_high(&mut self, observed_price_x64: u128) -> bool {
        if self.trailing_stop_bps.is_some() && observed_price_x64 > self.trailing_high_price_x64 {
            self.trailing_high_price_x64 = observed_price_x64;
            true
        } else {
            false
        }
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn blank() -> StrategyAccount {
        StrategyAccount {
            pot: Pubkey::default(),
            slot_id: 0,
            bump: 0,
            source: StrategySource::AdminDirect { admin: Pubkey::default() },
            status: StrategyStatus::Active,
            input_mint: Pubkey::default(),
            output_mint: Pubkey::default(),
            size_in: 1_000_000,
            size_out: 500_000,
            entry_price_x64: 100 << 64,
            trailing_high_price_x64: 100 << 64,
            pyth_price_feed: None,
            stop_loss_bps: None,
            take_profit_bps: None,
            trailing_stop_bps: None,
            yield_target: YieldTarget::None,
            yield_position: None,
            executor_nonce: 0,
            proposal_passed: false,
            created_at: 0,
            executed_at: 0,
            closed_at: 0,
            last_trigger_reason: TriggerReason::Manual,
            last_price_update_ts: 0,
            reserved: [0u8; 64],
        }
    }

    #[test]
    fn stop_loss_triggers_at_threshold() {
        let mut s = blank();
        s.stop_loss_bps = Some(1000); // 10%
        assert_eq!(s.evaluate_trigger(91 << 64), None);
        assert_eq!(s.evaluate_trigger(90 << 64), Some(TriggerReason::StopLoss));
        assert_eq!(s.evaluate_trigger(50 << 64), Some(TriggerReason::StopLoss));
    }

    #[test]
    fn take_profit_triggers_at_threshold() {
        let mut s = blank();
        s.take_profit_bps = Some(2500); // 25%
        assert_eq!(s.evaluate_trigger(124 << 64), None);
        assert_eq!(s.evaluate_trigger(125 << 64), Some(TriggerReason::TakeProfit));
    }

    #[test]
    fn trailing_stop_follows_high() {
        let mut s = blank();
        s.trailing_stop_bps = Some(500); // 5%
        assert_eq!(s.evaluate_trigger(96 << 64), None);
        assert!(s.bump_trailing_high(120 << 64));
        assert_eq!(s.trailing_high_price_x64, 120 << 64);
        assert_eq!(s.evaluate_trigger(115 << 64), None);
        assert_eq!(s.evaluate_trigger(114 << 64), Some(TriggerReason::TrailingStop));
    }

    #[test]
    fn closed_strategy_does_not_trigger() {
        let mut s = blank();
        s.stop_loss_bps = Some(1);
        s.status = StrategyStatus::Closed;
        assert_eq!(s.evaluate_trigger(0), None);
    }
}
