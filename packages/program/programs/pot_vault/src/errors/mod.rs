use anchor_lang::prelude::*;

#[error_code]
pub enum PotError {
    #[msg("Name must be 1-32 characters")]
    InvalidName,
    #[msg("Deposit below minimum")]
    DepositTooSmall,
    #[msg("Insufficient shares for withdrawal")]
    InsufficientShares,
    #[msg("Lockup period has not elapsed")]
    LockupActive,
    #[msg("Not authorized to perform this action")]
    Unauthorized,
    #[msg("POT is not public \u2014 invite required")]
    NotPublic,
    #[msg("Proposal is not active")]
    ProposalNotActive,
    #[msg("Already voted on this proposal")]
    AlreadyVoted,
    #[msg("Proposal has not passed")]
    ProposalNotPassed,
    #[msg("Proposal has already been executed")]
    ProposalAlreadyExecuted,
    #[msg("Governance level does not permit this action")]
    GovernanceBlocked,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Vault balance too low")]
    InsufficientVaultBalance,
    #[msg("Member not found in this POT")]
    MemberNotFound,
    #[msg("Invalid yield strategy value")]
    InvalidYieldStrategy,
    #[msg("Quorum not reached")]
    QuorumNotReached,
    #[msg("Swap size exceeds vault max_trade_size_bps limit")]
    TradeSizeExceeded,
    #[msg("Daily trade limit reached for this vault")]
    DailyTradeLimitReached,
    #[msg("AI agent is rate limited \u2014 too many proposals today")]
    AgentRateLimited,
    #[msg("Vault has reached maximum member count")]
    MaxMembersReached,
    #[msg("AI agent not configured for this POT")]
    AgentNotConfigured,
    #[msg("Pot is already tokenized \u2014 transition is one-way")]
    AlreadyTokenized,
    #[msg("Amount exceeds idle yield allocation limit")]
    ExceedsYieldAllocation,
}
