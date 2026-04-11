use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MemberAccount {
    /// The POT this member belongs to
    pub pot: Pubkey,
    /// Member's wallet
    pub wallet: Pubkey,
    /// Share units owned
    pub shares: u64,
    /// Total deposited (for P&L tracking)
    pub deposit_total: u64,
    /// Total withdrawn (for P&L tracking)
    pub withdraw_total: u64,
    /// When the member joined
    pub joined_at: i64,
    /// Last deposit timestamp (for lockup enforcement)
    pub last_deposit_at: i64,
    /// Bump seed
    pub bump: u8,
}

impl MemberAccount {
    /// Check if lockup period has passed since last deposit
    pub fn can_withdraw(&self, lockup_seconds: i64, now: i64) -> bool {
        if lockup_seconds == 0 {
            return true;
        }
        now >= self.last_deposit_at + lockup_seconds
    }
}
