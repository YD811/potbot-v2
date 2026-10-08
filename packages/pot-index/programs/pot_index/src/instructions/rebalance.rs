//! Bounded, permissionless rebalancing as a two-instruction "flash trade".
//!
//! `rebalance_open` hands the keeper `amount_out` of an overweight leg and records the
//! minimum amount of the underweight leg the Pot must receive, priced by Pyth. The keeper
//! swaps anywhere (Jupiter on mainnet) and calls `rebalance_close` in the SAME transaction.
//! `rebalance_open` introspects the transaction and refuses to run unless the next call to
//! this program is a matching `rebalance_close` for the same Pot, so the Pot can never be
//! left mid-trade. Every bound is enforced on-chain:
//!
//! - sold leg must be overweight and must not go below its target weight;
//! - bought leg must be underweight and must not go above its target weight;
//! - trade value ≤ `max_trade_bps` of NAV;
//! - received ≥ fair value × (1 − `slippage_bps`), where the sold leg is valued at Pyth
//!   price + conf and the bought leg at price − conf (conservative for the Pot);
//! - sold leg must be at least `REBALANCE_DEADBAND_BPS` of NAV above target;
//! - at most one rebalance per `REBALANCE_COOLDOWN_SLOTS` per Pot.

use anchor_lang::{
    compat::solana_instructions_sysvar::{load_current_index_checked, load_instruction_at_checked},
    prelude::*,
    solana_program::instruction::{get_stack_height, TRANSACTION_LEVEL_STACK_HEIGHT},
    Discriminator,
};
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::{constants::*, errors::PotError, oracle, state::*};

/// remaining_accounts: for each leg i: `[vault_i, pyth_price_update_i]` (same as deposit).
#[derive(Accounts)]
pub struct RebalanceOpen<'info> {
    #[account(mut)]
    pub keeper: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [POT_SEED, pot.index_mint.as_ref()], bump = pot.bump)]
    pub pot: Account<'info, Pot>,
    #[account(address = pot.cash_vault)]
    pub cash_vault: Account<'info, TokenAccount>,
    /// Vault of the leg being sold (asset leg or the cash vault).
    #[account(mut)]
    pub out_vault: Account<'info, TokenAccount>,
    pub out_mint: Account<'info, Mint>,
    /// Keeper's token account for the sold asset.
    #[account(mut, token::mint = out_mint, token::authority = keeper)]
    pub keeper_out_ata: Account<'info, TokenAccount>,
    /// Vault of the leg being bought; its balance is snapshotted here and checked at close.
    pub in_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    /// CHECK: the Instructions sysvar, address-checked.
    #[account(address = anchor_lang::compat::solana_instructions_sysvar::ID)]
    pub instructions: UncheckedAccount<'info>,
}

fn leg_target_value(nav: u128, weight_bps: u16) -> u128 {
    nav * (weight_bps as u128) / (BPS as u128)
}

