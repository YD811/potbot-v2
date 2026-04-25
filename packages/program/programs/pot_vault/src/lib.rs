use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod constants;
pub mod pyth;

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
        strategy_config: state::strategy_vault::StrategyConfig,
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

    /// Configure per-swap size cap and daily budget.
    pub fn set_spending_policy(
        ctx: Context<SetSpendingPolicy>,
        args: SetSpendingPolicyArgs,
    ) -> Result<()> {
        instructions::pot_admin::set_spending_policy(ctx, args)
    }
}
