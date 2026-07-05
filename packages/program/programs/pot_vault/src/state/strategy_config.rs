use anchor_lang::prelude::*;

/// Where deployed capital for one index leg lives. `Hold` keeps the leg in
/// the vault-owned position ATA (book-value NAV); protocol routes plug their
/// CPI adapters into the same `deploy_to_strategy` seam in Phase 2.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Debug)]
pub enum RouteKind {
    Hold,
    KaminoLend,
    KaminoLiquidity,
    MeteoraDlmm,
}

impl Default for RouteKind {
    fn default() -> Self {
        RouteKind::Hold
    }
}

/// One leg of the index: a target weight for a mint, executed via a route.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, Default)]
pub struct WeightEntry {
    pub mint: Pubkey,
    /// Target allocation in bps. All active entries must sum to 10_000.
    pub weight_bps: u16,
    pub route: RouteKind,
}

/// Per-pot strategy/index configuration. PDA: ["strategy", pot].
/// (Distinct from StrategyAccount, which is ["strategy", pot, slot_id_le] —
/// different seed arity yields a different address.)
///
/// This is the control surface for the index vault: target weights, rebalance
/// band, caps, idle buffer, NAV guards, and the allowlisted keeper identity.
/// The keeper can only crank (deploy/withdraw/nav) inside these caps — it can
/// never widen them; only the pot authority can, and loosening changes go
/// through the existing risk-param timelock philosophy.
#[account]
#[derive(InitSpace)]
pub struct StrategyConfig {
    pub pot: Pubkey,
    pub bump: u8,

    /// Base/accounting mint (USDC). Deposits, redemptions, NAV and caps are
    /// all denominated in this mint's base units.
    pub base_mint: Pubkey,

    /// Allowlisted keeper pubkey. Only this key may crank
    /// deploy/withdraw/update_nav_snapshot. It can NEVER receive funds.
    pub keeper: Pubkey,

    /// Target composition. Only the first `weights_count` entries are active.
    pub weights: [WeightEntry; 10],
    pub weights_count: u8,

    /// Rebalance band around each target weight, in bps (±).
    pub band_bps: u16,

    /// Max slippage on any strategy leg execution, in bps.
    pub max_slippage_bps: u16,

    /// Share of NAV kept as idle base-mint liquidity for instant redemptions,
    /// in bps (e.g. 750 = 7.5%). deploy_to_strategy may not breach it.
    pub idle_buffer_bps: u16,

    /// Hard cap on total NAV in base units. 0 = uncapped.
    pub tvl_cap: u64,

    /// Per-deposit bounds in base units. deposit_max == 0 = uncapped.
    pub deposit_min: u64,
    pub deposit_max: u64,

    /// Reserved protocol-fee surface (bps). Fee switch is OFF until
    /// governance enables it; kept in the layout so enabling is not a
    /// migration.
    pub fee_reserved_bps: u16,

    /// NAV snapshot freshness bound, in slots. Mint/redeem refuse to price
    /// against a snapshot older than this.
    pub nav_staleness_slots: u64,

    /// Max accepted NAV move between two consecutive snapshots, in bps.
    /// Defends mint/redeem pricing against a fat-fingered or hijacked keeper.
    /// 0 = guard disabled (bootstrap only).
    pub max_nav_deviation_bps: u16,

    /// Kill switch for deposits/deploys (redemptions stay open — member
    /// exits are never blockable).
    pub paused: bool,

    /// Total index tokens sitting in the redeem queue awaiting settlement.
    pub pending_redeem_shares: u64,

    /// Monotonic id source for RedeemRequest PDAs.
    pub next_redeem_id: u64,

    /// Forward-compatibility tail. Reduce by exactly the InitSpace of any
    /// field you add.
    pub reserved: [u8; 64],
}

impl StrategyConfig {
    /// Sum of active target weights; must equal 10_000 to be valid.
    pub fn weights_sum_bps(&self) -> u32 {
        self.weights[..self.weights_count as usize]
            .iter()
            .map(|w| w.weight_bps as u32)
            .sum()
    }

    /// The active weight entry for `mint`, if configured.
    pub fn weight_for_mint(&self, mint: &Pubkey) -> Option<&WeightEntry> {
        self.weights[..self.weights_count as usize]
            .iter()
            .find(|w| &w.mint == mint)
    }

    /// Minimum idle base-mint balance the vault must retain after a deploy,
    /// given the current NAV in base units.
    pub fn idle_floor(&self, nav_base: u64) -> u64 {
        ((nav_base as u128).saturating_mul(self.idle_buffer_bps as u128) / 10_000) as u64
    }
}
