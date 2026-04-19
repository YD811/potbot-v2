use anchor_lang::prelude::*;

/// PotBot treasury address (YD's wallet for fee collection)
pub const TREASURY_ADDRESS: Pubkey = pubkey!("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");

/// Fee constants (in lamports)
pub const TOKENIZATION_FEE: u64 = 100_000_000;  // 0.1 SOL
pub const SNS_DOMAIN_FEE: u64 = 250_000_000;     // 0.25 SOL (reduced from 0.5)
pub const TAMAGOTCHI_NFT_FEE: u64 = 50_000_000;  // 0.05 SOL

/// Tamagotchi level thresholds
pub const TAMAGOTCHI_THRESHOLDS: &[u64] = &[
    0,      // Level 0
    100,    // Level 1
    500,    // Level 2  
    2000,   // Level 3
    8000,   // Level 4
    25000,  // Level 5
];

/// Maximum values
pub const MAX_POT_NAME_LEN: usize = 32;
pub const MAX_EMOJI_LEN: usize = 8;
pub const MAX_INVITE_CODE_LEN: usize = 6;
pub const MAX_DOMAIN_NAME_LEN: usize = 32;
pub const MAX_INVITED_MEMBERS: usize = 100;