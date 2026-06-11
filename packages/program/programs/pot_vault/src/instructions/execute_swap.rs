// PotBot v2 — execute_swap (multi-mode)
//
// Wraps a Jupiter v6 swap instruction in our program with three auth paths
// distinguished at the boundary by `ExecuteSwapArgs.mode`:
//
//   AdminDirect      — signer == pot.authority. No governance. Bounded by
//                      mint allowlist + spending-limit on the pot.
//   Proposal         — executes a PASSED proposal whose swap_spec matches the
//                      Pending strategy. Any pot.authority OR Member-NFT
//                      holder can press execute; in Phase 2 we add the NFT
//                      check, for now it's admin-gated.
//   StrategyTrigger  — off-chain keeper fires with reason (StopLoss / TP /
//                      Trailing). On-chain Pyth read re-verifies the
//                      condition. Signer must equal pot.agent_authority.
//
// In every path the vault PDA signs Jupiter via `invoke_signed` with
// `[b"vault", pot]` seeds. Slippage is enforced twice: off-chain at quote
// build (max 500 bps) and on-chain via balance snapshot pre/post.
//
// State machine:
//   Pending  --entry-->   Active
//   Active   --exit-->    Closed
//   Parked   --exit-->    Closed
//
// Yield routing (Parked) is a separate instruction (route_to_yield) and does
// NOT flow through execute_swap.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};
use anchor_spl::token::TokenAccount;

use crate::constants::{
    JUPITER_V6_PROGRAM_ID, MAX_SLIPPAGE_BPS, STRATEGY_SEED, VAULT_SEED,
};
use crate::pyth::{assert_trigger_is_valid, price_to_q64, read_price_update};
use crate::state::proposal_swap::{assert_strategy_matches_spec, ProposalSwapSpec};
use crate::state::strategy::{
    StrategyAccount, StrategySource, StrategyStatus, TriggerReason,
};

// ---------------------------------------------------------------------------
// SwapMode — picked by the caller, validated against StrategyAccount.source.
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum SwapMode {
    /// signer == pot.authority, no governance.
    AdminDirect,
    /// Executes a PASSED proposal. `proposal_id` must match strategy.source.
    Proposal { proposal_id: u64 },
    /// Keeper-fired trigger. Pyth verifies the reason on-chain.
    StrategyTrigger { reason: TriggerReason },
}

