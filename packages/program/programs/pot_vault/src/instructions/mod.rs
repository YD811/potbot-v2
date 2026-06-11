// Core pot operations
pub mod create_pot;
pub mod deposit;
pub mod withdraw;
pub mod create_proposal;
pub mod vote;
pub mod vote_as_delegate;
pub mod delegate;
pub mod execute_proposal;
pub mod update_tamagotchi;
pub mod strategy_vault;
pub mod init_token_mint;
pub mod redeem_tokens;
pub mod route_to_yield;

// Premium features
pub mod tokenize_shares;
pub mod create_sns_domain;
pub mod mint_tamagotchi_nft;
pub mod update_tamagotchi_metadata;

// NOTE: create_private_pot disabled — Anchor 0.30 macro bug with Vec<Pubkey> in init account
// pub mod create_private_pot;
// pub mod join_private_pot;

// Strategy layer v2
pub mod execute_swap;
pub mod create_strategy;
pub mod close_strategy;
pub mod mark_proposal_passed;
pub mod pot_admin;

// Security hardening (Phase A)
pub mod sentinel;

pub use create_pot::{CreatePot, CreatePotParams};
pub(crate) use create_pot::__client_accounts_create_pot;
pub use deposit::Deposit;
pub(crate) use deposit::__client_accounts_deposit;
pub use withdraw::Withdraw;
pub(crate) use withdraw::__client_accounts_withdraw;
pub use create_proposal::{CreateProposal, CreateProposalParams};
pub(crate) use create_proposal::__client_accounts_create_proposal;
pub use vote::Vote;
pub(crate) use vote::__client_accounts_vote;
pub use vote_as_delegate::VoteAsDelegate;
pub(crate) use vote_as_delegate::__client_accounts_vote_as_delegate;
pub use delegate::{register_handler, revoke_handler, RegisterDelegate, RevokeDelegate};
pub(crate) use delegate::{__client_accounts_register_delegate, __client_accounts_revoke_delegate};
pub use execute_proposal::ExecuteProposal;
pub(crate) use execute_proposal::__client_accounts_execute_proposal;
pub use update_tamagotchi::UpdateTamagotchi;
pub(crate) use update_tamagotchi::__client_accounts_update_tamagotchi;
pub use strategy_vault::{
    create_strategy_vault, evolve_tamagotchi, exit_strategy_vault, join_strategy_vault,
    CreateStrategyVault, EvolveTamagotchi, ExitStrategyVault, JoinStrategyVault,
    ParticipantExited, ParticipantJoined, StrategyVaultCreated, TamagotchiEvolved,
};
pub(crate) use strategy_vault::{
    __client_accounts_create_strategy_vault, __client_accounts_evolve_tamagotchi,
    __client_accounts_exit_strategy_vault, __client_accounts_join_strategy_vault,
};
pub use init_token_mint::InitTokenMint;
pub(crate) use init_token_mint::__client_accounts_init_token_mint;
pub use redeem_tokens::RedeemTokens;
pub(crate) use redeem_tokens::__client_accounts_redeem_tokens;
pub use route_to_yield::{RouteToYield, RouteToYieldArgs, YieldRouted};
pub(crate) use route_to_yield::__client_accounts_route_to_yield;
pub use tokenize_shares::{mint_tokens_to_member, MintTokensToMember, TokenizeShares};
pub(crate) use tokenize_shares::{__client_accounts_mint_tokens_to_member, __client_accounts_tokenize_shares};
pub use create_sns_domain::CreateSnsDomain;
pub(crate) use create_sns_domain::__client_accounts_create_sns_domain;
pub use mint_tamagotchi_nft::MintTamagotchiNft;
pub(crate) use mint_tamagotchi_nft::__client_accounts_mint_tamagotchi_nft;
pub use update_tamagotchi_metadata::UpdateTamagotchiMetadata;
pub(crate) use update_tamagotchi_metadata::__client_accounts_update_tamagotchi_metadata;
pub use execute_swap::{ExecuteSwap, ExecuteSwapArgs, SwapExecuted, SwapMode};
pub(crate) use execute_swap::__client_accounts_execute_swap;
pub use create_strategy::{
    CreateStrategy, CreateStrategyArgs, StrategyCreated, MIN_FEE_RESERVE_LAMPORTS,
};
pub(crate) use create_strategy::__client_accounts_create_strategy;
pub use close_strategy::{CloseStrategy, StrategyClosed};
pub(crate) use close_strategy::__client_accounts_close_strategy;
pub use mark_proposal_passed::{MarkProposalPassed, ProposalMarkedPassed};
pub(crate) use mark_proposal_passed::__client_accounts_mark_proposal_passed;
pub use pot_admin::{
    apply_pending_params, fund_fee_reserve, pause_pot, set_allowed_mints,
    set_allowed_programs, set_oracle_config, set_risk_timelock, set_spending_policy, unpause_pot,
    AllowedMintsUpdated, AllowedProgramsUpdated, ApplyPendingParams, FeeReserveFunded,
    FundFeeReserve, FundFeeReserveArgs, OracleConfigUpdated, PausePot, PendingParamsApplied,
    SetAllowedMints, SetAllowedMintsArgs, SetAllowedPrograms, SetAllowedProgramsArgs,
    SetOracleConfig, SetOracleConfigArgs, SetRiskTimelock,
    SetRiskTimelockArgs, SetSpendingPolicy, SetSpendingPolicyArgs,
};
pub(crate) use pot_admin::{
    __client_accounts_apply_pending_params, __client_accounts_fund_fee_reserve,
    __client_accounts_pause_pot, __client_accounts_set_allowed_mints,
    __client_accounts_set_allowed_programs, __client_accounts_set_oracle_config,
    __client_accounts_set_risk_timelock, __client_accounts_set_spending_policy,
};
pub use sentinel::{
    cancel_proposal, freeze_pot, set_sentinel, unfreeze_pot, CancelProposal, FreezePot,
    PotFrozenEvent, ProposalCancelled, SentinelUpdated, SetSentinel, UnfreezePot,
};
pub(crate) use sentinel::{
    __client_accounts_cancel_proposal, __client_accounts_freeze_pot,
    __client_accounts_set_sentinel, __client_accounts_unfreeze_pot,
};
