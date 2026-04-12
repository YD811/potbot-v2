use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct UpdateTamagotchi<'info> {
    #[account(mut)]
    pub pot: Account<'info, PotAccount>,
}

pub fn handler(ctx: Context<UpdateTamagotchi>) -> Result<()> {
    let pot = &mut ctx.accounts.pot;

    // Calculate XP components
    // volumeXP = min(total_volume_sol * 10, 5000)
    let total_volume_sol = pot.total_volume / 1_000_000_000;
    let volume_xp = std::cmp::min(total_volume_sol * 10, 5000);

    // memberXP = member_count * 50
    let member_xp = (pot.member_count as u64) * 50;

    // tradeXP = trade_count * 20
    let trade_xp = (pot.trade_count as u64) * 20;

    // Total XP
    let total_xp = volume_xp + member_xp + trade_xp;

    pot.tamagotchi_xp = total_xp;

    // Calculate level based on XP thresholds
    let new_level = match total_xp {
        0..=99 => 0,
        100..=499 => 1,
        500..=1999 => 2,
        2000..=7999 => 3,
        8000..=24999 => 4,
        25000.. => 5,
    };

    if new_level != pot.tamagotchi_level {
        msg!(
            "Tamagotchi evolved: level {} → {} (xp: {})",
            pot.tamagotchi_level,
            new_level,
            total_xp
        );
        pot.tamagotchi_level = new_level;
    }

    msg!(
        "Tamagotchi updated: level={}, xp={} (volume_xp={}, member_xp={}, trade_xp={})",
        pot.tamagotchi_level,
        total_xp,
        volume_xp,
        member_xp,
        trade_xp
    );

    Ok(())
}
