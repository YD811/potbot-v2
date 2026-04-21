use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use mpl_token_metadata::instructions::{
    UpdateMetadataAccountV2Cpi, UpdateMetadataAccountV2CpiAccounts,
    UpdateMetadataAccountV2InstructionArgs,
};
use mpl_token_metadata::types::DataV2;

use crate::state::pot::PotAccount;
use crate::state::tamagotchi_nft::TamagotchiNftAccount;

#[derive(Accounts)]
pub struct UpdateTamagotchiMetadata<'info> {
    #[account(mut)]
    pub pot: Account<'info, PotAccount>,

    #[account(
        mut,
        seeds = [b"tamagotchi_nft", pot.key().as_ref()],
        bump = tamagotchi_nft_account.bump
    )]
    pub tamagotchi_nft_account: Account<'info, TamagotchiNftAccount>,

    #[account(
        seeds = [b"tamagotchi_mint", pot.key().as_ref()],
        bump,
        constraint = tamagotchi_mint.key() == tamagotchi_nft_account.mint
    )]
    pub tamagotchi_mint: Account<'info, Mint>,

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

    /// CHECK: Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub metadata_program: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<UpdateTamagotchiMetadata>) -> Result<()> {
    let pot = &ctx.accounts.pot;
    let tamagotchi_nft = &mut ctx.accounts.tamagotchi_nft_account;

    if tamagotchi_nft.level != pot.tamagotchi_level {
        let new_title = format!("{} Tamagotchi Level {}", pot.name, pot.tamagotchi_level);
        let new_uri = format!(
            "https://api.potbot.fun/metadata/tamagotchi/{}/{}",
            pot.key(),
            pot.tamagotchi_level
        );

        let new_metadata = DataV2 {
            name: new_title,
            symbol: "POTTAMA".to_string(),
            uri: new_uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        let seeds = &[
            b"pot" as &[u8],
            pot.name.as_bytes(),
            pot.authority.as_ref(),
            &[pot.pot_bump],
        ];
        let signer_seeds = &[seeds];

        let metadata_info = ctx.accounts.metadata_account.to_account_info();
        let update_authority_info = ctx.accounts.pot.to_account_info();
        let meta_prog_info = ctx.accounts.metadata_program.to_account_info();

        UpdateMetadataAccountV2Cpi::new(
            &meta_prog_info,
            UpdateMetadataAccountV2CpiAccounts {
                metadata: &metadata_info,
                update_authority: &update_authority_info,
            },
            UpdateMetadataAccountV2InstructionArgs {
                data: Some(new_metadata),
                new_update_authority: None,
                primary_sale_happened: None,
                is_mutable: None,
            },
        ).invoke_signed(signer_seeds)?;

        tamagotchi_nft.level = pot.tamagotchi_level;
        tamagotchi_nft.xp = pot.tamagotchi_xp;
        tamagotchi_nft.last_evolved_at = Clock::get()?.unix_timestamp;

        msg!(
            "Tamagotchi evolved! Pot: {}, New Level: {}, XP: {}",
            pot.name,
            pot.tamagotchi_level,
            pot.tamagotchi_xp
        );
    }

    Ok(())
}
