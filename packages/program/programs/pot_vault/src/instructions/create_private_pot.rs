use anchor_lang::prelude::*;

use crate::state::pot::{PotAccount, PotConfig, GovSettings};
use crate::state::private_pot::PrivatePotAccount;
use crate::errors::ErrorCode;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreatePrivatePotParams {
    pub emoji: String,
    pub invite_code: String,
    pub config: PotConfig,
    pub governance: GovSettings,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreatePrivatePot<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PotAccount::INIT_SPACE,
        seeds = [b"pot", name.as_bytes(), authority.key().as_ref()],
        bump
    )]
    pub pot: Account<'info, PotAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + PrivatePotAccount::INIT_SPACE,
        seeds = [b"private_pot", pot.key().as_ref()],
        bump
    )]
    pub private_pot_account: Account<'info, PrivatePotAccount>,

    #[account(
        init,
        payer = authority,
        space = 0,
        seeds = [b"vault", pot.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreatePrivatePot>,
    name: String,
    params: CreatePrivatePotParams,
) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    let private_pot = &mut ctx.accounts.private_pot_account;
    let now = Clock::get()?.unix_timestamp;

    require!(
        params.invite_code.len() == 6,
        ErrorCode::InvalidInviteCode
    );
    require!(
        params.invite_code.chars().all(|c| c.is_alphanumeric()),
        ErrorCode::InvalidInviteCode
    );
    require!(
        !name.trim().is_empty() && name.len() <= 32,
        ErrorCode::InvalidPotName
    );

    pot.authority = ctx.accounts.authority.key();
    pot.name = name;
    pot.emoji = params.emoji;
    pot.vault_bump = ctx.bumps.vault;
    pot.pot_bump = ctx.bumps.pot;
    pot.total_shares = 0;
    pot.member_count = 0;
    pot.trade_count = 0;
    pot.total_volume = 0;
    pot.tamagotchi_level = 0;
    pot.tamagotchi_xp = 0;
    pot.community_token_mint = Pubkey::default();
    pot.config = params.config;
    pot.config.is_public = false;
    pot.governance = params.governance;
    pot.next_proposal_id = 1;
    pot.created_at = now;
    pot.high_water_mark = 0;
    pot.protocol_fee_bps = 250;
    pot.last_activity_at = now;
    pot.agent_pubkey = None;
    pot.agent_max_trade_bps = 1000;
    pot.agent_last_proposal_at = 0;
    pot.daily_trades_count = 0;
    pot.last_trade_day = 0;
    pot.token_mint = Pubkey::default();
    pot.shares_per_sol = 100;

    private_pot.pot = pot.key();
    private_pot.invite_code = params.invite_code.to_uppercase();
    private_pot.created_at = now;
    private_pot.invited_members = Vec::new();
    private_pot.max_invites = 100;
    private_pot.bump = ctx.bumps.private_pot_account;

    msg!(
        "Private pot '{}' created with invite code: {}",
        pot.name,
        private_pot.invite_code
    );

    Ok(())
}
