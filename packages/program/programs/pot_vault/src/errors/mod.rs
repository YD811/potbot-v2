use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // ─── Core pot errors ──────────────────────────────────────────────────
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
    #[msg("Timelock period has not elapsed — wait before executing this proposal")]
    TimelockNotExpired,

    // ─── Strategy vault errors (legacy) ───────────────────────────────────
    #[msg("Description must be 200 characters or less")]
    DescriptionTooLong,
    #[msg("Fee exceeds maximum allowed")]
    FeeTooHigh,
    #[msg("Invalid strategy configuration")]
    InvalidStrategyConfig,
    #[msg("Strategy vault is not active")]
    VaultNotActive,

    // ─── Premium feature errors ───────────────────────────────────────────
    #[msg("Pot shares are not tokenized yet")]
    NotTokenized,
    #[msg("Invalid invite code - must be 6 alphanumeric characters")]
    InvalidInviteCode,
    #[msg("Already a member of this pot")]
    AlreadyMember,
    #[msg("Invite limit reached for this private pot")]
    InviteLimitReached,
    #[msg("This pot is not private")]
    NotPrivatePot,
    #[msg("Invalid domain name - 3-32 chars, alphanumeric + hyphens only")]
    InvalidDomainName,
    #[msg("SNS domain already exists for this pot")]
    DomainAlreadyExists,
    #[msg("Tamagotchi NFT already created for this pot")]
    TamagotchiAlreadyExists,
    #[msg("Tamagotchi level has not changed")]
    TamagotchiNotEvolved,

    // ─── Strategy layer v2 — authorization ───────────────────────────────
    #[msg("Caller is not authorized as admin for this strategy")]
    StrategyNotAdmin,
    #[msg("SwapSpec in instruction data does not match proposal intent")]
    SwapSpecMismatch,
    #[msg("Proposal mismatch — proposal_id or pot does not match attached spec")]
    ProposalMismatch,
    #[msg("Strategy.pot does not match the pot supplied in this ix")]
    StrategyPotMismatch,
    #[msg("Caller is not allowed to execute this proposal")]
    ProposalExecutorForbidden,
    #[msg("SwapMode in args does not match strategy.source")]
    SwapModeMismatch,
    #[msg("Trigger reason in args does not match the on-chain oracle reading")]
    TriggerReasonMismatch,
    #[msg("MemberPermissions account is invalid (wrong PDA / wrong owner / corrupt data)")]
    MemberPermissionInvalid,

    // ─── Strategy layer v2 — execution guards ────────────────────────────
    #[msg("Swap output below min_out (slippage exceeded)")]
    SlippageExceeded,
    #[msg("Swap consumed more than max_in")]
    OverspentInput,
    #[msg("Strategy is not in an executable state")]
    StrategyInactive,
    #[msg("Strategy executor_nonce mismatch; possible replay")]
    StrategyNonceMismatch,
    #[msg("Input or output mint is not in pot allowlist")]
    MintNotAllowlisted,
    #[msg("Swap size exceeds SpendingLimit for this period")]
    SpendingLimitExceeded,
    #[msg("SpendingLimit is paused or expired")]
    SpendingLimitInactive,
    #[msg("amount_in is zero or otherwise invalid for this swap mode")]
    InvalidSwapAmount,
    #[msg("Vault token account ownership does not match the vault PDA")]
    VaultOwnerMismatch,

    // ─── Strategy layer v2 — triggers / oracles ──────────────────────────
    #[msg("Trigger condition not satisfied by current oracle price")]
    TriggerNotMet,
    #[msg("Pyth price feed is stale")]
    PriceStale,
    #[msg("Pyth price feed account does not match strategy.pyth_price_feed")]
    PriceFeedMismatch,
    #[msg("Strategy has no pyth feed configured; trusted keeper required")]
    NoPriceFeed,

    // ─── Strategy layer v2 — yield routing ───────────────────────────────
    #[msg("YieldTarget program does not match expected Kamino/Meteora id")]
    YieldTargetInvalid,
    #[msg("Yield position mismatch; expected previously-stored account")]
    YieldPositionMismatch,
    #[msg("Strategy has no yield leg but yield ix was supplied")]
    YieldNotConfigured,

    // ─── Strategy layer v2 — fee reserve ─────────────────────────────────
    #[msg("Fee reserve below threshold required to activate strategy")]
    FeeReserveTooLow,

    // ─── Math (alias of ArithmeticOverflow for new instructions) ─────────
    #[msg("Arithmetic overflow during fixed-point math")]
    MathOverflow,

    #[msg("Burn amount must be > 0")]
    InvalidBurnAmount,
    #[msg("Redemption would violate 20% reserve guard")]
    InsufficientReserve,
    #[msg("Cannot redeem while pot is paused")]
    RedemptionPausedWhilePotPaused,
    #[msg("Insufficient vault balance for redemption")]
    RedemptionInsufficientVault,
    #[msg("YieldTarget None is not routable")]
    YieldTargetNoneNotRoutable,
}

/// Alias used throughout instruction handlers.
pub type PotError = ErrorCode;
