use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PotError;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ExecuteSwapParams {
    pub from_mint: Pubkey,
    pub to_mint: Pubkey,
    pub amount_in: u64,
    pub min_amount_out: u64,
}

#[derive(Accounts)]
pub struct ExecuteSwap<'info> {
    #[account(mut)]
    pub pot: Account<'info, PotAccount>,

    /// CHECK: PDA vault that holds SOL
    #[account(
        mut,
        seeds = [b"vault", pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    /// Authority (pot creator or approved executor)
    #[account(constraint = authority.key() == pot.authority @ PotError::Unauthorized)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecuteSwap>, params: ExecuteSwapParams) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    let clock = Clock::get()?;

    // Validate vault has enough balance
    let vault_balance = ctx.accounts.vault.lamports();
    require!(vault_balance >= params.amount_in, PotError::InsufficientVaultBalance);

    // Validate trade size limit
    if pot.config.max_trade_size_bps > 0 {
        let max_trade = (vault_balance as u128)
            .checked_mul(pot.config.max_trade_size_bps as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;
        require!(params.amount_in <= max_trade, PotError::TradeSizeExceeded);
    }

    // Update stats
    pot.trade_count  = pot.trade_count.checked_add(1).ok_or(PotError::MathOverflow)?;
    pot.total_volume = pot.total_volume.checked_add(params.amount_in).ok_or(PotError::MathOverflow)?;
    pot.last_activity_at = clock.unix_timestamp;

    // Update high-water mark
    if vault_balance > pot.high_water_mark {
        pot.high_water_mark = vault_balance;
    }

    // Recalculate tamagotchi using shared helper
    pot.recalculate_tamagotchi();

    // Phase 2: Jupiter CPI via invoke_signed with vault seeds
    // let vault_seeds = &[b"vault", pot.key().as_ref(), &[pot.vault_bump]];
    // solana_program::program::invoke_signed(&jup_ix, &accounts, &[vault_seeds])?;

    emit!(SwapExecuted {
        pot:             pot.key(),
        from_mint:       params.from_mint,
        to_mint:         params.to_mint,
        amount_in:       params.amount_in,
        min_amount_out:  params.min_amount_out,
        trade_count:     pot.trade_count,
        total_volume:    pot.total_volume,
        tamagotchi_level: pot.tamagotchi_level,
        tamagotchi_xp:   pot.tamagotchi_xp,
    });

    msg!(
        "Trade #{} in POT \"{}\" — {} lamports {} → {} | Tama Lv.{}",
        pot.trade_count, pot.name,
        params.amount_in, params.from_mint, params.to_mint,
        pot.tamagotchi_level
    );

    Ok(())
}

#[event]
pub struct SwapExecuted {
    pub pot:              Pubkey,
    pub from_mint:        Pubkey,
    pub to_mint:          Pubkey,
    pub amount_in:        u64,
    pub min_amount_out:   u64,
    pub trade_count:      u32,
    pub total_volume:     u64,
    pub tamagotchi_level: u8,
    pub tamagotchi_xp:    u64,
}