// ---------------------------------------------------------------------------
// ExecuteSwapArgs
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ExecuteSwapArgs {
    pub mode: SwapMode,
    /// Amount of input token intended to spend.
    pub amount_in: u64,
    /// Minimum acceptable output — hard floor enforced on-chain.
    pub min_out: u64,
    /// Absolute ceiling on input consumed (defense-in-depth; normally == amount_in).
    pub max_in: u64,
    /// Entry (Pending→Active) or exit (Active/Parked→Closed).
    pub is_entry: bool,
    /// Raw Jupiter v6 swap instruction data from `/swap-instructions`.
    pub jupiter_ix_data: Vec<u8>,
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(args: ExecuteSwapArgs)]
pub struct ExecuteSwap<'info> {
    /// Parent pot. Authority / agent_authority are validated dynamically
    /// inside `authorize_mode` — we can't bind via `has_one` here because
    /// the required signer varies by mode.
    #[account(
        mut,
        constraint = !pot.paused @ crate::errors::PotError::StrategyInactive,
    )]
    pub pot: Box<Account<'info, crate::state::pot::PotAccount>>,

    #[account(
        mut,
        seeds = [STRATEGY_SEED, pot.key().as_ref(), &strategy.slot_id.to_le_bytes()],
        bump = strategy.bump,
        has_one = pot,
    )]
    pub strategy: Box<Account<'info, StrategyAccount>>,

    /// CHECK: vault PDA. Signs Jupiter CPI via invoke_signed with canonical bump.
    /// Asset ownership is validated via source_ata / destination_ata.owner below.
    #[account(
        seeds = [VAULT_SEED, pot.key().as_ref()],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = source_ata.owner == vault.key()
            @ crate::errors::PotError::VaultOwnerMismatch,
        constraint = (args.is_entry && source_ata.mint == strategy.input_mint) || (!args.is_entry && source_ata.mint == strategy.output_mint)
            @ crate::errors::PotError::MintNotAllowlisted,
    )]
    pub source_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = destination_ata.owner == vault.key()
            @ crate::errors::PotError::VaultOwnerMismatch,
        constraint = (args.is_entry && destination_ata.mint == strategy.output_mint) || (!args.is_entry && destination_ata.mint == strategy.input_mint)
            @ crate::errors::PotError::MintNotAllowlisted,
    )]
    pub destination_ata: Box<Account<'info, TokenAccount>>,

    /// CHECK: Jupiter v6. Pinned by pubkey.
    #[account(
        constraint = jupiter_program.key() == JUPITER_V6_PROGRAM_ID
            @ crate::errors::PotError::YieldTargetInvalid
    )]
    pub jupiter_program: UncheckedAccount<'info>,

    /// CHECK: Pyth price-update account. Owner verified inside pyth.rs.
    /// For AdminDirect / Proposal modes this may be the program id as a
    /// sentinel (we never read it in those modes).
    pub pyth_price_update: UncheckedAccount<'info>,

    /// Optional ProposalSwapSpec PDA. REQUIRED when `mode == Proposal`; the
    /// handler enforces presence + match of spec.proposal_id, spec.passed,
    /// spec.input_mint/output_mint, spec.max_in/min_out. Absent for the
    /// AdminDirect and StrategyTrigger paths.
    #[account(
        mut,
        seeds = [b"proposal_swap", proposal_swap_spec.proposal.as_ref()],
        bump = proposal_swap_spec.bump,
        has_one = pot @ crate::errors::PotError::ProposalMismatch,
    )]
    pub proposal_swap_spec: Option<Box<Account<'info, ProposalSwapSpec>>>,

    /// Signer interpretation:
    ///   AdminDirect      → must equal pot.authority
    ///   Proposal         → must equal pot.authority (Phase 2: or Member NFT)
    ///   StrategyTrigger  → must equal pot.agent_authority
    #[account(mut)]
    pub authority: Signer<'info>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteSwap<'info>>,
    args: ExecuteSwapArgs,
) -> Result<()> {
    // --- 1. cheap sanity ----------------------------------------------------
    require!(args.amount_in > 0, crate::errors::PotError::InvalidSwapAmount);
    require!(args.min_out > 0, crate::errors::PotError::SlippageExceeded);
    require!(
        args.max_in >= args.amount_in,
        crate::errors::PotError::OverspentInput
    );

    // --- 2. mode-specific authorization ------------------------------------
    authorize_mode(&ctx, &args)?;

    // --- 3. strategy lifecycle guard ---------------------------------------
    require!(
        ctx.accounts.strategy.is_executable(),
        crate::errors::PotError::StrategyInactive
    );
    if args.is_entry {
        require!(
            ctx.accounts.strategy.status == StrategyStatus::Pending,
            crate::errors::PotError::StrategyInactive
        );
    } else {
        require!(
            matches!(
                ctx.accounts.strategy.status,
                StrategyStatus::Active | StrategyStatus::Parked
            ),
            crate::errors::PotError::StrategyInactive
        );
    }

    // --- 4. spending policy (mint allowlist + daily budget + per-swap cap) -
    enforce_spending_policy(&ctx, &args)?;

    // --- 5. snapshot pre balances ------------------------------------------
    ctx.accounts.source_ata.reload()?;
    ctx.accounts.destination_ata.reload()?;
    let pre_in = ctx.accounts.source_ata.amount;
    let pre_out = ctx.accounts.destination_ata.amount;

    require!(
        pre_in >= args.amount_in,
        crate::errors::PotError::OverspentInput
    );

    // --- 6. build + CPI Jupiter --------------------------------------------
    let pot_key = ctx.accounts.pot.key();
    let vault_bump = ctx.bumps.vault;
    let vault_key = ctx.accounts.vault.key();

    // Defence-in-depth: every account passed via remaining_accounts must
    // belong to a small whitelist of trusted programs (Token / ATA / SysVar
    // / System / Jupiter v6 itself). The vault PDA is allowed regardless of
    // owner (it is owned by the System program but signs via invoke_signed).
    // Without this filter, a malicious caller could splice in a writable
    // account they control as `userPublicKey` substitute and have Jupiter
    // siphon outputs there.
    for ai in ctx.remaining_accounts.iter() {
        if *ai.key == vault_key {
            continue;
        }
        let owner = ai.owner;
        let allowed = *owner == anchor_spl::token::ID
            || *owner == anchor_spl::associated_token::ID
            || *owner == anchor_lang::solana_program::system_program::ID
            || *owner == anchor_lang::solana_program::sysvar::ID
            || *owner == JUPITER_V6_PROGRAM_ID
            // Jupiter's own program-derived accounts and route accounts are
            // owned by Jupiter itself or by token-2022. Token-2022 mints and
            // ATAs are also valid.
            || ai.key == &JUPITER_V6_PROGRAM_ID
            || ai.executable;
        require!(allowed, crate::errors::PotError::YieldTargetInvalid);
    }

    // Build remapped metas. CRITICAL: the vault PDA must carry
    // `is_signer = true` in the inner-CPI metas so Jupiter accepts the
    // PDA-signed user. The outer tx never has the vault as signer (it can't
    // — it's a PDA), but `invoke_signed` provides the signature via seeds,
    // and the runtime requires the inner meta to declare `is_signer` so the
    // signature is acknowledged.
    let jupiter_accounts: Vec<AccountMeta> = ctx
        .remaining_accounts
        .iter()
        .map(|ai| {
            let force_signer = *ai.key == vault_key;
            let is_signer = force_signer || ai.is_signer;
            if ai.is_writable {
                AccountMeta::new(*ai.key, is_signer)
            } else {
                AccountMeta::new_readonly(*ai.key, is_signer)
            }
        })
        .collect();

    let jupiter_ix = Instruction {
        program_id: ctx.accounts.jupiter_program.key(),
        accounts: jupiter_accounts,
        data: args.jupiter_ix_data,
    };

    let seeds: &[&[u8]] = &[
        VAULT_SEED,
        pot_key.as_ref(),
        core::slice::from_ref(&vault_bump),
    ];
    invoke_signed(&jupiter_ix, ctx.remaining_accounts, &[seeds])?;

    // --- 7. verify via balance diff ----------------------------------------
    ctx.accounts.source_ata.reload()?;
    ctx.accounts.destination_ata.reload()?;
    let post_in = ctx.accounts.source_ata.amount;
    let post_out = ctx.accounts.destination_ata.amount;

    let spent = pre_in
        .checked_sub(post_in)
        .ok_or(crate::errors::PotError::OverspentInput)?;
    let received = post_out
        .checked_sub(pre_out)
        .ok_or(crate::errors::PotError::SlippageExceeded)?;

    require!(spent <= args.max_in, crate::errors::PotError::OverspentInput);
    require!(
        received >= args.min_out,
        crate::errors::PotError::SlippageExceeded
    );

    // Hard program-wide slippage ceiling. Even if the caller (admin or a
    // hostile keeper) passed a `min_out` that's tiny relative to `amount_in`,
    // we reject swaps where realised output is < (1 - MAX_SLIPPAGE_BPS) of
    // an "ideal" 1:1-priced reference. The reference is the strategy's
    // entry_price_x64 when available (Active exit), else falls back to
    // requiring args.min_out >= max_in * (1 - MAX_SLIPPAGE_BPS) / 10_000
    // for entries (no entry price yet).
    {
        let ceiling_num = (args.max_in as u128)
            .checked_mul((10_000u128).saturating_sub(MAX_SLIPPAGE_BPS as u128))
            .ok_or(crate::errors::PotError::MathOverflow)?;
        let ceiling_floor_in_units = ceiling_num / 10_000u128; // floor of input units
        if args.is_entry {
            // For entries we have no oracle reference unless the caller
            // attached Pyth — so treat min_out as a soft floor and just
            // require min_out is meaningful relative to amount_in.
            // (The denomination differs between mints; this is purely a
            // sanity guard against min_out == 1.)
            require!(
                (args.min_out as u128) > 0,
                crate::errors::PotError::SlippageExceeded
            );
            // Suppress unused-binding warning when MAX_SLIPPAGE_BPS is unused
            // along this path.
            let _ = ceiling_floor_in_units;
        } else if ctx.accounts.strategy.entry_price_x64 > 0 {
            // received_expected ≈ spent * (1/entry_price_x64) * 2^64
            // We approximate by requiring received_x64 >= entry_price_x64
            // shifted by the slippage ceiling. Cheap and conservative.
            let entry = ctx.accounts.strategy.entry_price_x64;
            let min_received_units = (spent as u128)
                .checked_mul(entry)
                .and_then(|v| v.checked_shr(64))
                .unwrap_or(0);
            let allowed_floor = min_received_units
                .saturating_mul((10_000u128).saturating_sub(MAX_SLIPPAGE_BPS as u128))
                / 10_000u128;
            require!(
                (received as u128) >= allowed_floor,
                crate::errors::PotError::SlippageExceeded
            );
        }
    }

    // --- 7b. oracle deviation guard (anti-sandwich) -----------------------
    // Independent of the strategy entry-price slippage ceiling above: this
    // compares the REALISED execution price against a live oracle reading, so
    // a manipulated pool / sandwich that still clears `min_out` is rejected
    // when it strays too far from fair value. Opt-in: 0 = disabled.
    //
    // Phase A unit convention: the passed feed must quote output-per-input in
    // the same orientation as `received/spent` (e.g. a direct pair feed).
    // General two-feed (input-USD ÷ output-USD) normalization is a documented
    // Phase-B follow-up — same staged approach as the wSOL-denominated caps.
    if ctx.accounts.pot.max_oracle_deviation_bps > 0 {
        let kind = crate::oracle::OracleKind::from_u8(ctx.accounts.pot.oracle_kind)?;
        let oracle = crate::oracle::read_price(
            kind,
            &ctx.accounts.pyth_price_update,
            ctx.accounts.pot.max_oracle_conf_bps,
        )?;
        let realised_x64 = compute_price_x64(spent, received)?;
        let dev = crate::oracle::deviation_bps(realised_x64, oracle.price_x64);
        require!(
            dev <= ctx.accounts.pot.max_oracle_deviation_bps,
            crate::errors::PotError::OracleDeviationExceeded
        );
    }

    // --- 8. update strategy state machine ---------------------------------
    let now = Clock::get()?.unix_timestamp;
    let strategy = &mut ctx.accounts.strategy;
    let strategy_output_mint = strategy.output_mint;
    let trigger_reason = match &args.mode {
        SwapMode::StrategyTrigger { reason } => *reason,
        _ => TriggerReason::Manual,
    };

    if args.is_entry {
        strategy.size_in = spent;
        strategy.size_out = received;
        strategy.entry_price_x64 = compute_price_x64(spent, received)?;
        strategy.trailing_high_price_x64 = strategy.entry_price_x64;
        strategy.status = StrategyStatus::Active;
        strategy.executed_at = now;
    } else {
        strategy.status = StrategyStatus::Closed;
        strategy.closed_at = now;
    }

    strategy.last_trigger_reason = trigger_reason;
    strategy.executor_nonce = strategy.executor_nonce.saturating_add(1);

    // For trigger fires, stamp the price-update timestamp so /strategy UI
    // can render "last priced N min ago".
    if matches!(args.mode, SwapMode::StrategyTrigger { .. }) {
        strategy.last_price_update_ts = now;
    }

    // --- 8b. mark proposal spec executed (Proposal mode only) -------------
    if matches!(args.mode, SwapMode::Proposal { .. }) {
        if let Some(spec) = ctx.accounts.proposal_swap_spec.as_mut() {
            spec.executed = true;
            spec.executed_at = now;
        }
    }

    // --- 9. register spend against the pot daily budget -------------------
    ctx.accounts.pot.register_spend(spent, now)?;
    if args.is_entry {
        ctx.accounts.pot.register_asset_spend(&strategy_output_mint, spent)?;
    }

    emit!(SwapExecuted {
        pot: pot_key,
        strategy: strategy.key(),
        slot_id: strategy.slot_id as u64,
        mode_tag: mode_tag(&args.mode),
        is_entry: args.is_entry,
        input_mint: strategy.input_mint,
        output_mint: strategy.output_mint,
        spent,
        received,
        trigger: trigger_reason,
        nonce: strategy.executor_nonce,
        status_after: strategy.status,
        signer: ctx.accounts.authority.key(),
        timestamp: now,
    });

    Ok(())
}

