use anchor_lang::prelude::*;
use crate::errors::PotError;
use crate::state::pot::PotAccount;
use crate::state::strategy_vault::*;

// ─── CREATE STRATEGY VAULT ────────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(pot_name: String)]
pub struct CreateStrategyVault<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds = [b"pot", pot_name.as_bytes(), creator.key().as_ref()],
        bump = pot.pot_bump,
    )]
    pub pot: Account<'info, PotAccount>,

    #[account(
        init,
        payer = creator,
        space = StrategyVaultAccount::LEN,
        seeds = [b"strategy_vault", pot.key().as_ref()],
        bump,
    )]
    pub strategy_vault: Account<'info, StrategyVaultAccount>,

    pub system_program: Program<'info, System>,
}

pub fn create_strategy_vault(
    ctx: Context<CreateStrategyVault>,
    _pot_name: String,
    description: String,
    entry_fee_lamports: u64,
    performance_fee_bps: u16,
    management_fee_bps: u16,
    referral_bps: u16,
    strategy_config: StrategyConfig,
) -> Result<()> {
    require!(description.len() <= 200, PotError::DescriptionTooLong);
    require!(performance_fee_bps <= 5000, PotError::FeeTooHigh);
    require!(management_fee_bps <= 500,   PotError::FeeTooHigh);
    require!(referral_bps <= 3000,         PotError::FeeTooHigh);
    require!(strategy_config.max_swap_pct <= 100, PotError::InvalidStrategyConfig);

    let vault = &mut ctx.accounts.strategy_vault;
    let clock = Clock::get()?;

    vault.pot_pubkey   = ctx.accounts.pot.key();
    vault.creator      = ctx.accounts.creator.key();
    vault.is_active    = true;
    vault.entry_fee_lamports  = entry_fee_lamports;
    vault.performance_fee_bps = performance_fee_bps;
    vault.management_fee_bps  = management_fee_bps;
    vault.referral_bps        = referral_bps;
    vault.strategy_config     = strategy_config.clone();
    vault.description         = description;
    vault.allowed_token_count = 0;
    vault.tamagotchi_level    = 0;
    vault.total_aum_usd_snapshot         = 0;
    vault.total_entry_fees_collected     = 0;
    vault.total_performance_fees_collected = 0;
    vault.total_referral_payouts         = 0;
    vault.total_referrers                = 0;
    vault.created_at        = clock.unix_timestamp;
    vault.last_fee_crank_at = clock.unix_timestamp;
    vault.bump = ctx.bumps.strategy_vault;

    emit!(StrategyVaultCreated {
        pot_pubkey: vault.pot_pubkey,
        creator: vault.creator,
        strategy_type: vault.strategy_config.strategy_type.clone(),
        entry_fee_lamports,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ─── JOIN STRATEGY VAULT ─────────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct JoinStrategyVault<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,

    /// CHECK: validated as creator in strategy_vault.creator
    #[account(mut)]
    pub creator: AccountInfo<'info>,

    /// CHECK: optional referrer wallet
    #[account(mut)]
    pub referrer: Option<AccountInfo<'info>>,

    #[account(
        mut,
        constraint = strategy_vault.creator == creator.key() @ PotError::UnauthorizedAccess,
    )]
    pub strategy_vault: Account<'info, StrategyVaultAccount>,

    pub system_program: Program<'info, System>,
}

