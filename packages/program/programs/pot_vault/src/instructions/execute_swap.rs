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

    #[account(constraint = authority.key() == pot.authority @ PotError::Unauthorized)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecuteSwap>, params: ExecuteSwapParams) -> Result<()> {
    let pot = &mut ctx.accounts.pot;

    // Validate vault has enough balance
    let vault_balance = ctx.accounts.vault.lamports();
    require!(
        vault_balance >= params.amount_in,
        PotError::InsufficientVaultBalance
    );

    // For now, log the swap intent (real Jupiter CPI to be added in v2)
    msg!(
        "Swap executed: {} lamports of {} → {} (min out: {})",
        params.amount_in,
        params.from_mint,
        params.to_mint,
        params.min_amount_out
    );

    // Increment trade count
    pot.trade_count = pot
        .trade_count
        .checked_add(1)
        .ok_or(PotError::MathOverflow)?;

    // Increment total volume (in lamports)
    pot.total_volume = pot
        .total_volume
        .checked_add(params.amount_in)
        .ok_or(PotError::MathOverflow)?;

    // Recalculate tamagotchi XP and level inline
    let total_volume_sol = pot.total_volume / 1_000_000_000;
    let volume_xp = std::cmp::min(total_volume_sol * 10, 5000);
    let member_xp = (pot.member_count as u64) * 50;
    let trade_xp = (pot.trade_count as u64) * 20;
    let total_xp = volume_xp + member_xp + trade_xp;

    pot.tamagotchi_xp = total_xp;

    let new_level = match total_xp {
        0..=99 => 0,
        100..=499 => 1,
        500..=1999 => 2,
        2000..=7999 => 3,
        8000..=24999 => 4,
        25000.. => 5,
    };

    let level_changed = new_level != pot.tamagotchi_level;
    if level_changed {
        msg!(
            "Tamagotchi evolved: level {} → {} (xp: {})",
            pot.tamagotchi_level,
            new_level,
            total_xp
        );
        pot.tamagotchi_level = new_level;
    }

    // Emit swap executed event
    emit!(SwapExecuted {
        pot: pot.key(),
        from_mint: params.from_mint,
        to_mint: params.to_mint,
        amount_in: params.amount_in,
        min_amount_out: params.min_amount_out,
        trade_count: pot.trade_count,
        total_volume: pot.total_volume,
        tamagotchi_level: pot.tamagotchi_level,
        tamagotchi_xp: pot.tamagotchi_xp,
    });

    msg!(
        "Trade #{} completed in POT {} — Total volume: {} lamports, Tamagotchi level: {}",
        pot.trade_count,
        pot.name,
        pot.total_volume,
        pot.tamagotchi_level
    );

    Ok(())
}

#[event]
pub struct SwapExecuted {
    pub pot: Pubkey,
    pub from_mint: Pubkey,
    pub to_mint: Pubkey,
    pub amount_in: u64,
    pub min_amount_out: u64,
    pub trade_count: u32,
    pub total_volume: u64,
    pub tamagotchi_level: u8,
    pub tamagotchi_xp: u64,
}
