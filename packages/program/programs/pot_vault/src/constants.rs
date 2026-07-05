use anchor_lang::prelude::*;

/// PotBot v2 treasury address (fee collection)
pub const TREASURY_ADDRESS: Pubkey = pubkey!("2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o");

/// Fee constants (in lamports)
pub const TOKENIZATION_FEE: u64 = 100_000_000;  // 0.1 SOL
pub const SNS_DOMAIN_FEE: u64 = 250_000_000;     // 0.25 SOL
pub const TAMAGOTCHI_NFT_FEE: u64 = 50_000_000;  // 0.05 SOL
pub const POT_CREATION_FEE: u64 = 10_000_000;    // 0.01 SOL — protocol fee on create_pot

/// Tamagotchi level thresholds (XP)
pub const TAMAGOTCHI_THRESHOLDS: &[u64] = &[0, 100, 500, 2000, 8000, 25000];

/// Length limits
pub const MAX_POT_NAME_LEN: usize = 32;
pub const MAX_EMOJI_LEN: usize = 8;
pub const MAX_INVITE_CODE_LEN: usize = 6;
pub const MAX_DOMAIN_NAME_LEN: usize = 32;
pub const MAX_INVITED_MEMBERS: usize = 100;

// ─── Strategy vault constants ──────────────────────────────────────────────

/// Jupiter v6 aggregator program ID (stable across clusters)
pub const JUPITER_V6_PROGRAM_ID: Pubkey =
    pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

/// Hard program-wide slippage ceiling for all swaps (5%).
/// Prevents any single swap — regardless of mode — from losing more than
/// MAX_SLIPPAGE_BPS of value relative to the on-chain entry price.
pub const MAX_SLIPPAGE_BPS: u16 = 500;

/// PDA seed for StrategyAccount: ["strategy", pot_pubkey, slot_id_le_bytes]
pub const STRATEGY_SEED: &[u8] = b"strategy";

/// PDA seed for vault SOL/token escrow: ["vault", pot_pubkey]
pub const VAULT_SEED: &[u8] = b"vault";

/// Minimum fee reserve (lamports) before a triggered strategy can be created.
/// Ensures the keeper has gas budget to fire the trigger.
pub const MIN_FEE_RESERVE_LAMPORTS: u64 = 50_000_000; // 0.05 SOL

// ─── Index vault constants ────────────────────────────────────────────────

/// PDA seed for StrategyConfig: ["strategy", pot_pubkey]
/// (Same literal as STRATEGY_SEED; arity disambiguates from StrategyAccount.)
pub const STRATEGY_CONFIG_SEED: &[u8] = b"strategy";

/// PDA seed for the global TokenAllowlist: ["allowlist"]
pub const ALLOWLIST_SEED: &[u8] = b"allowlist";

/// PDA seed for StrategyPosition: ["position", pot, mint, [route as u8]]
pub const POSITION_SEED: &[u8] = b"position";

/// PDA seed for RedeemRequest: ["redeem", pot, member, id_le_bytes]
pub const REDEEM_SEED: &[u8] = b"redeem";

/// PDA seed for the index token mint: ["index_mint", pot]
pub const INDEX_MINT_SEED: &[u8] = b"index_mint";

/// Index token decimals (matches USDC so 1 token ≈ 1 USDC at bootstrap).
pub const INDEX_TOKEN_DECIMALS: u8 = 6;

/// Pyth push oracle program IDs (for ownership verification)
pub const PYTH_PROGRAM_MAINNET: Pubkey =
    pubkey!("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH");
pub const PYTH_PROGRAM_DEVNET: Pubkey =
    pubkey!("gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s");
