use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use crate::state::*;
use crate::errors::PotError;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub pot: Box<Account<'info, PotAccount>>,

    /// CHECK: PDA vault that holds SOL
    #[account(
        mut,
        seeds = [b"vault", pot.key().as_ref()],
        bump = pot.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        init_if_needed,
        payer = depositor,
        space = 8 + MemberAccount::INIT_SPACE,
        seeds = [b"member", pot.key().as_ref(), depositor.key().as_ref()],
        bump
    )]
    pub member: Box<Account<'info, MemberAccount>>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    // ─── Liquid mode (Phase B) — required only when pot.liquid_mode ──────
    // The SPL share mint (must equal pot.token_mint) and the depositor's ATA
    // to receive auto-minted shares. Absent for legacy internal-shares pots.

    /// The pot's SPL share mint. Validated against pot.token_mint in the
    /// handler (only when liquid_mode).
    #[account(mut)]
    pub token_mint: Option<Box<Account<'info, Mint>>>,

    /// Depositor's ATA for the share token (client creates it idempotently in
    /// the same tx). Validated as ATA(token_mint, depositor) in the handler.
    #[account(mut)]
    pub depositor_ata: Option<Box<Account<'info, TokenAccount>>>,

    pub token_program: Option<Program<'info, Token>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
    let pot = &ctx.accounts.pot;

    // Frozen pot accepts no new capital (members can still withdraw).
    require!(!pot.paused, PotError::PotFrozen);

    // Validate minimum deposit
    require!(lamports >= pot.config.min_deposit, PotError::DepositTooSmall);

    // Public/private check
    if !pot.config.is_public && ctx.accounts.depositor.key() != pot.authority {
        return Err(PotError::NotPublic.into());
    }

    // Max members check (0 = unlimited)
    let is_new_member = ctx.accounts.member.shares == 0 && ctx.accounts.member.deposit_total == 0;
    if is_new_member && pot.config.max_members > 0 {
        require!(
            pot.member_count < pot.config.max_members as u32,
            PotError::MaxMembersReached
        );
    }

    // Get current vault balance BEFORE transfer (critical for correct share math).
    // Price against the balance that backs LIVE shares: subtract SOL already
    // earmarked for queued redemptions so a new depositor isn't credited for
    // funds that are owed out (pending == 0 for every non-queued pot, so this
    // is a no-op for the common path).
    let vault_lamports = ctx.accounts.vault.lamports();
    let nav_base = vault_lamports.saturating_sub(pot.pending_redemption_lamports);

    // Calculate shares
    let shares = pot.lamports_to_shares(lamports, nav_base);
    require!(shares > 0, PotError::ArithmeticOverflow);

    // Transfer SOL: depositor → vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.depositor.to_account_info(),
                to:   ctx.accounts.vault.to_account_info(),
            },
        ),
        lamports,
    )?;

    // Update member account
    let member = &mut ctx.accounts.member;
    let clock  = Clock::get()?;

    if is_new_member {
        member.pot           = ctx.accounts.pot.key();
        member.wallet        = ctx.accounts.depositor.key();
        member.joined_at     = clock.unix_timestamp;
        member.bump          = ctx.bumps.member;
    }

    member.shares           = member.shares.checked_add(shares).ok_or(PotError::ArithmeticOverflow)?;
    member.deposit_total    = member.deposit_total.checked_add(lamports).ok_or(PotError::ArithmeticOverflow)?;
    member.last_deposit_at  = clock.unix_timestamp;

    // Update POT
    {
        let pot = &mut ctx.accounts.pot;
        pot.total_shares     = pot.total_shares.checked_add(shares).ok_or(PotError::ArithmeticOverflow)?;
        pot.last_activity_at = clock.unix_timestamp;
        if is_new_member {
            pot.member_count = pot.member_count.checked_add(1).ok_or(PotError::ArithmeticOverflow)?;
        }
        pot.recalculate_tamagotchi();
    }

    // Snapshot pot fields needed below before any CPI re-borrows ctx.accounts.
    let liquid_mode      = ctx.accounts.pot.liquid_mode;
    let pot_token_mint   = ctx.accounts.pot.token_mint;
    let shares_per_sol   = ctx.accounts.pot.shares_per_sol;
    let authority_key    = ctx.accounts.pot.authority;
    let pot_name         = ctx.accounts.pot.name.clone();
    let pot_bump         = ctx.accounts.pot.pot_bump;
    let total_shares     = ctx.accounts.pot.total_shares;

    // ─── Liquid mode: auto-mint SPL shares to the depositor at NAV ───────
    // The internal `shares` above are NAV-priced (lamports_to_shares against
    // the pre-deposit vault). Mint the matching SPL amount so the depositor
    // holds a composable, redeemable token — no separate tokenize step, no
    // vote (a deposit never removes existing members' funds).
    //
    // NAV note (Phase B / B4): lamports_to_shares prices against idle vault
    // SOL only. For a pot holding non-SOL tokens this under-counts NAV;
    // oracle multi-asset NAV at deposit (remaining_accounts legs) is the B4
    // upgrade. Today liquid mode is correct for SOL-denominated pots.
    if liquid_mode {
        let mint = ctx
            .accounts
            .token_mint
            .as_ref()
            .ok_or(PotError::NotLiquidMode)?;
        let ata = ctx
            .accounts
            .depositor_ata
            .as_ref()
            .ok_or(PotError::NotLiquidMode)?;
        let token_program = ctx
            .accounts
            .token_program
            .as_ref()
            .ok_or(PotError::NotLiquidMode)?;

        require_keys_eq!(mint.key(), pot_token_mint, PotError::NotTokenized);
        require_keys_eq!(ata.mint, mint.key(), PotError::NavLegAccountInvalid);
        require_keys_eq!(
            ata.owner,
            ctx.accounts.depositor.key(),
            PotError::NavLegAccountInvalid
        );

        let mint_amount = shares
            .checked_mul(shares_per_sol)
            .ok_or(PotError::ArithmeticOverflow)?;

        let signer_seeds: &[&[u8]] =
            &[b"pot", authority_key.as_ref(), pot_name.as_bytes(), core::slice::from_ref(&pot_bump)];

        token::mint_to(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                MintTo {
                    mint: mint.to_account_info(),
                    to: ata.to_account_info(),
                    authority: ctx.accounts.pot.to_account_info(),
                },
                &[signer_seeds],
            ),
            mint_amount,
        )?;

        msg!("Liquid deposit: minted {} SPL shares to {}", mint_amount, ctx.accounts.depositor.key());
    }

    msg!(
        "Deposited {} lamports → {} shares in POT \"{}\" (total shares: {})",
        lamports, shares, pot_name, total_shares
    );
    Ok(())
}