pub fn join_strategy_vault(
    ctx: Context<JoinStrategyVault>,
    referrer_wallet: Option<Pubkey>,
) -> Result<()> {
    let vault = &mut ctx.accounts.strategy_vault;
    require!(vault.is_active, PotError::VaultNotActive);

    let entry_fee = vault.entry_fee_lamports;

    if entry_fee > 0 {
        let discount_bps  = vault.entry_fee_discount_bps();
        let discounted_fee = entry_fee.saturating_sub(entry_fee * discount_bps as u64 / 10_000);

        let creator_share  = discounted_fee * 70 / 100;
        let referrer_share = if referrer_wallet.is_some() { discounted_fee * 10 / 100 } else { 0 };

        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.participant.to_account_info(),
                    to:   ctx.accounts.creator.to_account_info(),
                },
            ),
            creator_share,
        )?;

        if referrer_share > 0 {
            if let Some(ref_acc) = &ctx.accounts.referrer {
                anchor_lang::system_program::transfer(
                    CpiContext::new(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.participant.to_account_info(),
                            to:   ref_acc.to_account_info(),
                        },
                    ),
                    referrer_share,
                )?;
                vault.total_referral_payouts = vault.total_referral_payouts.saturating_add(referrer_share);
                vault.total_referrers        = vault.total_referrers.saturating_add(1);
            }
        }

        vault.total_entry_fees_collected = vault.total_entry_fees_collected.saturating_add(discounted_fee);
    }

    emit!(ParticipantJoined {
        vault_pubkey:   vault.key(),
        participant:    ctx.accounts.participant.key(),
        entry_fee_paid: entry_fee,
        referrer:       referrer_wallet,
    });

    Ok(())
}

// ─── EXIT STRATEGY VAULT ─────────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ExitStrategyVault<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,

    /// CHECK: creator receives performance fees
    #[account(mut)]
    pub creator: AccountInfo<'info>,

    #[account(
        mut,
        constraint = strategy_vault.creator == creator.key() @ PotError::UnauthorizedAccess,
    )]
    pub strategy_vault: Account<'info, StrategyVaultAccount>,

    pub system_program: Program<'info, System>,
}

pub fn exit_strategy_vault(
    ctx: Context<ExitStrategyVault>,
    profit_lamports: u64,
) -> Result<()> {
    let vault = &mut ctx.accounts.strategy_vault;

    if profit_lamports > 0 && vault.performance_fee_bps > 0 {
        let perf_fee = profit_lamports * vault.performance_fee_bps as u64 / 10_000;

        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.participant.to_account_info(),
                    to:   ctx.accounts.creator.to_account_info(),
                },
            ),
            perf_fee,
        )?;

        vault.total_performance_fees_collected =
            vault.total_performance_fees_collected.saturating_add(perf_fee);
    }

    emit!(ParticipantExited {
        vault_pubkey: vault.key(),
        participant:  ctx.accounts.participant.key(),
        profit_lamports,
    });

    Ok(())
}

// ─── EVOLVE TAMAGOTCHI (permissionless) ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct EvolveTamagotchi<'info> {
    /// CHECK: permissionless — anyone can call
    pub caller: Signer<'info>,

    #[account(mut)]
    pub strategy_vault: Account<'info, StrategyVaultAccount>,

    pub pot: Account<'info, PotAccount>,
}

pub fn evolve_tamagotchi(ctx: Context<EvolveTamagotchi>) -> Result<()> {
    let vault = &mut ctx.accounts.strategy_vault;
    let pot   = &ctx.accounts.pot;

    let new_level = StrategyVaultAccount::compute_tamagotchi_level(
        pot.member_count,
        vault.total_aum_usd_snapshot,
    );

    if new_level > vault.tamagotchi_level {
        let old_level = vault.tamagotchi_level;
        vault.tamagotchi_level = new_level;

        emit!(TamagotchiEvolved {
            vault_pubkey: vault.key(),
            old_level,
            new_level,
            member_count: pot.member_count,
            aum_snapshot: vault.total_aum_usd_snapshot,
        });
    }

    Ok(())
}

// ─── EVENTS ────────────────────────────────────────────────────────────────────────────────────

#[event]
pub struct StrategyVaultCreated {
    pub pot_pubkey:          Pubkey,
    pub creator:             Pubkey,
    pub strategy_type:       StrategyType,
    pub entry_fee_lamports:  u64,
    pub timestamp:           i64,
}

#[event]
pub struct ParticipantJoined {
    pub vault_pubkey:   Pubkey,
    pub participant:    Pubkey,
    pub entry_fee_paid: u64,
    pub referrer:       Option<Pubkey>,
}

#[event]
pub struct ParticipantExited {
    pub vault_pubkey:    Pubkey,
    pub participant:     Pubkey,
    pub profit_lamports: u64,
}

#[event]
pub struct TamagotchiEvolved {
    pub vault_pubkey: Pubkey,
    pub old_level:    u8,
    pub new_level:    u8,
    pub member_count: u32,
    pub aum_snapshot: u64,
}
