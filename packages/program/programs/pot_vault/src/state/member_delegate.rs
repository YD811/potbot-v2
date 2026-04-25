use anchor_lang::prelude::*;

/// Allows a member to register a delegate wallet (typically an AI agent)
/// that can sign votes on the member's behalf without holding their main key.
///
/// PDA: [b"delegate", pot_pubkey, member_wallet_pubkey]
/// One delegate per (pot, member). Re-registering replaces the previous one.
/// Revocation sets `revoked_at` (the account is kept for audit trail).
#[account]
#[derive(InitSpace)]
pub struct MemberDelegate {
    /// The POT this delegation applies to
    pub pot: Pubkey,
    /// The member's wallet (the account whose voting power is delegated)
    pub member: Pubkey,
    /// The delegate's wallet (the AI agent that may sign votes)
    pub delegate: Pubkey,
    /// IPFS / Arweave / https URI describing the agent's voting policy.
    /// On-chain program does NOT enforce this — it's a transparency artefact
    /// that lets other members audit the AI's behaviour and revoke if needed.
    #[max_len(200)]
    pub rules_uri: String,
    /// Bitmask of proposal-type indices the delegate is allowed to vote on.
    /// 0 means "all proposal types" (default for v1).
    /// Reserved for future per-type scoping.
    pub scope_mask: u64,
    /// Unix timestamp when the delegation was registered or last updated.
    pub registered_at: i64,
    /// Unix timestamp when the delegation was revoked. 0 = active.
    pub revoked_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl MemberDelegate {
    pub fn is_active(&self) -> bool {
        self.revoked_at == 0
    }
}
