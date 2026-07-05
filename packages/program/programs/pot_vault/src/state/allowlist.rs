use anchor_lang::prelude::*;

/// Asset class of an allowlisted token. Mirrors the client-side token
/// registry (`apps/web/src/lib/token-registry.ts`); the client registry must
/// always be a subset of this on-chain list.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Debug)]
pub enum TokenClass {
    Stable,
    StakedSol,
    RwaStock,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub struct AllowedToken {
    pub mint: Pubkey,
    pub class: TokenClass,
}

/// Global mint allowlist for index vaults. PDA: ["allowlist"].
/// The program rejects any index leg / deploy whose mint is not listed here.
/// Capacity 100 mints; MVP ships 20-30 liquid ones.
///
/// Distinct from the per-pot `allowed_mints` on PotAccount (trading
/// allowlist, 16 slots) — this one gates which assets may ever enter an
/// index composition, protocol-wide.
#[account]
#[derive(InitSpace)]
pub struct TokenAllowlist {
    /// Who may update the list (protocol multisig on mainnet).
    pub authority: Pubkey,
    pub bump: u8,

    #[max_len(100)]
    pub tokens: Vec<AllowedToken>,

    /// Forward-compatibility tail.
    pub reserved: [u8; 32],
}

impl TokenAllowlist {
    pub fn contains(&self, mint: &Pubkey) -> bool {
        self.tokens.iter().any(|t| &t.mint == mint)
    }

    pub fn class_of(&self, mint: &Pubkey) -> Option<TokenClass> {
        self.tokens.iter().find(|t| &t.mint == mint).map(|t| t.class)
    }
}
