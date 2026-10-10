//! Exit straight to USDC as a two-instruction "flash exit", same pattern as rebalancing.
//!
//! `exit_usdc_open` burns the holder's index tokens, pays their USDC-cash share directly, hands
//! their in-kind share of every leg to their own token accounts, and records the minimum USDC the
//! holder must end up with after selling those legs (Pyth price − conf, minus the Pot's slippage
//! band, minus the 0.10% conversion fee). It introspects the transaction and refuses unless a
//! matching `exit_usdc_close` for the same Pot and the same USDC account follows.
//!
//! Between the two the holder sells the legs however they like (Jupiter on mainnet, the devnet
//! market maker here). `exit_usdc_close` checks the holder's USDC balance grew by at least the
//! recorded minimum and moves the conversion fee to the protocol treasury. Under-delivery reverts
//! the whole transaction: the holder keeps their index tokens.
//!
//! The open/close window reuses `Pot.rebalance` (marker `leg_out == EXIT_LEG`) so no account
//! layout changes and existing Pots need no migration. Deposits, in-kind exits and rebalances all
//! already refuse to run while that window is open in the current slot.

use anchor_lang::{
    compat::solana_instructions_sysvar::{load_current_index_checked, load_instruction_at_checked},
    prelude::*,
    solana_program::instruction::{get_stack_height, TRANSACTION_LEVEL_STACK_HEIGHT},
    Discriminator,
};
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, TransferChecked};

use crate::{constants::*, errors::PotError, oracle, state::*};

/// remaining_accounts: for each leg i, in order: `[vault_i, pyth_price_update_i, user_ata_i, mint_i]`.
#[derive(Accounts)]
pub struct ExitUsdcOpen<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [POT_SEED, pot.index_mint.as_ref()], bump = pot.bump)]
    pub pot: Account<'info, Pot>,
    #[account(mut, address = pot.index_mint)]
    pub index_mint: Account<'info, Mint>,
    #[account(mut, token::mint = index_mint, token::authority = user)]
    pub user_index_ata: Account<'info, TokenAccount>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,
    #[account(mut, address = pot.cash_vault, token::mint = usdc_mint)]
    pub cash_vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = usdc_mint, token::authority = user)]
    pub user_usdc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    /// CHECK: the Instructions sysvar, address-checked.
    #[account(address = anchor_lang::compat::solana_instructions_sysvar::ID)]
    pub instructions: UncheckedAccount<'info>,
}

