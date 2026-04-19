use anchor_lang::prelude::*;

use crate::state::pot::PotAccount;
use crate::state::sns_domain::SnsAccount;
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(domain_name: String)]
pub struct CreateSnsDomain<'info> {
    #[account(mut)]
    pub pot: Account<'info, PotAccount>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + SnsAccount::INIT_SPACE,
        seeds = [b"sns", pot.key().as_ref()],
        bump
    )]
    pub sns_account: Account<'info, SnsAccount>,
    
    #[account(
        mut,
        constraint = authority.key() == pot.authority @ ErrorCode::UnauthorizedAccess
    )]
    pub authority: Signer<'info>,
    
    /// PotBot treasury (receives SNS fee)
    /// CHECK: Treasury address is hardcoded
    #[account(
        mut,
        address = crate::constants::TREASURY_ADDRESS
    )]
    pub treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateSnsDomain>, domain_name: String) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    let sns_account = &mut ctx.accounts.sns_account;
    
    // Validate domain name (lowercase, alphanumeric + hyphens only)
    require!(
        domain_name.len() >= 3 && domain_name.len() <= 32,
        ErrorCode::InvalidDomainName
    );
    
    require!(
        domain_name.chars().all(|c| c.is_alphanumeric() || c == '-'),
        ErrorCode::InvalidDomainName
    );
    
    require!(
        !domain_name.starts_with('-') && !domain_name.ends_with('-'),
        ErrorCode::InvalidDomainName
    );
    
    // SNS domain fee: 0.5 SOL
    let sns_fee = 500_000_000; // 0.5 SOL in lamports
    
    // Transfer fee to treasury
    **ctx.accounts.authority.lamports.borrow_mut() -= sns_fee;
    **ctx.accounts.treasury.lamports.borrow_mut() += sns_fee;
    
    // Initialize SNS account
    sns_account.pot = pot.key();
    sns_account.domain_name = domain_name.clone();
    sns_account.full_domain = format!("{}.potbot.sol", domain_name);
    sns_account.created_at = Clock::get()?.unix_timestamp;
    sns_account.bump = ctx.bumps.sns_account;
    
    msg!(
        "SNS domain created: {} for pot {}",
        sns_account.full_domain,
        pot.name
    );
    
    Ok(())
}