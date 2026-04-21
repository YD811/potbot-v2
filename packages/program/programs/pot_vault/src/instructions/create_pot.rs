use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::PotError;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreatePotParams {
    pub name: String,
    pub emoji: String,
    pub is_public: bool,
    pub min_deposit: u64,
    pub lockup_seconds: i64,
    pub yield_strategy: u8,
    pub max_yield_allocation_bps: u16,
    pub max_trade_size_bps: u16,   // e.g. 2000 = 20% max per swap
    pub max_members: u16,          // 0 = unlimited
    // Governance
    pub trade_level: u8,
    pub withdraw_level: u8,
    pub member_change_level: u8,
    pub settings_change_level: u8,
    pub yield_change_level: u8,
    pub vote_timeout_seconds: i64,
    pub quorum_bps: u16,
    // Optional: protocol fee (0-1000 bps)
    pub protocol_fee_bps: u16,
}

#[derive(Accounts)]
#[instruction(params: CreatePotParams)]
pub struct CreatePot<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PotAccount::INIT_SPACE,
        seeds = [b"pot", authority.key().as_ref(), params.name.as_bytes()],
        bump
    )]
    pub pot: Account<'info, PotAccount>,

    /// CHECK: PDA vault that holds SOL
    #[account(
        seeds = [b"vault", pot.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreatePot>, params: CreatePotParams) -> Result<()> {
    require!(
        !params.name.is_empty() && params.name.len() <= 32,
        PotError::InvalidPotName
    );

    let yield_strategy = match params.yield_strategy {
        0 => YieldStrategy::None,
        1 => YieldStrategy::Conservative,
        2 => YieldStrategy::Balanced,
        3 => YieldStrategy::Aggressive,
        _ => return Err(PotError::InvalidYieldStrategy.into()),
    };

    let clock = Clock::get()?;
    let pot   = &mut ctx.accounts.pot;

    pot.authority             = ctx.accounts.authority.key();
    pot.name                  = params.name;
    pot.emoji                 = params.emoji;
    pot.vault_bump            = ctx.bumps.vault;
    pot.pot_bump              = ctx.bumps.pot;
    pot.total_shares          = 0;
    pot.member_count          = 0;
    pot.trade_count           = 0;
    pot.total_volume          = 0;
    pot.tamagotchi_level      = 0;
    pot.tamagotchi_xp         = 0;
    pot.community_token_mint  = Pubkey::default();
    pot.next_proposal_id      = 0;
    pot.created_at            = clock.unix_timestamp;

    // Risk & performance
    pot.high_water_mark        = 0;
    pot.protocol_fee_bps       = params.protocol_fee_bps.min(1000); // cap at 10%
    pot.last_activity_at       = clock.unix_timestamp;

    // AI agent (disabled by default)
    pot.agent_pubkey           = None;
    pot.agent_max_trade_bps    = 0;
    pot.agent_last_proposal_at = 0;

    // Daily trade tracking
    pot.daily_trades_count = 0;
    pot.last_trade_day     = clock.unix_timestamp;

    // Token mint and shares
    pot.token_mint = Pubkey::default();
    pot.shares_per_sol = 100;

    pot.config = PotConfig {
        is_public: params.is_public,
        min_deposit: params.min_deposit,
        lockup_seconds: params.lockup_seconds,
        yield_strategy,
        max_yield_allocation_bps: params.max_yield_allocation_bps,
        max_trade_size_bps: params.max_trade_size_bps,
        max_members: params.max_members,
    };

    pot.governance = GovSettings {
        trade_level:          params.trade_level,
        withdraw_level:       params.withdraw_level,
        member_change_level:  params.member_change_level,
        settings_change_level: params.settings_change_level,
        yield_change_level:   params.yield_change_level,
        vote_timeout_seconds: params.vote_timeout_seconds,
        quorum_bps:           params.quorum_bps,
    };

    msg!("POT \"{}\" created by {} (public={}, max_trade_bps={})",
        pot.name, pot.authority, pot.config.is_public, pot.config.max_trade_size_bps);
    Ok(())
}
