use anchor_lang::prelude::*;

/// Tracks that a specific wallet has already voted on a specific proposal.
/// PDA: [b"voter", proposal_pubkey, voter_pubkey]
/// Using `init` (not `init_if_needed`) means the tx fails if this already exists —
/// which is exactly the double-vote prevention mechanism.
#[account]
#[derive(InitSpace)]
pub struct VoterRecord {
    /// The proposal this vote is for
    pub proposal: Pubkey,
    /// The voter's wallet
    pub voter: Pubkey,
    /// Whether they voted YES (true) or NO (false)
    pub voted_yes: bool,
    /// Timestamp of vote
    pub voted_at: i64,
    /// PDA bump
    pub bump: u8,
}
