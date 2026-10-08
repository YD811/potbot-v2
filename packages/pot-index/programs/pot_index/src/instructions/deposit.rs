use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, TransferChecked};

use crate::{constants::*, errors::PotError, oracle, state::*};

/// Deposit USDC, pay the 0.30% entry fee, mint index tokens at NAV.
///
/// remaining_accounts: for each leg i, in order: `[vault_i, pyth_price_update_i]`.
#[derive(Accounts)]
pub struct Deposit<'info> {
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
    #[account(mut, token::mint = usdc_mint, token::authority = user)]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(mut, address = pot.cash_vault)]
    pub cash_vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = usdc_mint, token::authority = pot.creator)]
    pub creator_usdc: Account<'info, TokenAccount>,
    #[account(mut, token::mint = usdc_mint, token::authority = config.treasury)]
    pub protocol_usdc: Account<'info, TokenAccount>,
    /// Optional referrer USDC account. If absent, the referrer share goes to the creator.
    #[account(mut, token::mint = usdc_mint)]
    pub referrer_usdc: Option<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

pub fn handle_deposit<'info>(
    ctx: Context<'info, Deposit<'info>>,
    amount: u64,
    min_shares_out: u64,
) -> Result<()> {
    let config = &ctx.accounts.config;
    let pot = &ctx.accounts.pot;
    require!(!config.paused, PotError::ProtocolPaused);
    require!(pot.finalized, PotError::PotNotFinalized);
    require!(!pot.paused, PotError::PotPaused);
    require!(amount >= MIN_DEPOSIT, PotError::DepositTooSmall);
    let clock = Clock::get()?;
    // A rebalance can only be open inside its own transaction (see rebalance.rs); a stale flag
    // from any other slot must never block users.
    require!(
        !(pot.rebalance.open && pot.rebalance.slot == clock.slot),
        PotError::RebalanceOpen
    );

    if let Some(r) = &ctx.accounts.referrer_usdc {
        require!(r.owner != ctx.accounts.user.key(), PotError::SelfReferral);
    }

    // 1. Price the Pot before the deposit (legs valued at price + conf: conservative for the Pot).
    let legs = oracle::snapshot_legs(pot, ctx.remaining_accounts, &clock, config.max_price_age_secs)?;
    let nav_before = oracle::nav_usd(ctx.accounts.cash_vault.amount, &legs)?;

    // 2. Fees: 0.30% split 40/40/20 (referrer/creator/protocol); no referrer → creator gets 80%.
    let fee = (amount as u128) * (ENTRY_FEE_BPS as u128) / (BPS as u128);
    let fee_protocol = fee * (FEE_SHARE_PROTOCOL_BPS as u128) / (BPS as u128);
    let fee_referrer = fee * (FEE_SHARE_REFERRER_BPS as u128) / (BPS as u128);
    let fee_creator = fee - fee_protocol - fee_referrer;
    let (fee_referrer, fee_creator) = if ctx.accounts.referrer_usdc.is_some() {
        (fee_referrer, fee_creator)
    } else {
        (0u128, fee_creator + fee_referrer)
    };
    let net = (amount as u128) - fee;
    require!(net > 0, PotError::DepositTooSmall);

    // 3. Cap check on NAV after deposit.
    if pot.deposit_cap_usd > 0 {
        let after = nav_before.checked_add(net).ok_or(PotError::MathOverflow)?;
        require!(after <= pot.deposit_cap_usd as u128, PotError::DepositCapExceeded);
    }

    // 4. Shares at NAV, with virtual offset.
    let shares = oracle::shares_for_deposit(net, nav_before, ctx.accounts.index_mint.supply)?;
    require!(shares > 0, PotError::DepositTooSmall);
    require!(shares >= min_shares_out, PotError::SlippageShares);

    // 5. Move USDC: net → cash vault; fees → recipients.
    let decimals = ctx.accounts.usdc_mint.decimals;
    let user_transfer = |to: AccountInfo<'info>, amt: u64| -> Result<()> {
        if amt == 0 {
            return Ok(());
        }
        token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to,
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amt,
            decimals,
        )
    };
    user_transfer(ctx.accounts.cash_vault.to_account_info(), net as u64)?;
    user_transfer(ctx.accounts.creator_usdc.to_account_info(), fee_creator as u64)?;
    user_transfer(ctx.accounts.protocol_usdc.to_account_info(), fee_protocol as u64)?;
    if let Some(r) = &ctx.accounts.referrer_usdc {
        user_transfer(r.to_account_info(), fee_referrer as u64)?;
    }

    // 6. Mint shares with the Pot PDA as authority.
    let pot = &ctx.accounts.pot;
    let seeds = pot.seeds();
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            MintTo {
                mint: ctx.accounts.index_mint.to_account_info(),
                to: ctx.accounts.user_index_ata.to_account_info(),
                authority: pot.to_account_info(),
            },
            &[&seeds],
        ),
        shares,
    )?;

    let pot = &mut ctx.accounts.pot;
    pot.total_deposits_usd = pot.total_deposits_usd.saturating_add(net as u64);

    emit!(Deposited {
        pot: pot.key(),
        user: ctx.accounts.user.key(),
        amount_usdc: amount,
        fee_usdc: fee as u64,
        shares,
        nav_before: nav_before as u64,
    });
    Ok(())
}

#[event]
pub struct Deposited {
    pub pot: Pubkey,
    pub user: Pubkey,
    pub amount_usdc: u64,
    pub fee_usdc: u64,
    pub shares: u64,
    pub nav_before: u64,
}
