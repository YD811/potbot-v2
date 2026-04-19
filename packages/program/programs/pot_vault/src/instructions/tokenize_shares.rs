use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::pot::PotAccount;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct TokenizeShares<'info> {
    #[account(mut)]
    pub pot: Account<'info, PotAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = pot,
        seeds = [b"token_mint", pot.key().as_ref()],
        bump
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = authority.key() == pot.authority @ ErrorCode::UnauthorizedAccess
    )]
    pub authority: Signer<'info>,
    
    /// PotBot treasury (YD's wallet receives tokenization fee)
    /// CHECK: Treasury address is hardcoded
    #[account(
        mut,
        address = crate::constants::TREASURY_ADDRESS
    )]
    pub treasury: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<TokenizeShares>) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    
    // Check if already tokenized
    require!(pot.token_mint == Pubkey::default(), ErrorCode::AlreadyTokenized);
    
    // Tokenization fee: 0.1 SOL
    let tokenization_fee = 100_000_000; // 0.1 SOL in lamports
    
    // Transfer fee to YD's treasury
    **ctx.accounts.authority.lamports.borrow_mut() -= tokenization_fee;
    **ctx.accounts.treasury.lamports.borrow_mut() += tokenization_fee;
    
    // Set the token mint in pot account
    pot.token_mint = ctx.accounts.token_mint.key();
    pot.shares_per_sol = 1000; // 1000 tokens per 1 SOL for better UX
    
    msg!(
        "Pot {} tokenized! Token mint: {}, Fee paid to YD: {} SOL",
        pot.name,
        pot.token_mint,
        tokenization_fee as f64 / 1_000_000_000.0
    );
    
    Ok(())
}

// ── Additional helper instruction for minting tokens to existing members ──

#[derive(Accounts)]
pub struct MintTokensToMember<'info> {
    #[account(
        constraint = pot.token_mint != Pubkey::default() @ ErrorCode::NotTokenized
    )]
    pub pot: Account<'info, PotAccount>,
    
    #[account(
        mut,
        seeds = [b"token_mint", pot.key().as_ref()],
        bump,
        constraint = token_mint.key() == pot.token_mint
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = token_mint,
        associated_token::authority = member_wallet
    )]
    pub member_token_account: Account<'info, anchor_spl::token::TokenAccount>,
    
    /// CHECK: Member wallet to receive tokens
    pub member_wallet: AccountInfo<'info>,
    
    #[account(
        mut,
        constraint = authority.key() == pot.authority @ ErrorCode::UnauthorizedAccess
    )]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn mint_tokens_to_member(
    ctx: Context<MintTokensToMember>,
    shares_amount: u64,
) -> Result<()> {
    let pot = &ctx.accounts.pot;
    
    // Calculate token amount (shares * shares_per_sol)
    let token_amount = shares_amount
        .checked_mul(pot.shares_per_sol)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    
    // Mint tokens using pot as authority
    let seeds = &[
        b"pot",
        pot.name.as_bytes(),
        pot.authority.as_ref(),
        &[pot.pot_bump],
    ];
    let signer_seeds = &[&seeds[..]];
    
    anchor_spl::token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.member_token_account.to_account_info(),
                authority: ctx.accounts.pot.to_account_info(),
            },
            signer_seeds,
        ),
        token_amount,
    )?
    
    msg!(
        "Minted {} tokens to {} for {} shares",
        token_amount,
        ctx.accounts.member_wallet.key(),
        shares_amount
    );
    
    Ok(())
}