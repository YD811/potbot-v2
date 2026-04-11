use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PotError;

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub pot: Account<'info, PotAccount>,

    /// CHECK: PDA vault
    #[account(
        mut,
        seeds = [b"vault", pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        has_one = pot @ PotError::Unauthorized,
    )]
    pub proposal: Account<'info, ProposalAccount>,

    #[account(mut)]
    pub executor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecuteProposal>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;

    require!(
        proposal.status == ProposalStatus::Passed,
        PotError::ProposalNotPassed
    );

    // Mark as executed
    proposal.status = ProposalStatus::Executed;

    let pot = &mut ctx.accounts.pot;

    match &proposal.proposal_type {
        ProposalType::Swap {
            from_mint,
            to_mint,
            amount_in,
            min_amount_out,
        } => {
            // In production, this would CPI into Jupiter
            // For demo: log the swap intent and increment trade counter
            pot.trade_count = pot.trade_count.saturating_add(1);
            pot.total_volume = pot.total_volume.saturating_add(*amount_in);

            msg!(
                "Swap executed: {} of {} -> {} (min {})",
                amount_in,
                from_mint,
                to_mint,
                min_amount_out
            );
        }
        ProposalType::Withdraw {
            beneficiary,
            amount,
        } => {
            let vault_lamports = ctx.accounts.vault.lamports();
            let rent = Rent::get()?;
            let min_balance = rent.minimum_balance(0);
            require!(
                vault_lamports.saturating_sub(*amount) >= min_balance,
                PotError::InsufficientVaultBalance
            );

            **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
            **ctx.accounts.executor.to_account_info().try_borrow_mut_lamports()? += amount;

            msg!("Governance withdrawal: {} lamports to {}", amount, beneficiary);
        }
        ProposalType::ChangeSettings {
            new_trade_level,
            new_withdraw_level,
        } => {
            pot.governance.trade_level = *new_trade_level;
            pot.governance.withdraw_level = *new_withdraw_level;
            msg!("Settings updated: trade_level={}, withdraw_level={}", new_trade_level, new_withdraw_level);
        }
        ProposalType::ChangeYield { new_strategy } => {
            pot.config.yield_strategy = match new_strategy {
                0 => YieldStrategy::None,
                1 => YieldStrategy::Conservative,
                2 => YieldStrategy::Balanced,
                3 => YieldStrategy::Aggressive,
                _ => return Err(PotError::InvalidYieldStrategy.into()),
            };
            msg!("Yield strategy changed to {}", new_strategy);
        }
    }

    msg!("Proposal {} executed", proposal.proposal_id);
    Ok(())
}