pub fn handle_rebalance_open<'info>(
    ctx: Context<'info, RebalanceOpen<'info>>,
    leg_out: u8,
    leg_in: u8,
    amount_out: u64,
) -> Result<()> {
    let config = &ctx.accounts.config;
    let pot = &ctx.accounts.pot;
    require!(!config.paused, PotError::ProtocolPaused);
    require!(pot.finalized, PotError::PotNotFinalized);
    require!(!pot.rebalance.open, PotError::RebalanceOpen);
    require!(amount_out > 0, PotError::ZeroAmount);
    let clock = Clock::get()?;
    if pot.last_rebalance_slot > 0 {
        require!(
            clock.slot >= pot.last_rebalance_slot.saturating_add(REBALANCE_COOLDOWN_SLOTS),
            PotError::Cooldown
        );
    }
    require!(leg_out != leg_in, PotError::InvalidLeg);
    // Cash can only be sold (deployed), never bought: exits are in kind, cash target is 0.
    require!(leg_in != CASH_LEG, PotError::InvalidLeg);

    // --- Transaction introspection: must be top-level and followed by rebalance_close.
    require!(
        get_stack_height() == TRANSACTION_LEVEL_STACK_HEIGHT,
        PotError::CpiNotAllowed
    );
    let ix_sysvar = ctx.accounts.instructions.to_account_info();
    let current = load_current_index_checked(&ix_sysvar)? as usize;
    let mut found = false;
    let mut i = current + 1;
    loop {
        let ix = match load_instruction_at_checked(i, &ix_sysvar) {
            Ok(ix) => ix,
            Err(_) => break, // end of transaction
        };
        if ix.program_id == crate::ID {
            let disc_ok = ix.data.len() >= 8 && ix.data[..8] == *crate::instruction::RebalanceClose::DISCRIMINATOR;
            // RebalanceClose account order: [keeper, pot, in_vault, instructions]
            let pot_ok = ix.accounts.len() >= 2 && ix.accounts[1].pubkey == pot.key();
            require!(disc_ok && pot_ok, PotError::MissingClose);
            found = true;
            break;
        }
        i += 1;
    }
    require!(found, PotError::MissingClose);

    // --- Price everything.
    let legs = oracle::snapshot_legs(pot, ctx.remaining_accounts, &clock, config.max_price_age_secs)?;
    let nav = oracle::nav_usd(ctx.accounts.cash_vault.amount, &legs)?;
    require!(nav > 0, PotError::ZeroAmount);

    // Resolve the sold side.
    let (out_vault_key, out_mint_key, out_decimals, out_value, out_target, trade_value): (
        Pubkey,
        Pubkey,
        u8,
        u128,
        u128,
        u128,
    ) = if leg_out == CASH_LEG {
        let v = ctx.accounts.cash_vault.amount as u128;
        (
            pot.cash_vault,
            config.usdc_mint,
            6,
            v,
            0,
            amount_out as u128,
        )
    } else {
        let leg = pot.leg(leg_out).ok_or(PotError::InvalidLeg)?;
        let snap = legs[leg_out as usize];
        // Sold asset valued high (price + conf): the Pot asks for more in return.
        let tv = oracle::token_value_usd(amount_out, snap.decimals, snap.price_hi, snap.expo)?;
        (
            leg.vault,
            leg.mint,
            leg.decimals,
            snap.value_usd,
            leg_target_value(nav, leg.weight_bps),
            tv,
        )
    };
    require_keys_eq!(ctx.accounts.out_vault.key(), out_vault_key, PotError::VaultMismatch);
    require_keys_eq!(ctx.accounts.out_mint.key(), out_mint_key, PotError::TokenMintMismatch);
    require!(amount_out <= ctx.accounts.out_vault.amount, PotError::ZeroAmount);

    // Resolve the bought side.
    let in_leg = pot.leg(leg_in).ok_or(PotError::InvalidLeg)?;
    let in_snap = legs[leg_in as usize];
    require_keys_eq!(ctx.accounts.in_vault.key(), in_leg.vault, PotError::VaultMismatch);
    let in_target = leg_target_value(nav, in_leg.weight_bps);

    // --- Bounds.
    require!(out_value > out_target, PotError::NotOverweight);
    let deadband = nav * (REBALANCE_DEADBAND_BPS as u128) / (BPS as u128);
    require!(out_value - out_target >= deadband, PotError::WithinDeadband);
    require!(in_snap.value_usd < in_target, PotError::NotOverweight);
    require!(out_value - trade_value >= out_target, PotError::OvershootOut);
    require!(in_snap.value_usd + trade_value <= in_target, PotError::OvershootIn);
    let max_trade = nav * (pot.max_trade_bps as u128) / (BPS as u128);
    require!(trade_value <= max_trade, PotError::TradeTooLarge);

    // Minimum to receive: trade value at the Pyth price minus slippage, in bought-token units.
    let min_value = trade_value * ((BPS - pot.slippage_bps as u64) as u128) / (BPS as u128);
    // Bought asset valued low (price − conf): more units required.
    let min_in = oracle::usd_to_token_amount(min_value, in_snap.decimals, in_snap.price_lo, in_snap.expo)?;
    require!(min_in > 0, PotError::ZeroAmount);

    // --- Hand the sold amount to the keeper.
    let seeds = pot.seeds();
    token::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.out_vault.to_account_info(),
                mint: ctx.accounts.out_mint.to_account_info(),
                to: ctx.accounts.keeper_out_ata.to_account_info(),
                authority: pot.to_account_info(),
            },
            &[&seeds],
        ),
        amount_out,
        out_decimals,
    )?;

    let pot = &mut ctx.accounts.pot;
    pot.rebalance = RebalanceState {
        open: true,
        leg_out,
        leg_in,
        amount_out,
        min_in,
        in_vault_before: ctx.accounts.in_vault.amount,
        slot: clock.slot,
    };
    pot.last_rebalance_slot = clock.slot;
    emit!(RebalanceOpened {
        pot: pot.key(),
        keeper: ctx.accounts.keeper.key(),
        leg_out,
        leg_in,
        amount_out,
        min_in,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct RebalanceClose<'info> {
    pub keeper: Signer<'info>,
    #[account(mut, seeds = [POT_SEED, pot.index_mint.as_ref()], bump = pot.bump)]
    pub pot: Account<'info, Pot>,
    pub in_vault: Account<'info, TokenAccount>,
}

pub fn handle_rebalance_close(ctx: Context<RebalanceClose>) -> Result<()> {
    require!(
        get_stack_height() == TRANSACTION_LEVEL_STACK_HEIGHT,
        PotError::CpiNotAllowed
    );
    let pot = &ctx.accounts.pot;
    let st = pot.rebalance;
    require!(st.open, PotError::RebalanceNotOpen);
    let clock = Clock::get()?;
    require!(st.slot == clock.slot, PotError::RebalanceWrongSlot);

    let in_leg = pot.leg(st.leg_in).ok_or(PotError::InvalidLeg)?;
    require_keys_eq!(ctx.accounts.in_vault.key(), in_leg.vault, PotError::VaultMismatch);
    let received = ctx
        .accounts
        .in_vault
        .amount
        .checked_sub(st.in_vault_before)
        .ok_or(PotError::RebalanceSlippage)?;
    require!(received >= st.min_in, PotError::RebalanceSlippage);

    let pot = &mut ctx.accounts.pot;
    pot.rebalance = RebalanceState::default();
    emit!(RebalanceClosed {
        pot: pot.key(),
        received,
        min_in: st.min_in,
    });
    Ok(())
}

#[event]
pub struct RebalanceOpened {
    pub pot: Pubkey,
    pub keeper: Pubkey,
    pub leg_out: u8,
    pub leg_in: u8,
    pub amount_out: u64,
    pub min_in: u64,
}

#[event]
pub struct RebalanceClosed {
    pub pot: Pubkey,
    pub received: u64,
    pub min_in: u64,
}
