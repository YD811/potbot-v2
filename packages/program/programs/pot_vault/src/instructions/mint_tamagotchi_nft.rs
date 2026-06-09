use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use mpl_token_metadata::instructions::{
    CreateMetadataAccountV3Cpi, CreateMetadataAccountV3CpiAccounts,
    CreateMetadataAccountV3InstructionArgs,
};
use mpl_token_metadata::types::{DataV2, Creator};

use crate::state::pot::PotAccount;
use crate::state::tamagotchi_nft::TamagotchiNftAccount;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct MintTamagotchiNft<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    #[account(
        init,
        payer = authority,
        space = 8 + TamagotchiNftAccount::INIT_SPACE,
        seeds = [b"tamagotchi_nft", pot.key().as_ref()],
        bump
    )]
    pub tamagotchi_nft_account: Box<Account<'info, TamagotchiNftAccount>>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = pot,
        mint::freeze_authority = pot,
        seeds = [b"tamagotchi_mint", pot.key().as_ref()],
        bump
    )]
    pub tamagotchi_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = tamagotchi_mint,
        associated_token::authority = authority
    )]
    pub tamagotchi_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: Metadata account, checked by Metaplex
    #[account(
        mut,
        seeds = [
            "metadata".as_bytes(),
            mpl_token_metadata::ID.as_ref(),
            tamagotchi_mint.key().as_ref()
        ],
        bump,
        seeds::program = mpl_token_metadata::ID
    )]
    pub metadata_account: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = authority.key() == pot.authority @ ErrorCode::UnauthorizedAccess
    )]
    pub authority: Signer<'info>,

    /// CHECK: Treasury address is hardcoded
    #[account(
        mut,
        address = crate::constants::TREASURY_ADDRESS
    )]
    pub treasury: AccountInfo<'info>,

    /// CHECK: Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub metadata_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<MintTamagotchiNft>) -> Result<()> {
    // Extract values from pot before any mutable borrows
    let pot_key = ctx.accounts.pot.key();
    let pot_name = ctx.accounts.pot.name.clone();
    let pot_authority = ctx.accounts.pot.authority;
    let pot_bump = ctx.accounts.pot.pot_bump;
    let tamagotchi_level = ctx.accounts.pot.tamagotchi_level;
    let tamagotchi_xp = ctx.accounts.pot.tamagotchi_xp;

    // NFT creation fee: 0.05 SOL
    let nft_fee = 50_000_000u64;
    **ctx.accounts.authority.lamports.borrow_mut() -= nft_fee;
    **ctx.accounts.treasury.lamports.borrow_mut() += nft_fee;

    // Initialize Tamagotchi NFT account
    {
        let tamagotchi_nft = &mut ctx.accounts.tamagotchi_nft_account;
        tamagotchi_nft.pot = pot_key;
        tamagotchi_nft.mint = ctx.accounts.tamagotchi_mint.key();
        tamagotchi_nft.owner = ctx.accounts.authority.key();
        tamagotchi_nft.level = tamagotchi_level;
        tamagotchi_nft.xp = tamagotchi_xp;
        tamagotchi_nft.created_at = Clock::get()?.unix_timestamp;
        tamagotchi_nft.last_evolved_at = Clock::get()?.unix_timestamp;
        tamagotchi_nft.bump = ctx.bumps.tamagotchi_nft_account;
    }

    // Build signer seeds for pot PDA
    let seeds: &[&[u8]] = &[
        b"pot",
        pot_authority.as_ref(),
        pot_name.as_bytes(),
        &[pot_bump],
    ];
    let signer_seeds = &[seeds];

    // Mint 1 NFT to authority
    anchor_spl::token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::MintTo {
                mint: ctx.accounts.tamagotchi_mint.to_account_info(),
                to: ctx.accounts.tamagotchi_token_account.to_account_info(),
                authority: ctx.accounts.pot.to_account_info(),
            },
            signer_seeds,
        ),
        1,
    )?;

    // Build metadata
    let metadata_title = format!("{} Tamagotchi Level {}", pot_name, tamagotchi_level);
    let metadata_uri = format!(
        "https://api.potbot.fun/metadata/tamagotchi/{}/{}",
        pot_key, tamagotchi_level
    );
    let metadata = DataV2 {
        name: metadata_title,
        symbol: "POTTAMA".to_string(),
        uri: metadata_uri,
        seller_fee_basis_points: 0,
        creators: Some(vec![Creator {
            address: pot_key,
            verified: true,
            share: 100,
        }]),
        collection: None,
        uses: None,
    };

    // Bind account infos for CPI
    let pot_info       = ctx.accounts.pot.to_account_info();
    let mint_info      = ctx.accounts.tamagotchi_mint.to_account_info();
    let metadata_info  = ctx.accounts.metadata_account.to_account_info();
    let auth_info      = ctx.accounts.authority.to_account_info();
    let meta_prog_info = ctx.accounts.metadata_program.to_account_info();
    let sys_info       = ctx.accounts.system_program.to_account_info();
    let rent_info      = ctx.accounts.rent.to_account_info();

    CreateMetadataAccountV3Cpi::new(
        &meta_prog_info,
        CreateMetadataAccountV3CpiAccounts {
            metadata: &metadata_info,
            mint: &mint_info,
            mint_authority: &pot_info,
            payer: &auth_info,
            update_authority: (&pot_info, true),
            system_program: &sys_info,
            rent: Some(&rent_info),
        },
        CreateMetadataAccountV3InstructionArgs {
            data: metadata,
            is_mutable: true,
            collection_details: None,
        },
    ).invoke_signed(signer_seeds)?;

    msg!(
        "Tamagotchi NFT minted for pot {}: mint = {}, level = {}, fee = 0.05 SOL",
        pot_name,
        ctx.accounts.tamagotchi_mint.key(),
        tamagotchi_level
    );

    Ok(())
}
