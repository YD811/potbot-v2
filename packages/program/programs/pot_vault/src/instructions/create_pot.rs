use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::PotError;
use crate::constants::{POT_CREATION_FEE, TREASURY_ADDRESS};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreatePotParams {
    pub name: String,
    pub emoji: String,
    pub is_public: bool,
    pub min_deposit: u64,
    pub lockup_seconds: i64,
    pub yield_strategy: u8,
    pub max_yield_allocation_bps: u16,
    pub max_trade_size_bps: u16,
    pub max_members: u16,
    // Governance
    pub trade_level: u8,
    pub withdraw_level: u8,
    pub member_change_level: u8,
    pub settings_change_level: u8,
    pub yield_change_level: u8,
    pub vote_timeout_seconds: i64,
    pub quorum_bps: u16,
    /// Delay (seconds) between proposal passing and execution. 0 = instant.
    /// Recommended: 0 for autocracy, 3600-86400 for democracy.
    pub timelock_seconds: i64,
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
    pub pot: Box<Account<'info, PotAccount>>,

    /// CHECK: PDA vault that holds SOL
    #[account(
        seeds = [b"vault", pot.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    /// PotBot protocol treasury — receives POT_CREATION_FEE.
    /// CHECK: hardcoded constant; address constraint below pins the pubkey.
    #[account(
        mut,
        address = TREASURY_ADDRESS @ PotError::UnauthorizedAccess
    )]
    pub treasury: SystemAccount<'info>,

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
    pot.high_water_mark        = 0;
    pot.protocol_fee_bps       = params.protocol_fee_bps.min(1000);
    pot.last_activity_at       = clock.unix_timestamp;
    pot.agent_pubkey           = None;
    pot.agent_max_trade_bps    = 0;
    pot.agent_last_proposal_at = 0;
    pot.daily_trades_count = 0;
    pot.last_trade_day     = clock.unix_timestamp;
    pot.token_mint = Pubkey::default();
    pot.shares_per_sol = 100;

    // Security hardening (Phase A) — safe defaults, all opt-in.
    pot.sentinel                 = None;
    pot.risk_param_timelock_secs = 0;
    pot.pending_params           = PendingRiskParams::default();
    pot.allowed_programs         = [Pubkey::default(); 8];
    pot.allowed_programs_count   = 0;
    pot.max_asset_exposure_bps   = 0;
    pot.per_mint_daily_spent     = [0u64; 16];

    // Oracle / NAV (Phase A) — Pyth default, guards opt-in via set_oracle_config.
    pot.oracle_kind              = 0; // OracleKind::Pyth
    pot.max_oracle_conf_bps      = 0; // → pyth::DEFAULT_MAX_CONF_BPS
    pot.max_oracle_deviation_bps = 0; // guard disabled until configured
    pot.reserved                 = [0u8; 128];

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
        trade_level:           params.trade_level,
        withdraw_level:        params.withdraw_level,
        member_change_level:   params.member_change_level,
        settings_change_level: params.settings_change_level,
        yield_change_level:    params.yield_change_level,
        vote_timeout_seconds:  params.vote_timeout_seconds,
        quorum_bps:            params.quorum_bps,
        timelock_seconds:      params.timelock_seconds,
    };

    // Protocol creation fee: 0.01 SOL → treasury.
    if POT_CREATION_FEE > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            POT_CREATION_FEE,
        )?;
        msg!("Protocol fee: {} lamports -> treasury {}", POT_CREATION_FEE, TREASURY_ADDRESS);
    }

    msg!("POT \"{}\" created by {} (public={}, timelock={}s)",
        pot.name, pot.authority, pot.config.is_public, pot.governance.timelock_seconds);
    Ok(())
}