pub fn handle_exit_usdc_open<'info>(
    ctx: Context<'info, ExitUsdcOpen<'info>>,
    shares: u64,
    min_usdc_out: u64,
) -> Result<()> {
    let config = &ctx.accounts.config;
    let pot = &ctx.accounts.pot;
    require!(pot.finalized, PotError::PotNotFinalized);
    require!(!pot.rebalance.open, PotError::RebalanceOpen);
    require!(shares > 0, PotError::ZeroShares);
    require!(
        ctx.remaining_accounts.len() == pot.legs.len() * 4,
        PotError::RemainingAccountsMismatch
    );
    let clock = Clock::get()?;

    // --- Transaction introspection: top-level, and a matching close for this Pot + USDC account follows.
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
            Err(_) => break,
        };
        if ix.program_id == crate::ID {
            let disc_ok = ix.data.len() >= 8 && ix.data[..8] == *crate::instruction::ExitUsdcClose::DISCRIMINATOR;
            // ExitUsdcClose account order: [user, config, pot, usdc_mint, user_usdc, protocol_usdc, token_program]
            let keys_ok = ix.accounts.len() >= 5
                && ix.accounts[0].pubkey == ctx.accounts.user.key()
                && ix.accounts[2].pubkey == pot.key()
                && ix.accounts[4].pubkey == ctx.accounts.user_usdc.key();
            require!(disc_ok && keys_ok, PotError::MissingClose);
            found = true;
            break;
        }
        i += 1;
    }
    require!(found, PotError::MissingClose);

    let supply = ctx.accounts.index_mint.supply;
    require!(supply >= shares, PotError::ZeroShares);

    // --- Price the legs: the holder sells them, so value what leaves at price − conf (conservative for the holder's minimum).
    let price_accounts: Vec<AccountInfo<'info>> = (0..pot.legs.len())
        .flat_map(|i| [ctx.remaining_accounts[i * 4].clone(), ctx.remaining_accounts[i * 4 + 1].clone()])
        .collect();
    let legs = oracle::snapshot_legs(pot, &price_accounts, &clock, config.max_price_age_secs)?;

    // 1. Burn first (user is the authority).
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Burn {
                mint: ctx.accounts.index_mint.to_account_info(),
                from: ctx.accounts.user_index_ata.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        shares,
    )?;

    let seeds = pot.seeds();
    let signer: &[&[&[u8]]] = &[&seeds];
    let user_key = ctx.accounts.user.key();

    // 2. Cash share goes straight to the holder (no conversion needed, no conversion fee).
    let cash_out = oracle::exit_amount(ctx.accounts.cash_vault.amount, shares, supply)?;
    if cash_out > 0 {
        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.cash_vault.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.user_usdc.to_account_info(),
                    authority: pot.to_account_info(),
                },
                signer,
            ),
            cash_out,
            ctx.accounts.usdc_mint.decimals,
        )?;
    }

    // 3. Every leg, in kind, to the holder's own accounts; sum their value at price − conf.
    let mut legs_value: u128 = 0;
    for (i, leg) in pot.legs.iter().enumerate() {
        let vault_info = &ctx.remaining_accounts[i * 4];
        let user_info = &ctx.remaining_accounts[i * 4 + 2];
        let mint_info = &ctx.remaining_accounts[i * 4 + 3];
        let user_ata = Account::<TokenAccount>::try_from(user_info)?;
        require_keys_eq!(user_ata.mint, leg.mint, PotError::TokenMintMismatch);
        require_keys_eq!(user_ata.owner, user_key, PotError::TokenOwnerMismatch);
        require_keys_eq!(mint_info.key(), leg.mint, PotError::TokenMintMismatch);

        let out = oracle::exit_amount(legs[i].amount, shares, supply)?;
        if out == 0 {
            continue;
        }
        legs_value = legs_value
            .checked_add(oracle::token_value_usd(out, leg.decimals, legs[i].price_lo, legs[i].expo)?)
            .ok_or(PotError::MathOverflow)?;
        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: vault_info.clone(),
                    mint: mint_info.clone(),
                    to: user_info.clone(),
                    authority: pot.to_account_info(),
                },
                signer,
            ),
            out,
            leg.decimals,
        )?;
    }

    // 4. Minimum USDC the sale must produce: value × (1 − slippage), minus the conversion fee.
    let after_slip = legs_value * ((BPS - pot.slippage_bps as u64) as u128) / (BPS as u128);
    let conv_fee = after_slip * (CONVERSION_FEE_BPS as u128) / (BPS as u128);
    let min_from_sale = after_slip; // the holder must receive this much from selling the legs
    let net_to_holder = (cash_out as u128) + min_from_sale - conv_fee;
    require!(net_to_holder >= min_usdc_out as u128, PotError::SlippageAssets);

    // 5. Record the window. Balance snapshot is taken AFTER the cash transfer so only the sale counts.
    let user_usdc_after_cash = ctx.accounts.user_usdc.amount.saturating_add(cash_out);
    let pot = &mut ctx.accounts.pot;
    pot.rebalance = RebalanceState {
        open: true,
        leg_out: EXIT_LEG,
        leg_in: EXIT_LEG,
        amount_out: u64::try_from(min_from_sale).map_err(|_| PotError::MathOverflow)?,
        min_in: u64::try_from(conv_fee).map_err(|_| PotError::MathOverflow)?,
        in_vault_before: user_usdc_after_cash,
        slot: clock.slot,
    };
    pot.total_exits_usd = pot.total_exits_usd.saturating_add(cash_out);
    emit!(ExitUsdcOpened {
        pot: pot.key(),
        user: user_key,
        shares,
        cash_out,
        legs_value_usd: u64::try_from(legs_value).unwrap_or(u64::MAX),
        min_usdc_from_sale: pot.rebalance.amount_out,
        conversion_fee: pot.rebalance.min_in,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct ExitUsdcClose<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [POT_SEED, pot.index_mint.as_ref()], bump = pot.bump)]
    pub pot: Account<'info, Pot>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,
    /// `dup`: the treasury may redeem its own position, in which case this is also `protocol_usdc`.
    #[account(mut, dup, token::mint = usdc_mint, token::authority = user)]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(mut, dup, token::mint = usdc_mint, token::authority = config.treasury)]
    pub protocol_usdc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn handle_exit_usdc_close(ctx: Context<ExitUsdcClose>) -> Result<()> {
    require!(
        get_stack_height() == TRANSACTION_LEVEL_STACK_HEIGHT,
        PotError::CpiNotAllowed
    );
    let pot = &ctx.accounts.pot;
    let st = pot.rebalance;
    require!(st.open && st.leg_out == EXIT_LEG, PotError::RebalanceNotOpen);
    let clock = Clock::get()?;
    require!(st.slot == clock.slot, PotError::RebalanceWrongSlot);

    let received = ctx
        .accounts
        .user_usdc
        .amount
        .checked_sub(st.in_vault_before)
        .ok_or(PotError::RebalanceSlippage)?;
    require!(received >= st.amount_out, PotError::RebalanceSlippage);

    // Conversion fee: 0.10% of the sale value, from the holder's USDC to the protocol treasury.
    if st.min_in > 0 {
        token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.protocol_usdc.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            st.min_in,
            ctx.accounts.usdc_mint.decimals,
        )?;
    }

    let pot = &mut ctx.accounts.pot;
    pot.rebalance = RebalanceState::default();
    pot.total_exits_usd = pot.total_exits_usd.saturating_add(received);
    emit!(ExitUsdcClosed {
        pot: pot.key(),
        user: ctx.accounts.user.key(),
        usdc_from_sale: received,
        conversion_fee: st.min_in,
    });
    Ok(())
}

#[event]
pub struct ExitUsdcOpened {
    pub pot: Pubkey,
    pub user: Pubkey,
    pub shares: u64,
    pub cash_out: u64,
    pub legs_value_usd: u64,
    pub min_usdc_from_sale: u64,
    pub conversion_fee: u64,
}

#[event]
pub struct ExitUsdcClosed {
    pub pot: Pubkey,
    pub user: Pubkey,
    pub usdc_from_sale: u64,
    pub conversion_fee: u64,
}
