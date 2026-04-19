use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PrivatePotAccount {
    /// Associated pot
    pub pot: Pubkey,
    /// 6-character invite code (uppercase)
    #[max_len(6)]
    pub invite_code: String,
    /// List of invited member wallets
    #[max_len(100)] // Max 100 invited members
    pub invited_members: Vec<Pubkey>,
    /// Maximum number of invites allowed
    pub max_invites: u16,
    /// Creation timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}