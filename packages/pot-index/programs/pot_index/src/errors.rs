use anchor_lang::prelude::*;

#[error_code]
pub enum PotError {
    #[msg("Unauthorized")]
    Unauthorized, // 6000
    #[msg("Protocol is paused")]
    ProtocolPaused,
    #[msg("Pot deposits are paused")]
    PotPaused,
    #[msg("Pot is not finalized yet")]
    PotNotFinalized,
    #[msg("Pot is already finalized")]
    PotAlreadyFinalized,
    #[msg("Too many legs")]
    TooManyLegs, // 6005
    #[msg("Too few legs")]
    TooFewLegs,
    #[msg("Weights must sum to 10000 bps")]
    WeightsDoNotSum,
    #[msg("Weight must be between 1 and 10000 bps")]
    InvalidWeight,
    #[msg("Asset already in this Pot")]
    DuplicateLeg,
    #[msg("Asset is not enabled")]
    AssetDisabled, // 6010
    #[msg("Name or symbol too long")]
    NameTooLong,
    #[msg("Invalid pot parameters")]
    InvalidParams,
    #[msg("Wrong number of remaining accounts")]
    RemainingAccountsMismatch,
    #[msg("Vault account does not match the leg")]
    VaultMismatch,
    #[msg("Price account is not owned by the Pyth receiver")]
    BadOracleOwner, // 6015
    #[msg("Oracle price is stale or unavailable")]
    StalePrice,
    #[msg("Oracle confidence too wide")]
    OracleConfidence,
    #[msg("Oracle price is not positive")]
    NonPositivePrice,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Deposit below minimum")]
    DepositTooSmall, // 6020
    #[msg("Deposit would exceed the Pot cap")]
    DepositCapExceeded,
    #[msg("Fewer shares than min_shares_out")]
    SlippageShares,
    #[msg("Fewer assets than min_assets_out")]
    SlippageAssets,
    #[msg("Nothing to redeem")]
    ZeroShares,
    #[msg("Referrer cannot be the depositor")]
    SelfReferral, // 6025
    #[msg("Token account owner mismatch")]
    TokenOwnerMismatch,
    #[msg("Token account mint mismatch")]
    TokenMintMismatch,
    #[msg("A rebalance is already open")]
    RebalanceOpen,
    #[msg("No rebalance is open")]
    RebalanceNotOpen,
    #[msg("Rebalance must be opened and closed in the same transaction")]
    RebalanceWrongSlot, // 6030
    #[msg("Instruction must be called at transaction level, not via CPI")]
    CpiNotAllowed,
    #[msg("rebalance_close must follow rebalance_open in the same transaction")]
    MissingClose,
    #[msg("Invalid leg index")]
    InvalidLeg,
    #[msg("Leg is not overweight; nothing to sell")]
    NotOverweight,
    #[msg("Trade would push the sold leg below its target")]
    OvershootOut, // 6035
    #[msg("Trade would push the bought leg above its target")]
    OvershootIn,
    #[msg("Trade exceeds max_trade_bps of NAV")]
    TradeTooLarge,
    #[msg("Received less than min_in")]
    RebalanceSlippage,
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Leg count mismatch")]
    LegCountMismatch, // 6040
}
