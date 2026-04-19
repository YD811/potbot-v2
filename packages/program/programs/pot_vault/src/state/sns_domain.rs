use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct SnsAccount {
    /// Associated pot
    pub pot: Pubkey,
    /// Domain name (e.g., "mypot")
    #[max_len(32)]
    pub domain_name: String,
    /// Full domain (e.g., "mypot.potbot.sol")
    #[max_len(48)]
    pub full_domain: String,
    /// Creation timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}