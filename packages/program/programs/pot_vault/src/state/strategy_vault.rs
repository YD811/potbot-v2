use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum RiskLevel {
    Conservative,
    Balanced,
    Degen,
}

impl Default for RiskLevel {
    fn default() -> Self {
        RiskLevel::Balanced
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum StrategyType {
    AiDca,
    TrendFollowing,
    MeanReversion,
    Hodl,
    Degen,
    Yield,
}

impl Default for StrategyType {
    fn default() -> Self {
        StrategyType::AiDca
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default)]
pub struct StrategyConfig {
    pub risk_level: RiskLevel,
    pub max_swap_pct: u8,        // max % of vault per swap (1-100)
    pub ai_rules_hash: [u8; 32], // SHA256 of AI rules JSON (stored off-chain)
    pub strategy_type: StrategyType,
}

#[account]
pub struct StrategyVaultAccount {
    pub pot_pubkey: Pubkey,  // links to the base PotAccount
    pub creator: Pubkey,     // vault creator wallet
    pub is_active: bool,

    // Fee config
    pub entry_fee_lamports: u64,  // flat entry fee in lamports
    pub performance_fee_bps: u16, // e.g. 2000 = 20%
    pub management_fee_bps: u16,  // annual, e.g. 200 = 2%
    pub referral_bps: u16,        // % of PotBot fee to referrer, e.g. 2000 = 20%

    // Strategy
    pub strategy_config: StrategyConfig,
    pub description: String, // max 200 chars
    pub allowed_token_count: u8,

    // Tamagotchi
    pub tamagotchi_level: u8, // 0=Egg, 1=Chick, 2=Fledgling, 3=Eagle, 4=Dragon, 5=Titan
    pub total_aum_usd_snapshot: u64, // updated by crank, in cents (USD * 100)

    // Revenue tracking
    pub total_entry_fees_collected: u64,
    pub total_performance_fees_collected: u64,
    pub total_referral_payouts: u64,
    pub total_referrers: u32,

    // Timestamps
    pub created_at: i64,
    pub last_fee_crank_at: i64,

    pub bump: u8,
}

impl StrategyVaultAccount {
    pub const LEN: usize = 8  // discriminator
        + 32  // pot_pubkey
        + 32  // creator
        + 1   // is_active
        + 8   // entry_fee_lamports
        + 2   // performance_fee_bps
        + 2   // management_fee_bps
        + 2   // referral_bps
        + 64  // strategy_config
        + 204 // description (4 len prefix + 200 chars)
        + 1   // allowed_token_count
        + 1   // tamagotchi_level
        + 8   // total_aum_usd_snapshot
        + 8   // total_entry_fees_collected
        + 8   // total_performance_fees_collected
        + 8   // total_referral_payouts
        + 4   // total_referrers
        + 8   // created_at
        + 8   // last_fee_crank_at
        + 1;  // bump

    /// Compute tamagotchi level from member_count and aum_usd_cents (USD * 100)
    pub fn compute_tamagotchi_level(member_count: u32, aum_usd_cents: u64) -> u8 {
        if member_count >= 1000 || aum_usd_cents >= 500_000 * 100 { return 5; }
        if member_count >= 500  || aum_usd_cents >= 250_000 * 100 { return 4; }
        if member_count >= 200  || aum_usd_cents >= 100_000 * 100 { return 3; }
        if member_count >= 50   || aum_usd_cents >= 25_000  * 100 { return 2; }
        if member_count >= 10   || aum_usd_cents >= 5_000   * 100 { return 1; }
        0
    }

    /// Swap fee bps by tamagotchi level
    pub fn swap_fee_bps(&self) -> u16 {
        match self.tamagotchi_level {
            0 => 50, 1 => 45, 2 => 40, 3 => 30, 4 => 20, 5 => 10, _ => 50,
        }
    }

    /// Entry fee discount bps by tamagotchi level
    pub fn entry_fee_discount_bps(&self) -> u16 {
        match self.tamagotchi_level {
            0 => 0, 1 => 500, 2 => 1000, 3 => 2000, 4 => 3500, 5 => 5000, _ => 0,
        }
    }
}

#[account]
pub struct ReferralAccount {
    pub vault_pubkey: Pubkey,
    pub referrer: Pubkey,
    pub referee: Pubkey,
    pub level: u8,
    pub total_earned_lamports: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl ReferralAccount {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 8 + 8 + 1;
}