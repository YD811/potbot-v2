use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;

#[path = "errors/mod.rs"]
pub mod errors;
pub mod constants;

use instructions::*;

declare_id!("ED4zhABMV97obJSD5bzasUPaNVmc3qwA3WhwqoGVCDvH");

#[program]
pub mod pot_vault {
    use super::*;

    /// Create a new collective trading vault (POT)
    pub fn create_pot(ctx: Context<CreatePot>, params: CreatePotParams) -> Result<()> {
        instructions::create_pot::handler(ctx, params)
    }

    /// Create a private pot with invite code access
    pub fn create_private_pot(
        ctx: Context<CreatePrivatePot>,
        name: String,
        params: CreatePrivatePotParams,
    ) -> Result<()> {
        instructions::create_private_pot::handler(ctx, name, params)
    }

    /// Join a private pot using invite code
    pub fn join_private_pot(ctx: Context<JoinPrivatePot>, invite_code: String) -> Result<()> {
        instructions::join_private_pot::handler(ctx, invite_code)
    }

    /// Deposit SOL into a POT and receive proportional shares
    pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
        instructions::deposit::handler(ctx, lamports)
    }

    /// Withdraw SOL by burning shares
    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, shares)
    }

    /// Create a governance proposal (swap, withdraw, settings change, etc.)
    pub fn create_proposal(ctx: Context<CreateProposal>, params: CreateProposalParams) -> Result<()> {
        instructions::create_proposal::handler(ctx, params)
    }

    /// Vote on an active proposal (weighted by shares)
    pub fn vote(ctx: Context<Vote>, approve: bool) -> Result<()> {
        instructions::vote::handler(ctx, approve)
    }

    /// Execute a passed proposal
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        instructions::execute_proposal::handler(ctx)
    }

    /// Update tamagotchi level based on on-chain stats (permissionless crank)
    pub fn update_tamagotchi(ctx: Context<UpdateTamagotchi>) -> Result<()> {
        instructions::update_tamagotchi::handler(ctx)
    }

    /// Execute a swap with vault balance validation and stat updates
    pub fn execute_swap(ctx: Context<ExecuteSwap>, params: ExecuteSwapParams) -> Result<()> {
        instructions::execute_swap::handler(ctx, params)
    }

    /// Initialize an SPL token mint for a pot
    pub fn init_token_mint(ctx: Context<InitTokenMint>) -> Result<()> {
        instructions::init_token_mint::handler(ctx)
    }

    // ─── Premium Features (Paid) ────────────────────────────────────────────

    /// Tokenize shares - convert pot shares to SPL tokens (0.1 SOL fee)
    pub fn tokenize_shares(ctx: Context<TokenizeShares>) -> Result<()> {
        instructions::tokenize_shares::handler(ctx)
    }

    /// Mint tokens to existing members (after tokenization)
    pub fn mint_tokens_to_member(ctx: Context<MintTokensToMember>, shares_amount: u64) -> Result<()> {
        instructions::tokenize_shares::mint_tokens_to_member(ctx, shares_amount)
    }

    /// Create SNS subdomain (pot.potbot.sol) - 0.25 SOL fee
    pub fn create_sns_domain(ctx: Context<CreateSnsDomain>, domain_name: String) -> Result<()> {
        instructions::create_sns_domain::handler(ctx, domain_name)
    }

    /// Mint soulbound Tamagotchi NFT - 0.05 SOL fee
    pub fn mint_tamagotchi_nft(ctx: Context<MintTamagotchiNft>) -> Result<()> {
        instructions::mint_tamagotchi_nft::handler(ctx)
    }

    /// Update Tamagotchi NFT metadata on evolution (permissionless)
    pub fn update_tamagotchi_metadata(ctx: Context<UpdateTamagotchiMetadata>) -> Result<()> {
        instructions::update_tamagotchi_metadata::handler(ctx)
    }

    // ─── Strategy Vault ──────────────────────────────────────────────────────

    /// Create a tokenized Strategy Vault with creator monetization
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

    /// Join a Strategy Vault (pays entry fee, records referral)
    pub fn join_strategy_vault(
        ctx: Context<JoinStrategyVault>,
        referrer_wallet: Option<Pubkey>,
    ) -> Result<()> {
        instructions::strategy_vault::join_strategy_vault(ctx, referrer_wallet)
    }

    /// Exit a Strategy Vault (pays performance fee on profit)
    pub fn exit_strategy_vault(
        ctx: Context<ExitStrategyVault>,
        profit_lamports: u64,
    ) -> Result<()> {
        instructions::strategy_vault::exit_strategy_vault(ctx, profit_lamports)
    }

    /// Evolve the Tamagotchi (permissionless — anyone can call)
    pub fn evolve_tamagotchi(ctx: Context<EvolveTamagotchi>) -> Result<()> {
        instructions::strategy_vault::evolve_tamagotchi(ctx)
    }
}