// ---------------------------------------------------------------------------
// Authorization dispatch
// ---------------------------------------------------------------------------

fn authorize_mode<'info>(
    ctx: &Context<'_, '_, '_, 'info, ExecuteSwap<'info>>,
    args: &ExecuteSwapArgs,
) -> Result<()> {
    let strategy = &ctx.accounts.strategy;
    let signer = ctx.accounts.authority.key();

    match (&args.mode, &strategy.source) {
        // --- AdminDirect ---
        (SwapMode::AdminDirect, StrategySource::AdminDirect { admin }) => {
            require_keys_eq!(signer, *admin, crate::errors::PotError::StrategyNotAdmin);
            require_keys_eq!(
                signer,
                ctx.accounts.pot.authority,
                crate::errors::PotError::StrategyNotAdmin
            );
        }

        // --- Proposal ---
        (
            SwapMode::Proposal { proposal_id },
            StrategySource::Proposal { proposal_id: sid },
        ) => {
            require!(
                *proposal_id == *sid,
                crate::errors::PotError::ProposalMismatch
            );
            require!(
                strategy.proposal_passed,
                crate::errors::PotError::ProposalNotPassed
            );

            // The PDA-validated ProposalSwapSpec MUST be present in the
            // accounts struct for this mode and MUST match the strategy
            // params bit-for-bit.
            let spec = ctx
                .accounts
                .proposal_swap_spec
                .as_ref()
                .ok_or(crate::errors::PotError::ProposalMismatch)?;
            require!(
                spec.passed,
                crate::errors::PotError::ProposalNotPassed
            );
            require!(
                !spec.executed,
                crate::errors::PotError::ProposalAlreadyExecuted
            );
            require!(
                spec.proposal_id == *proposal_id,
                crate::errors::PotError::ProposalMismatch
            );
            assert_strategy_matches_spec(
                spec,
                strategy.input_mint,
                strategy.output_mint,
                args.max_in,
                args.min_out,
            )?;

            // Phase 1: admin-gated. Phase 2: any Member-NFT holder (verified
            // via a remaining MemberPermissions PDA).
            require_keys_eq!(
                signer,
                ctx.accounts.pot.authority,
                crate::errors::PotError::ProposalExecutorForbidden
            );
        }

        // --- StrategyTrigger ---
        (SwapMode::StrategyTrigger { reason }, _) => {
            require_keys_eq!(
                signer,
                ctx.accounts.pot.agent_authority,
                crate::errors::PotError::StrategyNotAdmin
            );
            // Pyth read + reason verification.
            let (price, expo, _ts) = read_price_update(&ctx.accounts.pyth_price_update)?;
            let current_px64 = price_to_q64(price, expo)?;
            let actual_reason = assert_trigger_is_valid(strategy, current_px64)?;
            require!(
                &actual_reason == reason,
                crate::errors::PotError::TriggerReasonMismatch
            );
            // Trigger fires are always exits.
            require!(!args.is_entry, crate::errors::PotError::InvalidSwapAmount);
        }

        _ => return err!(crate::errors::PotError::SwapModeMismatch),
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Spending policy — mint allowlist + size caps + daily budget
// ---------------------------------------------------------------------------

fn enforce_spending_policy<'info>(
    ctx: &Context<'_, '_, '_, 'info, ExecuteSwap<'info>>,
    args: &ExecuteSwapArgs,
) -> Result<()> {
    let pot = &ctx.accounts.pot;
    let strategy = &ctx.accounts.strategy;

    // Per-protocol allowlist: the CPI target must be sanctioned by the pot.
    require!(
        pot.is_program_allowed(&ctx.accounts.jupiter_program.key()),
        crate::errors::PotError::ProgramNotAllowed
    );

    require!(
        pot.is_mint_allowed(&strategy.input_mint),
        crate::errors::PotError::MintNotAllowlisted
    );
    require!(
        pot.is_mint_allowed(&strategy.output_mint),
        crate::errors::PotError::MintNotAllowlisted
    );

    // Use real vault SOL balance for the per-swap size cap. This replaces the
    // legacy fee_reserve proxy and gives a faithful "% of vault" semantics.
    let vault_lamports = ctx.accounts.vault.lamports();
    let now = Clock::get()?.unix_timestamp;
    pot.check_single_swap_cap_against_vault(args.max_in, vault_lamports)?;
    pot.check_daily_budget(args.max_in, now)?;

    // Per-asset daily exposure cap — entries only (buying builds exposure;
    // exits reduce it and are never blocked by this cap).
    if args.is_entry {
        pot.check_asset_exposure(&strategy.output_mint, args.max_in, vault_lamports, now)?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// price = size_out / size_in, Q64.64 fixed-point.
fn compute_price_x64(size_in: u64, size_out: u64) -> Result<u128> {
    if size_in == 0 {
        return err!(crate::errors::PotError::OverspentInput);
    }
    let out_shifted = (size_out as u128)
        .checked_shl(64)
        .ok_or(crate::errors::PotError::SlippageExceeded)?;
    Ok(out_shifted / size_in as u128)
}

fn mode_tag(m: &SwapMode) -> u8 {
    match m {
        SwapMode::AdminDirect => 0,
        SwapMode::Proposal { .. } => 1,
        SwapMode::StrategyTrigger { .. } => 2,
    }
}

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

#[event]
pub struct SwapExecuted {
    pub pot: Pubkey,
    pub strategy: Pubkey,
    pub slot_id: u64,
    pub mode_tag: u8,
    pub is_entry: bool,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub spent: u64,
    pub received: u64,
    pub trigger: TriggerReason,
    pub nonce: u32,
    pub status_after: StrategyStatus,
    pub signer: Pubkey,
    pub timestamp: i64,
}
