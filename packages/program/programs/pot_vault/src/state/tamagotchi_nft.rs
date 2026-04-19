use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TamagotchiNftAccount {
    /// Associated pot
    pub pot: Pubkey,
    /// NFT mint address
    pub mint: Pubkey,
    /// Owner wallet (soulbound to this address)
    pub owner: Pubkey,
    /// Current tamagotchi level (0-5)
    pub level: u8,
    /// Current XP
    pub xp: u64,
    /// Creation timestamp
    pub created_at: i64,
    /// Last evolution timestamp
    pub last_evolved_at: i64,
    /// PDA bump
    pub bump: u8,
}