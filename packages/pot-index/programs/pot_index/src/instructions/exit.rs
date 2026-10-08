use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, TransferChecked};

use crate::{constants::*, errors::PotError, oracle, state::*};

/// Burn index tokens and receive the proportional share of every leg in kind.
/// No oracle, no swaps, never pausable. The 0.50% exit fee stays in the Pot.
///
/// remaining_accounts: for each leg i, in order: `[vault_i, user_ata_i, mint_i]`.
#[derive(Accounts)]
pub struct Exit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [POT_SEED, pot.index_mint.as_ref()], bump = pot.bump)]
    pub pot: Account<'info, Pot>,
    #[account(mut, address = pot.index_mint)]
    pub index_mint: Account<'info, Mint>,
    #[account(mut, token::mint = index_mint, token::authority = user)]
    pub user_index_ata: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(mut, address = pot.cash_vault, token::mint = usdc_mint)]
    pub cash_vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = usdc_mint, token::authority = user)]
    pub user_usdc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn handle_exit<'info>(
    ctx: Context<'info, Exit<'info>>,
    shares: u64,
    min_usdc_out: u64,
) -> Result<()> {
    let pot = &ctx.accounts.pot;
    require!(pot.finalized, PotError::PotNotFinalized);
    require!(!pot.rebalance.open, PotError::RebalanceOpen);
    require!(shares > 0, PotError::ZeroShares);
    require!(
        ctx.remaining_accounts.len() == pot.legs.len() * 3,
        PotError::RemainingAccountsMismatch
    );

    let supply = ctx.accounts.index_mint.supply;
    require!(supply >= shares, PotError::ZeroShares);

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

    // 2. Cash leg.
    let usdc_out = oracle::exit_amount(ctx.accounts.cash_vault.amount, shares, supply)?;
    require!(usdc_out >= min_usdc_out, PotError::SlippageAssets);
    if usdc_out > 0 {
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
            usdc_out,
            ctx.accounts.usdc_mint.decimals,
        )?;
    }

    // 3. Every asset leg, in kind. Each account is validated by hand.
    for (i, leg) in pot.legs.iter().enumerate() {
        let vault_info = &ctx.remaining_accounts[i * 3];
        let user_info = &ctx.remaining_accounts[i * 3 + 1];
        let mint_info = &ctx.remaining_accounts[i * 3 + 2];
        require_keys_eq!(vault_info.key(), leg.vault, PotError::VaultMismatch);
        let vault = Account::<TokenAccount>::try_from(vault_info)?;
        let user_ata = Account::<TokenAccount>::try_from(user_info)?;
        require_keys_eq!(user_ata.mint, leg.mint, PotError::TokenMintMismatch);
        require_keys_eq!(user_ata.owner, user_key, PotError::TokenOwnerMismatch);

        let out = oracle::exit_amount(vault.amount, shares, supply)?;
        if out == 0 {
            continue;
        }
        require_keys_eq!(mint_info.key(), leg.mint, PotError::TokenMintMismatch);
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

    emit!(Exited {
        pot: pot.key(),
        user: user_key,
        shares,
        usdc_out,
    });
    Ok(())
}

#[event]
pub struct Exited {
    pub pot: Pubkey,
    pub user: Pubkey,
    pub shares: u64,
    pub usdc_out: u64,
}
