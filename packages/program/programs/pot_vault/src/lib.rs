use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod constants;
pub mod pyth;
pub mod oracle;

#[path = "errors/mod.rs"]
pub mod errors;

// ─── Strategy layer state ──────────────────────────────────────────────────
// (these live inside state/ but are referenced cross-crate via crate::state::*)
// Module declarations are in state/mod.rs

// ─── CPI wrappers (Phase 4 yield routing) ─────────────────────────────────
// pub mod cpi { pub mod meteora_cpi; pub mod kamino_cpi; }
// Commented out until Phase 4 — uncomment when adding vault strategies.

use instructions::*;

declare_id!("GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK");

#[program]
pub mod pot_vault {
    use super::*;

    // ─── Core pot operations ───────────────────────────────────────────────

    pub fn create_pot(ctx: Context<CreatePot>, params: CreatePotParams) -> Result<()> {
        instructions::create_pot::handler(ctx, params)
    }

    pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
        instructions::deposit::handler(ctx, lamports)
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, shares)
    }

    // ─── Governance ────────────────────────────────────────────────────────

    pub fn create_proposal(ctx: Context<CreateProposal>, params: CreateProposalParams) -> Result<()> {
        instructions::create_proposal::handler(ctx, params)
    }

    pub fn vote(ctx: Context<Vote>, approve: bool) -> Result<()> {
        instructions::vote::handler(ctx, approve)
    }

    /// Vote on a proposal as a registered delegate (e.g. an AI agent) on behalf
    /// of a member. Vote weight comes from member.shares; double-vote prevented
    /// because VoterRecord is keyed by member.wallet (not delegate.delegate).
    pub fn vote_as_delegate(ctx: Context<VoteAsDelegate>, approve: bool) -> Result<()> {
        instructions::vote_as_delegate::handler(ctx, approve)
    }

    /// Register (or re-register) a delegate wallet that may sign votes for this
    /// member. `rules_uri` is an off-chain URI describing the delegate's
    /// voting policy — purely for transparency, not enforced on-chain.
    pub fn register_delegate(
        ctx: Context<RegisterDelegate>,
        delegate: Pubkey,
        rules_uri: String,
    ) -> Result<()> {
        instructions::delegate::register_handler(ctx, delegate, rules_uri)
    }

    /// Revoke an existing delegation. The PDA is preserved (not closed) so the
    /// audit trail remains visible on-chain.
    pub fn revoke_delegate(ctx: Context<RevokeDelegate>) -> Result<()> {
        instructions::delegate::revoke_handler(ctx)
    }

    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        instructions::execute_proposal::handler(ctx)
    }

    // ─── Tamagotchi ────────────────────────────────────────────────────────

    pub fn update_tamagotchi(ctx: Context<UpdateTamagotchi>) -> Result<()> {
        instructions::update_tamagotchi::handler(ctx)
    }

    // ─── Token / shares ────────────────────────────────────────────────────

    pub fn init_token_mint(ctx: Context<InitTokenMint>) -> Result<()> {
        instructions::init_token_mint::handler(ctx)
    }

    pub fn tokenize_shares(ctx: Context<TokenizeShares>) -> Result<()> {
        instructions::tokenize_shares::handler(ctx)
    }

    pub fn mint_tokens_to_member(ctx: Context<MintTokensToMember>, shares_amount: u64) -> Result<()> {
        instructions::tokenize_shares::mint_tokens_to_member(ctx, shares_amount)
    }

    /// Burn SPL share-tokens and receive SOL from the vault at NAV (liquid exit).
    /// Caps a single redemption at 80% of liquid vault balance.
    pub fn redeem_tokens(ctx: Context<RedeemTokens>, token_amount: u64) -> Result<()> {
        instructions::redeem_tokens::handler(ctx, token_amount)
    }

    // ─── Premium features ──────────────────────────────────────────────────

    pub fn create_sns_domain(ctx: Context<CreateSnsDomain>, domain_name: String) -> Result<()> {
        instructions::create_sns_domain::handler(ctx, domain_name)
    }

    pub fn mint_tamagotchi_nft(ctx: Context<MintTamagotchiNft>) -> Result<()> {
        instructions::mint_tamagotchi_nft::handler(ctx)
    }

    pub fn update_tamagotchi_metadata(ctx: Context<UpdateTamagotchiMetadata>) -> Result<()> {
        instructions::update_tamagotchi_metadata::handler(ctx)
    }

    // ─── Strategy vault (legacy — kept for backward compat) ───────────────

    pub fn create_strategy_vault(
        ctx: Context<CreateStrategyVault>,
        pot_name: String,
        description: String,
        entry_fee_lamports: u64,
        performance_fee_bps: u16,
        management_fee_bps: u16,
        referral_bps: u16,
        strategy_config: state::strategy_vault::LegacyStrategyConfig,
    ) -> Result<()> {
        instructions::strategy_vault::create_strategy_vault(
            ctx, pot_name, description, entry_fee_lamports,
            performance_fee_bps, management_fee_bps, referral_bps, strategy_config,
        )
    }

    pub fn join_strategy_vault(
        ctx: Context<JoinStrategyVault>,
        referrer_wallet: Option<Pubkey>,
    ) -> Result<()> {
        instructions::strategy_vault::join_strategy_vault(ctx, referrer_wallet)
    }

    pub fn exit_strategy_vault(
        ctx: Context<ExitStrategyVault>,
        profit_lamports: u64,
    ) -> Result<()> {
        instructions::strategy_vault::exit_strategy_vault(ctx, profit_lamports)
    }

    pub fn evolve_tamagotchi(ctx: Context<EvolveTamagotchi>) -> Result<()> {
        instructions::strategy_vault::evolve_tamagotchi(ctx)
    }

    // ─── Strategy layer v2 (Phase 0–3) ────────────────────────────────────

    /// Create a strategy slot (SL/TP/trailing + optional yield leg).
    /// Entry swap happens separately via execute_swap.
    pub fn create_strategy(
        ctx: Context<CreateStrategy>,
        args: CreateStrategyArgs,
    ) -> Result<()> {
        instructions::create_strategy::handler(ctx, args)
    }

    /// Close a Pending or Closed strategy and reclaim rent.
    pub fn close_strategy(
        ctx: Context<CloseStrategy>,
    ) -> Result<()> {
        instructions::close_strategy::handler(ctx)
    }

    /// Mark a Proposal-sourced strategy as passed (admin-only, idempotent).
    /// Sets strategy.proposal_passed = true, enabling execute_swap(Proposal).
    pub fn mark_proposal_passed(
        ctx: Context<MarkProposalPassed>,
    ) -> Result<()> {
        instructions::mark_proposal_passed::handler(ctx)
    }

    /// Execute a Jupiter v6 swap on behalf of a pot vault.
    /// Three auth modes: AdminDirect | Proposal | StrategyTrigger.
    pub fn execute_swap<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteSwap<'info>>,
        args: ExecuteSwapArgs,
    ) -> Result<()> {
        instructions::execute_swap::handler(ctx, args)
    }

    // ─── Pot admin ops ────────────────────────────────────────────────────

    /// Emergency pause — blocks all execute_swap calls on this pot.
    pub fn pause_pot(ctx: Context<PausePot>) -> Result<()> {
        instructions::pot_admin::pause_pot(ctx)
    }

    /// Resume a paused pot.
    pub fn unpause_pot(ctx: Context<PausePot>) -> Result<()> {
        instructions::pot_admin::unpause_pot(ctx)
    }

    /// Set the mint allowlist and keeper agent authority for this pot.
    pub fn set_allowed_mints(
        ctx: Context<SetAllowedMints>,
        args: SetAllowedMintsArgs,
    ) -> Result<()> {
        instructions::pot_admin::set_allowed_mints(ctx, args)
    }

    /// Configure per-swap size cap and daily budget. When a risk-param
    /// timelock is configured, loosening changes are staged and only take
    /// effect after the delay (see apply_pending_params).
    pub fn set_spending_policy(
        ctx: Context<SetSpendingPolicy>,
        args: SetSpendingPolicyArgs,
    ) -> Result<()> {
        instructions::pot_admin::set_spending_policy(ctx, args)
    }

    /// Fund the pot's keeper-gas reserve.
    pub fn fund_fee_reserve(
        ctx: Context<FundFeeReserve>,
        args: FundFeeReserveArgs,
    ) -> Result<()> {
        instructions::pot_admin::fund_fee_reserve(ctx, args)
    }

    // ─── Security hardening (Phase A) ─────────────────────────────────────

    /// Assign or clear the sentinel/guardian wallet. The sentinel can
    /// freeze the pot and cancel proposals but can NEVER move funds.
    pub fn set_sentinel(
        ctx: Context<SetSentinel>,
        new_sentinel: Option<Pubkey>,
    ) -> Result<()> {
        instructions::sentinel::set_sentinel(ctx, new_sentinel)
    }

    /// Freeze the pot (sentinel or authority). Blocks deposits, proposal
    /// execution, swaps and strategy creation. Member withdrawals stay open.
    pub fn freeze_pot(ctx: Context<FreezePot>) -> Result<()> {
        instructions::sentinel::freeze_pot(ctx)
    }

    /// Unfreeze the pot — authority only.
    pub fn unfreeze_pot(ctx: Context<UnfreezePot>) -> Result<()> {
        instructions::sentinel::unfreeze_pot(ctx)
    }

    /// Cancel an Active or Passed proposal (sentinel, authority or proposer).
    pub fn cancel_proposal(ctx: Context<CancelProposal>) -> Result<()> {
        instructions::sentinel::cancel_proposal(ctx)
    }

    /// Set the program-id allowlist for external CPI targets.
    pub fn set_allowed_programs(
        ctx: Context<SetAllowedPrograms>,
        args: SetAllowedProgramsArgs,
    ) -> Result<()> {
        instructions::pot_admin::set_allowed_programs(ctx, args)
    }

    /// Configure the risk-param timelock and per-asset exposure cap.
    pub fn set_risk_timelock(
        ctx: Context<SetRiskTimelock>,
        args: SetRiskTimelockArgs,
    ) -> Result<()> {
        instructions::pot_admin::set_risk_timelock(ctx, args)
    }

    /// Permissionless crank: apply a staged risky-param change once its
    /// timelock has elapsed.
    pub fn apply_pending_params(ctx: Context<ApplyPendingParams>) -> Result<()> {
        instructions::pot_admin::apply_pending_params(ctx)
    }

    /// Configure the pot's oracle source, confidence bound, and swap
    /// deviation guard (Phase A). Authority-only.
    pub fn set_oracle_config(
        ctx: Context<SetOracleConfig>,
        args: SetOracleConfigArgs,
    ) -> Result<()> {
        instructions::pot_admin::set_oracle_config(ctx, args)
    }

    // ─── Yield routing (Phase 4 stub — emit-only) ─────────────────────────

    /// Route idle vault SOL to a yield protocol (Kamino / Meteora).
    /// Phase 4 stub: validates allocation guards and emits an event without
    /// performing the external CPI. Real integration ships post-hackathon.
    pub fn route_to_yield(
        ctx: Context<RouteToYield>,
        args: RouteToYieldArgs,
    ) -> Result<()> {
        instructions::route_to_yield::handler(ctx, args)
    }

    // ─── Index vault layer (flagship POT-1) ────────────────────────────────

    /// Bootstrap the global mint allowlist (protocol authority = signer).
    pub fn init_allowlist(
        ctx: Context<InitAllowlist>,
        tokens: Vec<state::AllowedToken>,
    ) -> Result<()> {
        instructions::index_admin::init_allowlist_handler(ctx, tokens)
    }

    /// Replace the global mint allowlist (authority only).
    pub fn set_allowlist(
        ctx: Context<SetAllowlist>,
        tokens: Vec<state::AllowedToken>,
    ) -> Result<()> {
        instructions::index_admin::set_allowlist_handler(ctx, tokens)
    }

    /// Step 1 of the index bootstrap: create the iPOT mint (authority =
    /// vault PDA). Pot authority only.
    pub fn init_index_mint(ctx: Context<InitIndexMint>) -> Result<()> {
        instructions::index_admin::init_index_mint_handler(ctx)
    }

    /// Step 2: initialize StrategyConfig (weights, caps, keeper, flagship
    /// flag). Vault ATAs are created client-side. Pot authority only.
    pub fn init_strategy_config(
        ctx: Context<InitStrategyConfig>,
        args: InitStrategyConfigArgs,
    ) -> Result<()> {
        instructions::index_admin::init_strategy_config_handler(ctx, args)
    }

    /// Tune launch guards / weights / keeper (pot authority only).
    pub fn update_strategy_config(
        ctx: Context<UpdateStrategyConfig>,
        args: UpdateStrategyConfigArgs,
    ) -> Result<()> {
        instructions::index_admin::update_strategy_config_handler(ctx, args)
    }

    /// Pause (authority or sentinel) / unpause (authority) deposits+deploys.
    /// Redemptions stay open.
    pub fn set_strategy_paused(ctx: Context<SetStrategyPaused>, paused: bool) -> Result<()> {
        instructions::index_admin::set_strategy_paused_handler(ctx, paused)
    }

    /// Keeper NAV crank: write total NAV in base units, guarded by
    /// staleness monotonicity + deviation cap.
    pub fn update_nav_snapshot(ctx: Context<UpdateNavSnapshot>, value_base: u64) -> Result<()> {
        instructions::index_admin::update_nav_snapshot_handler(ctx, value_base)
    }

    /// Deposit base (USDC) → mint iPOT index tokens at NAV.
    pub fn deposit_base(
        ctx: Context<DepositBase>,
        amount_base: u64,
        min_shares_out: u64,
    ) -> Result<()> {
        instructions::index_vault::deposit_base_handler(ctx, amount_base, min_shares_out)
    }

    /// Burn iPOT at NAV, paid instantly from the idle buffer.
    pub fn redeem_instant(
        ctx: Context<RedeemInstant>,
        index_amount: u64,
        min_out_base: u64,
    ) -> Result<()> {
        instructions::index_vault::redeem_instant_handler(ctx, index_amount, min_out_base)
    }

    /// Queue a redemption the idle buffer can't serve (escrows iPOT now,
    /// prices at settlement NAV).
    pub fn request_redeem(
        ctx: Context<RequestRedeem>,
        index_amount: u64,
        min_out_base: u64,
    ) -> Result<()> {
        instructions::index_vault::request_redeem_handler(ctx, index_amount, min_out_base)
    }

    /// Settle a queued redemption (permissionless crank; payout only ever
    /// reaches the requester's ATA).
    pub fn settle_redeem(ctx: Context<SettleRedeem>) -> Result<()> {
        instructions::index_vault::settle_redeem_handler(ctx)
    }

    /// Cancel own queued redemption; escrowed iPOT returns.
    pub fn cancel_redeem(ctx: Context<CancelRedeem>) -> Result<()> {
        instructions::index_vault::cancel_redeem_handler(ctx)
    }

    /// One-time per-leg position bootstrap, step 1: position record.
    pub fn init_position(ctx: Context<InitPosition>, route: state::RouteKind) -> Result<()> {
        instructions::index_deploy::init_position_handler(ctx, route)
    }

    /// One-time per-leg position bootstrap, step 2: escrow token account.
    pub fn init_position_vault(
        ctx: Context<InitPositionVault>,
        route: state::RouteKind,
    ) -> Result<()> {
        instructions::index_deploy::init_position_vault_handler(ctx, route)
    }

    /// Keeper: move idle base into a configured index leg (capped, idle
    /// buffer preserved). Phase-2 protocol CPIs plug into this seam.
    pub fn deploy_to_strategy(
        ctx: Context<DeployToStrategy>,
        route: state::RouteKind,
        amount_base: u64,
    ) -> Result<()> {
        instructions::index_deploy::deploy_to_strategy_handler(ctx, route, amount_base)
    }

    /// Keeper: unwind a leg back into the idle buffer (allowed even while
    /// paused — pausing must never trap capital).
    pub fn withdraw_from_strategy(
        ctx: Context<WithdrawFromStrategy>,
        route: state::RouteKind,
        amount_base: u64,
    ) -> Result<()> {
        instructions::index_deploy::withdraw_from_strategy_handler(ctx, route, amount_base)
    }
}
