use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Name must be 1-32 characters")]
    InvalidPotName,
    #[msg("Deposit below minimum")]
    DepositTooSmall,
    #[msg("Insufficient shares for withdrawal")]
    InsufficientShares,
    #[msg("Lockup period has not elapsed")]
    LockupActive,
    #[msg("Not authorized to perform this action")]
    UnauthorizedAccess,
    #[msg("POT is not public - invite required")]
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
    ArithmeticOverflow,
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
    #[msg("AI agent is rate limited - too many proposals today")]
    AgentRateLimited,
    #[msg("Vault has reached maximum member count")]
    MaxMembersReached,
    #[msg("AI agent not configured for this POT")]
    AgentNotConfigured,
    #[msg("Pot is already tokenized - transition is one-way")]
    AlreadyTokenized,
    #[msg("Amount exceeds idle yield allocation limit")]
    ExceedsYieldAllocation,
    // Strategy Vault errors
    #[msg("Description must be 200 characters or less")]
    DescriptionTooLong,
    #[msg("Fee exceeds maximum allowed")]
    FeeTooHigh,
    #[msg("Invalid strategy configuration")]
    InvalidStrategyConfig,
    #[msg("Strategy vault is not active")]
    VaultNotActive,
    
    // ─── Premium Feature Errors ──────────────────────────────────────────
    
    // Tokenization
    #[msg("Pot shares are not tokenized yet")]
    NotTokenized,
    
    // Private Pots
    #[msg("Invalid invite code - must be 6 alphanumeric characters")]
    InvalidInviteCode,
    #[msg("Already a member of this pot")]
    AlreadyMember,
    #[msg("Invite limit reached for this private pot")]
    InviteLimitReached,
    #[msg("This pot is not private")]
    NotPrivatePot,
    
    // SNS Domains
    #[msg("Invalid domain name - 3-32 chars, alphanumeric + hyphens only")]
    InvalidDomainName,
    #[msg("SNS domain already exists for this pot")]
    DomainAlreadyExists,
    
    // Tamagotchi NFT
    #[msg("Tamagotchi NFT already created for this pot")]
    TamagotchiAlreadyExists,
    #[msg("Tamagotchi level has not changed")]
    TamagotchiNotEvolved,
}

/// Alias used throughout instruction handlers
pub type PotError = ErrorCode;
