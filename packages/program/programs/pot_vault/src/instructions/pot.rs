use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use crate::errors::PotError;
use crate::state::pot::{Pot, PotConfig, GovSettings, YieldStrategy, MAX_NAME_LEN};

// ── create_pot ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreatePot<'info> {
    #[account(
        init,
        payer = authority,
        space = Pot::LEN,
        seeds = [b"pot", authority.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub pot: Account<'info, Pot>,

    /// CHECK: SOL vault PDA — holds collective funds
    #[account(
        mut,
        seeds = [b"vault", pot.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,

    /// Community token mint (ETF-like SPL token)
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = pot,
    )]
    pub community_token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_pot(
    ctx: Context<CreatePot>,
    name: String,
    is_public: bool,
    min_deposit: u64,
    lockup_seconds: i64,
    yield_strategy: YieldStrategy,
) -> Result<()> {
    require!(name.len() <= MAX_NAME_LEN, PotError::NameTooLong);

    let pot = &mut ctx.accounts.pot;
    let clock = Clock::get()?;

    pot.authority = ctx.accounts.authority.key();
    pot.name = name;
    pot.vault_bump = ctx.bumps.vault;
    pot.total_shares = 0;
    pot.member_count = 0;
    pot.trade_count = 0;
    pot.total_volume = 0;
    pot.proposal_count = 0;
    pot.tamagotchi_level = 0;
    pot.tamagotchi_xp = 0;
    pot.community_token_mint = ctx.accounts.community_token_mint.key();
    pot.created_at = clock.unix_timestamp;

    pot.config = PotConfig {
        is_public,
        min_deposit,
        lockup_seconds,
        privacy_enabled: false,
        yield_strategy,
        max_yield_allocation_bps: 5000, // 50% max in yield by default
    };

    pot.governance = GovSettings {
        trade_level: 2,         // Majority vote for trades
        withdraw_level: 1,      // Advisory for withdrawals
        member_change_level: 2,
        settings_change_level: 3,
        yield_change_level: 2,
        vote_timeout_seconds: 86400, // 24h
        quorum_bps: 5100,       // 51%
    };

    emit!(PotCreated {
        pot: pot.key(),
        authority: pot.authority,
        name: pot.name.clone(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct PotCreated {
    pub pot: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub timestamp: i64,
}

// ── deposit ────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Deposit<'info> {
    pub pot: Account<'info, Pot>,

    /// CHECK: Vault receives SOL
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, PotError::InvalidAmount);
    require!(amount >= ctx.accounts.pot.config.min_deposit, PotError::BelowMinDeposit);

    // Transfer SOL to vault
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.depositor.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, amount)?;

    // Update POT stats
    let pot = &mut ctx.accounts.pot;
    pot.total_volume = pot.total_volume.checked_add(amount).ok_or(PotError::Overflow)?;

    emit!(Deposited {
        pot: pot.key(),
        depositor: ctx.accounts.depositor.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct Deposited {
    pub pot: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
