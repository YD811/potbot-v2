use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("PotVLT111111111111111111111111111111111111");

#[program]
pub mod pot_vault {
    use super::*;

    /// Create a new collective trading vault (POT)
    pub fn create_pot(ctx: Context<CreatePot>, params: CreatePotParams) -> Result<()> {
        instructions::create_pot::handler(ctx, params)
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
}
