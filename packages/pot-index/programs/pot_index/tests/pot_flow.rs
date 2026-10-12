//! End-to-end LiteSVM tests for `pot_index`:
//! create → deposit (with referral fees) → bounded rebalance → deposit at NAV → exit in kind,
//! plus the paths that must fail (missing close, slippage, oversized trade, pause, auth).

mod common;
use common::*;

#[test]
fn full_flow_create_deposit_rebalance_exit() {
    let mut w = setup();
    let k = create_pot(&mut w, (6000, 4000), 2500);

    // Deposits must wait for finalize.
    let user = w.user.pubkey();
    set_ata(&mut w.svm, &w.usdc, &user, 5_000_000_000); // 5,000 USDC
    set_ata(&mut w.svm, &k.index_mint, &user, 0);
    set_ata(&mut w.svm, &w.sol, &user, 0);
    set_ata(&mut w.svm, &w.jup, &user, 0);
    let creator_usdc = set_ata(&mut w.svm, &w.usdc, &w.creator.pubkey(), 0);
    let protocol_usdc = set_ata(&mut w.svm, &w.usdc, &w.treasury, 0);
    let referrer_usdc = set_ata(&mut w.svm, &w.usdc, &w.referrer, 0);
    let err = { let i = deposit_ix(&w, &k, 1_000_000_000, 0, true); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap_err();
    assert!(err.contains("PotNotFinalized"), "{err}");

    // Only the creator can finalize.
    let a = w.admin.insecure_clone();
    let err = finalize(&mut w, &k, &a).unwrap_err();
    assert!(err.contains("Unauthorized"), "{err}");
    let c = w.creator.insecure_clone();
    finalize(&mut w, &k, &c).unwrap();
    assert!(read_pot(&w.svm, &k.pot).finalized);

    // --- Deposit 1,000 USDC with a referrer.
    { let i = deposit_ix(&w, &k, 1_000_000_000, 996_000_000, true); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();
    let shares = token_amount(&w.svm, &ata(&user, &k.index_mint));
    assert!((996_990_000..=997_000_000).contains(&shares), "shares {shares}");
    assert_eq!(token_amount(&w.svm, &k.cash_vault), 997_000_000); // net of 0.3%
    assert_eq!(token_amount(&w.svm, &referrer_usdc), 1_200_000); // 40% of 3 USDC
    assert_eq!(token_amount(&w.svm, &creator_usdc), 1_200_000);
    assert_eq!(token_amount(&w.svm, &protocol_usdc), 600_000);

    // --- Rebalance: deploy 200 USDC of cash into SOL at $150.
    let keeper = w.keeper.pubkey();
    set_ata(&mut w.svm, &w.usdc, &keeper, 0);
    let keeper_sol = set_ata(&mut w.svm, &w.sol, &keeper, 10_000_000_000); // keeper has 10 SOL to deliver

    // Missing close in the transaction → refused, nothing moves.
    let err = { let i = open_ix(&w, &k, u8::MAX, 0, 200_000_000); send(&mut w.svm, &[i], &w.keeper, &[]) }.unwrap_err();
    assert!(err.contains("MissingClose"), "{err}");
    assert_eq!(token_amount(&w.svm, &k.cash_vault), 997_000_000);

    // Trade larger than 25% of NAV → refused.
    let err = { let v = vec![open_ix(&w, &k, u8::MAX, 0, 300_000_000), close_ix(&w, &k, 0)]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap_err();
    assert!(err.contains("TradeTooLarge"), "{err}");

    // Keeper delivers too little SOL (needs ≥ 1.32 SOL for 200 USDC at 1% slippage) → whole tx reverts.
    let err = { let v = vec![
            open_ix(&w, &k, u8::MAX, 0, 200_000_000),
            spl_transfer(&keeper_sol, &k.sol_vault, &keeper, 1_000_000_000),
            close_ix(&w, &k, 0),
        ]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap_err();
    assert!(err.contains("RebalanceSlippage"), "{err}");
    assert_eq!(token_amount(&w.svm, &k.cash_vault), 997_000_000);
    assert_eq!(token_amount(&w.svm, &k.sol_vault), 0);
    assert!(!read_pot(&w.svm, &k.pot).rebalance.open);

    // Honest keeper: 1.34 SOL for 200 USDC.
    { let v = vec![
            open_ix(&w, &k, u8::MAX, 0, 200_000_000),
            spl_transfer(&keeper_sol, &k.sol_vault, &keeper, 1_340_000_000),
            close_ix(&w, &k, 0),
        ]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap();
    assert_eq!(token_amount(&w.svm, &k.cash_vault), 797_000_000);
    assert_eq!(token_amount(&w.svm, &k.sol_vault), 1_340_000_000);
    assert!(!read_pot(&w.svm, &k.pot).rebalance.open);

    // Deploying cash has no cooldown (one deposit can be allocated leg after leg); this second
    // deployment in the same slot fails only because the keeper delivers nothing.
    let err = { let v = vec![open_ix(&w, &k, u8::MAX, 0, 240_000_000), close_ix(&w, &k, 0)]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap_err();
    assert!(err.contains("RebalanceSlippage"), "{err}");
    advance_slots(&mut w, 200);

    // A second trade inside all bounds (201 + 240 < 599 target, 240 < 25% of NAV) fails only
    // because this keeper delivers nothing: the Pot is never left short.
    let err = { let v = vec![open_ix(&w, &k, u8::MAX, 0, 240_000_000), close_ix(&w, &k, 0)]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap_err();
    assert!(err.contains("RebalanceSlippage"), "{err}");

    // Selling SOL (leg 0) into JUP (leg 1): SOL is underweight (201 < 599), so it cannot be sold.
    advance_slots(&mut w, 200);
    set_ata(&mut w.svm, &w.jup, &keeper, 0);
    let err = { let v = vec![open_ix(&w, &k, 0, 1, 100_000_000), close_ix(&w, &k, 1)]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap_err();
    assert!(err.contains("NotOverweight"), "{err}");

    // --- Second deposit, no referrer: priced at NAV (≈ 998 USD for ≈ 997 shares → ~1.001 USD/share).
    let before = token_amount(&w.svm, &ata(&user, &k.index_mint));
    { let i = deposit_ix(&w, &k, 1_000_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();
    let minted = token_amount(&w.svm, &ata(&user, &k.index_mint)) - before;
    assert!((990_000_000..=997_000_000).contains(&minted), "minted {minted}");
    assert_eq!(token_amount(&w.svm, &creator_usdc), 1_200_000 + 2_400_000); // creator gets 80% without referrer

    // --- Exit half: in kind, 0.5% stays in the Pot.
    let supply_before = before + minted;
    let half = supply_before / 2;
    let cash_before = token_amount(&w.svm, &k.cash_vault);
    let sol_before = token_amount(&w.svm, &k.sol_vault);
    { let i = exit_ix(&w, &k, half); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();
    let user_sol = token_amount(&w.svm, &ata(&user, &w.sol));
    let expected_sol = (sol_before as u128 * half as u128 / supply_before as u128) * 9950 / 10000;
    assert_eq!(user_sol as u128, expected_sol);
    let cash_after = token_amount(&w.svm, &k.cash_vault);
    assert!(cash_after > cash_before / 2, "exit fee stayed in the pot");
    assert_eq!(
        token_amount(&w.svm, &ata(&user, &k.index_mint)),
        supply_before - half
    );

    // --- Pause: deposits stop, exits keep working.
    { let v = vec![ix(
            pot_index::instruction::SetPotParams {
                update: pot_index::instructions::pot::PotUpdate { paused: Some(true), deposit_cap_usd: None },
            },
            pot_index::accounts::CreatorOnly { creator: w.creator.pubkey(), pot: k.pot },
            vec![],
        )]; send(&mut w.svm, &v, &w.creator, &[]) }.unwrap();
    let err = { let i = deposit_ix(&w, &k, 10_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap_err();
    assert!(err.contains("PotPaused"), "{err}");
    { let i = exit_ix(&w, &k, 1_000_000); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();
}

#[test]
fn rebalance_cannot_overshoot_target() {
    let mut w = setup();
    // SOL target is only 20%: 1,000 USDC deposit → SOL target ≈ 199 USD.
    let k = create_pot(&mut w, (2000, 8000), 2500);
    let c = w.creator.insecure_clone();
    finalize(&mut w, &k, &c).unwrap();
    let user = w.user.pubkey();
    set_ata(&mut w.svm, &w.usdc, &user, 1_000_000_000);
    set_ata(&mut w.svm, &k.index_mint, &user, 0);
    set_ata(&mut w.svm, &w.usdc, &w.creator.pubkey(), 0);
    set_ata(&mut w.svm, &w.usdc, &w.treasury, 0);
    { let i = deposit_ix(&w, &k, 1_000_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();
    let keeper = w.keeper.pubkey();
    set_ata(&mut w.svm, &w.usdc, &keeper, 0);
    let keeper_sol = set_ata(&mut w.svm, &w.sol, &keeper, 10_000_000_000);

    // 240 USDC into SOL would overshoot the 199 USD target even though it is under the 25% trade cap.
    let err = { let v = vec![
        open_ix(&w, &k, u8::MAX, 0, 240_000_000),
        spl_transfer(&keeper_sol, &k.sol_vault, &keeper, 1_700_000_000),
        close_ix(&w, &k, 0),
    ]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap_err();
    assert!(err.contains("OvershootIn"), "{err}");
    advance_slots(&mut w, 200);

    // 150 USDC is fine.
    { let v = vec![
        open_ix(&w, &k, u8::MAX, 0, 150_000_000),
        spl_transfer(&keeper_sol, &k.sol_vault, &keeper, 1_000_000_000),
        close_ix(&w, &k, 0),
    ]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap();
    assert_eq!(token_amount(&w.svm, &k.sol_vault), 1_000_000_000);
}

#[test]
fn stale_price_blocks_deposit_but_not_exit() {
    let mut w = setup();
    let k = create_pot(&mut w, (5000, 5000), 1000);
    let c = w.creator.insecure_clone();
    finalize(&mut w, &k, &c).unwrap();
    let user = w.user.pubkey();
    set_ata(&mut w.svm, &w.usdc, &user, 1_000_000_000);
    set_ata(&mut w.svm, &k.index_mint, &user, 0);
    set_ata(&mut w.svm, &w.sol, &user, 0);
    set_ata(&mut w.svm, &w.jup, &user, 0);
    set_ata(&mut w.svm, &w.usdc, &w.creator.pubkey(), 0);
    set_ata(&mut w.svm, &w.usdc, &w.treasury, 0);
    { let i = deposit_ix(&w, &k, 100_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();

    // Make SOL price 2 hours old.
    w.sol_price = set_price(&mut w.svm, SOL_FEED, SOL_PRICE, 10_000_000, NOW - 7200);
    let err = { let i = deposit_ix(&w, &k, 100_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap_err();
    assert!(err.contains("StalePrice"), "{err}");
    // Exit needs no oracle.
    { let i = exit_ix(&w, &k, 50_000_000); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();

    // Wrong feed account (JUP feed where SOL expected) → rejected.
    w.sol_price = w.jup_price;
    let err = { let i = deposit_ix(&w, &k, 100_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap_err();
    assert!(err.contains("StalePrice"), "{err}");
}

#[test]
fn weights_must_sum_and_config_is_admin_only() {
    let mut w = setup();
    let k = create_pot(&mut w, (6000, 3000), 1000);
    let c = w.creator.insecure_clone();
    let err = finalize(&mut w, &k, &c).unwrap_err();
    assert!(err.contains("WeightsDoNotSum"), "{err}");

    let err = { let v = vec![ix(
            pot_index::instruction::SetConfig {
                update: pot_index::instructions::admin::ConfigUpdate {
                    paused: Some(true),
                    max_price_age_secs: None,
                    treasury: None,
                    new_admin: None,
                },
            },
            pot_index::accounts::AdminOnly { admin: w.creator.pubkey(), config: w.config },
            vec![],
        )]; send(&mut w.svm, &v, &w.creator, &[]) }.unwrap_err();
    assert!(err.contains("Unauthorized"), "{err}");

    let cfg = w.svm.get_account(&w.config).unwrap();
    let cfg = Config::try_deserialize(&mut &cfg.data[..]).unwrap();
    assert_eq!(cfg.admin, w.admin.pubkey());
    assert_eq!(cfg.pot_count, 1);

    // Price age outside 1..=limit is refused; two-step admin transfer works.
    for bad_age in [0, 61] {
        let i = ix(
            pot_index::instruction::SetConfig {
                update: pot_index::instructions::admin::ConfigUpdate {
                    paused: None, max_price_age_secs: Some(bad_age), treasury: None, new_admin: None,
                },
            },
            pot_index::accounts::AdminOnly { admin: w.admin.pubkey(), config: w.config },
            vec![],
        );
        let err = send(&mut w.svm, &[i], &w.admin, &[]).unwrap_err();
        assert!(err.contains("PriceAgeOutOfRange"), "{bad_age}: {err}");
    }

    // Nothing pending: nobody can accept.
    let early = ix(pot_index::instruction::AcceptAdmin {}, pot_index::accounts::AcceptAdmin { new_admin: w.creator.pubkey(), config: w.config }, vec![]);
    let err = send(&mut w.svm, &[early], &w.creator, &[]).unwrap_err();
    assert!(err.contains("NotPendingAdmin"), "{err}");

    let propose = ix(
        pot_index::instruction::SetConfig {
            update: pot_index::instructions::admin::ConfigUpdate {
                paused: None, max_price_age_secs: None, treasury: None, new_admin: Some(w.creator.pubkey()),
            },
        },
        pot_index::accounts::AdminOnly { admin: w.admin.pubkey(), config: w.config },
        vec![],
    );
    send(&mut w.svm, &[propose], &w.admin, &[]).unwrap();
    let cfg = Config::try_deserialize(&mut &w.svm.get_account(&w.config).unwrap().data[..]).unwrap();
    assert_eq!(cfg.admin, w.admin.pubkey(), "admin unchanged until accepted");
    let wrong = ix(pot_index::instruction::AcceptAdmin {}, pot_index::accounts::AcceptAdmin { new_admin: w.user.pubkey(), config: w.config }, vec![]);
    let err = send(&mut w.svm, &[wrong], &w.user, &[]).unwrap_err();
    assert!(err.contains("NotPendingAdmin"), "{err}");
    let accept = ix(pot_index::instruction::AcceptAdmin {}, pot_index::accounts::AcceptAdmin { new_admin: w.creator.pubkey(), config: w.config }, vec![]);
    w.svm.expire_blockhash(); // same bytes as the refused `early` accept otherwise
    send(&mut w.svm, &[accept], &w.creator, &[]).unwrap();
    let cfg = Config::try_deserialize(&mut &w.svm.get_account(&w.config).unwrap().data[..]).unwrap();
    assert_eq!(cfg.admin, w.creator.pubkey());
    assert_eq!(cfg.pending_admin, Pubkey::default(), "pending entry cleared on accept");
}


/// Deposit → deploy cash into SOL → exit half straight to USDC through a market maker in the
/// same transaction. Checks the minimum, the 0.10% conversion fee, and that every failure path
/// leaves the holder with their tokens.
#[test]
fn exit_to_usdc_flow() {
    let mut w = setup();
    let k = create_pot(&mut w, (6000, 4000), 2500);
    let c = w.creator.insecure_clone();
    finalize(&mut w, &k, &c).unwrap();
    let user = w.user.pubkey();
    let keeper = w.keeper.pubkey();
    set_ata(&mut w.svm, &w.usdc, &user, 1_000_000_000);
    set_ata(&mut w.svm, &k.index_mint, &user, 0);
    set_ata(&mut w.svm, &w.sol, &user, 0);
    set_ata(&mut w.svm, &w.jup, &user, 0);
    set_ata(&mut w.svm, &w.usdc, &w.creator.pubkey(), 0);
    let protocol_usdc = set_ata(&mut w.svm, &w.usdc, &w.treasury, 0);
    { let i = deposit_ix(&w, &k, 1_000_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();

    // Keeper deploys 200 USDC of cash into 1.34 SOL.
    let keeper_usdc = set_ata(&mut w.svm, &w.usdc, &keeper, 1_000_000_000);
    let keeper_sol = set_ata(&mut w.svm, &w.sol, &keeper, 10_000_000_000);
    { let v = vec![
            open_ix(&w, &k, u8::MAX, 0, 200_000_000),
            spl_transfer(&keeper_sol, &k.sol_vault, &keeper, 1_340_000_000),
            close_ix(&w, &k, 0),
        ]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap();
    advance_slots(&mut w, 5);

    let supply = token_amount(&w.svm, &ata(&user, &k.index_mint));
    let half = supply / 2;
    let cash_before = token_amount(&w.svm, &k.cash_vault);
    let sol_before = token_amount(&w.svm, &k.sol_vault);
    let user_usdc = ata(&user, &w.usdc);
    let user_sol = ata(&user, &w.sol);
    let usdc_start = token_amount(&w.svm, &user_usdc);

    let cash_out = exit_share(cash_before, half, supply);
    let sol_out = exit_share(sol_before, half, supply);
    // Value of the SOL at price − conf ($149.90, expo −8), then the Pot's 1% slippage band, then 0.10% fee.
    let legs_value = (sol_out as u128) * ((SOL_PRICE - 10_000_000) as u128) / 10u128.pow(11); // 9 dec, expo -8 → micro-USD
    let min_from_sale = legs_value * 9900 / 10000;
    let conv_fee = min_from_sale * 10 / 10000;
    assert!(conv_fee > 0);

    // (a) No close in the transaction → refused, nothing burned.
    let err = { let i = exit_usdc_open_ix(&w, &k, half, 0); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap_err();
    assert!(err.contains("MissingClose"), "{err}");
    assert_eq!(token_amount(&w.svm, &ata(&user, &k.index_mint)), supply);

    // (b) Close bound to a different USDC account → refused.
    let other_usdc = set_ata(&mut w.svm, &w.usdc, &w.admin.pubkey(), 0);
    let err = { let v = vec![exit_usdc_open_ix(&w, &k, half, 0), exit_usdc_close_ix(&w, &k, other_usdc)]; send(&mut w.svm, &v, &w.user, &[]) }.unwrap_err();
    assert!(err.contains("MissingClose"), "{err}");

    // (c) Market maker pays too little for the SOL → whole transaction reverts, holder keeps tokens.
    let err = { let v = vec![
            exit_usdc_open_ix(&w, &k, half, 0),
            spl_transfer(&user_sol, &keeper_sol, &user, sol_out),
            spl_transfer(&keeper_usdc, &user_usdc, &keeper, (min_from_sale as u64) - 1),
            exit_usdc_close_ix(&w, &k, user_usdc),
        ]; send(&mut w.svm, &v, &w.user, &[&w.keeper.insecure_clone()]) }.unwrap_err();
    assert!(err.contains("RebalanceSlippage"), "{err}");
    assert_eq!(token_amount(&w.svm, &ata(&user, &k.index_mint)), supply);
    assert_eq!(token_amount(&w.svm, &k.sol_vault), sol_before);
    assert_eq!(token_amount(&w.svm, &user_usdc), usdc_start);
    assert!(!read_pot(&w.svm, &k.pot).rebalance.open);

    // (d) Honest fill: 100 USDC for the SOL.
    let paid: u64 = 100_000_000;
    assert!(paid as u128 >= min_from_sale);
    { let v = vec![
            exit_usdc_open_ix(&w, &k, half, 0),
            spl_transfer(&user_sol, &keeper_sol, &user, sol_out),
            spl_transfer(&keeper_usdc, &user_usdc, &keeper, paid),
            exit_usdc_close_ix(&w, &k, user_usdc),
        ]; send(&mut w.svm, &v, &w.user, &[&w.keeper.insecure_clone()]) }.unwrap();
    assert_eq!(token_amount(&w.svm, &ata(&user, &k.index_mint)), supply - half);
    assert_eq!(token_amount(&w.svm, &user_sol), 0, "SOL was sold, not kept");
    assert_eq!(token_amount(&w.svm, &protocol_usdc), 600_000 + conv_fee as u64, "conversion fee reached the treasury");
    assert_eq!(token_amount(&w.svm, &user_usdc), usdc_start + cash_out + paid - conv_fee as u64);
    assert_eq!(token_amount(&w.svm, &k.sol_vault), sol_before - sol_out);
    assert!(!read_pot(&w.svm, &k.pot).rebalance.open);

    // (e) The holder's own min_usdc_out is enforced at close: a floor above what the sale gives
    // reverts the whole transaction, tokens stay with the holder.
    let before = token_amount(&w.svm, &ata(&user, &k.index_mint));
    let err = { let v = vec![exit_usdc_open_ix(&w, &k, 1_000_000, u64::MAX / 2), exit_usdc_close_ix(&w, &k, user_usdc)]; send(&mut w.svm, &v, &w.user, &[]) }.unwrap_err();
    assert!(err.contains("RebalanceSlippage"), "{err}");
    assert_eq!(token_amount(&w.svm, &ata(&user, &k.index_mint)), before);

    // (f) A second close in the same transaction, or a rebalance_close against an exit window, is refused.
    let supply_now = token_amount(&w.svm, &ata(&user, &k.index_mint));
    let sol_out1 = exit_share(token_amount(&w.svm, &k.sol_vault), 1_000_000, supply_now);
    let err = { let v = vec![
            exit_usdc_open_ix(&w, &k, 1_000_000, 0),
            spl_transfer(&user_sol, &keeper_sol, &user, sol_out1),
            spl_transfer(&keeper_usdc, &user_usdc, &keeper, 1_000_000),
            exit_usdc_close_ix(&w, &k, user_usdc),
            exit_usdc_close_ix(&w, &k, user_usdc),
        ]; send(&mut w.svm, &v, &w.user, &[&w.keeper.insecure_clone()]) }.unwrap_err();
    assert!(err.contains("RebalanceNotOpen"), "{err}");
    let err = { let v = vec![exit_usdc_open_ix(&w, &k, 1_000_000, 0), close_ix(&w, &k, 0)]; send(&mut w.svm, &v, &w.user, &[&w.keeper.insecure_clone()]) }.unwrap_err();
    assert!(err.contains("MissingClose"), "{err}");

    // In-kind exit still works right after.
    { let i = exit_ix(&w, &k, 1_000_000); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();
}

/// A fresh deposit can be deployed into every leg in consecutive transactions (no cooldown for
/// cash), while asset→asset rotations keep the cooldown.
#[test]
fn cash_deploys_without_cooldown_rotations_keep_it() {
    let mut w = setup();
    let k = create_pot(&mut w, (6000, 4000), 2500);
    let c = w.creator.insecure_clone();
    finalize(&mut w, &k, &c).unwrap();
    let user = w.user.pubkey();
    let keeper = w.keeper.pubkey();
    set_ata(&mut w.svm, &w.usdc, &user, 1_000_000_000);
    set_ata(&mut w.svm, &k.index_mint, &user, 0);
    set_ata(&mut w.svm, &w.usdc, &w.creator.pubkey(), 0);
    set_ata(&mut w.svm, &w.usdc, &w.treasury, 0);
    { let i = deposit_ix(&w, &k, 1_000_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();
    set_ata(&mut w.svm, &w.usdc, &keeper, 0);
    let keeper_sol = set_ata(&mut w.svm, &w.sol, &keeper, 10_000_000_000);
    let keeper_jup = set_ata(&mut w.svm, &w.jup, &keeper, 10_000_000_000);

    // Cash → SOL, then cash → JUP one slot later: both pass.
    { let v = vec![open_ix(&w, &k, u8::MAX, 0, 200_000_000), spl_transfer(&keeper_sol, &k.sol_vault, &keeper, 1_340_000_000), close_ix(&w, &k, 0)]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap();
    advance_slots(&mut w, 1);
    { let v = vec![open_ix(&w, &k, u8::MAX, 1, 200_000_000), spl_transfer(&keeper_jup, &k.jup_vault, &keeper, 201_000_000), close_ix(&w, &k, 1)]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap();
    assert_eq!(token_amount(&w.svm, &k.cash_vault), 597_000_000);

    // Cash deploys do not start the rotation cooldown: a rotation one slot later gets past the
    // cooldown check and fails on the bounds instead (SOL is not overweight).
    advance_slots(&mut w, 1);
    let err = { let v = vec![open_ix(&w, &k, 0, 1, 100_000_000), spl_transfer(&keeper_jup, &k.jup_vault, &keeper, 31_000_000), close_ix(&w, &k, 1)]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap_err();
    assert!(err.contains("NotOverweight"), "{err}");
    assert_eq!(read_pot(&w.svm, &k.pot).last_rebalance_slot, 0, "cash deploys leave the rotation cooldown untouched");
}

/// Referral fee paths: exact split, self-referral rejected, referrer == creator stacks, referrer ==
/// treasury allowed, wrong-mint referrer account rejected.
#[test]
fn referral_paths_are_exact_and_safe() {
    let mut w = setup();
    let k = create_pot(&mut w, (6000, 4000), 2500);
    let c = w.creator.insecure_clone();
    finalize(&mut w, &k, &c).unwrap();
    let user = w.user.pubkey();
    set_ata(&mut w.svm, &w.usdc, &user, 10_000_000_000);
    set_ata(&mut w.svm, &k.index_mint, &user, 0);
    let creator_usdc = set_ata(&mut w.svm, &w.usdc, &w.creator.pubkey(), 0);
    let protocol_usdc = set_ata(&mut w.svm, &w.usdc, &w.treasury, 0);
    let referrer_usdc = set_ata(&mut w.svm, &w.usdc, &w.referrer, 0);

    let dep = |w: &mut World, amount: u64, referrer_usdc: Option<Pubkey>| -> Result<Vec<String>, String> {
        let i = ix(
            pot_index::instruction::Deposit { amount, min_shares_out: 0 },
            pot_index::accounts::Deposit {
                user,
                config: w.config,
                pot: k.pot,
                index_mint: k.index_mint,
                user_index_ata: ata(&user, &k.index_mint),
                usdc_mint: w.usdc,
                user_usdc: ata(&user, &w.usdc),
                cash_vault: k.cash_vault,
                creator_usdc: ata(&w.creator.pubkey(), &w.usdc),
                protocol_usdc: ata(&w.treasury, &w.usdc),
                referrer_usdc,
                token_program: TOKEN,
            },
            price_remaining(w, &k),
        );
        send(&mut w.svm, &[i], &w.user, &[])
    };

    // 1. With referrer: 0.12% / 0.12% / 0.06% of 10,000 USDC.
    dep(&mut w, 10_000_000_000, Some(referrer_usdc)).unwrap();
    assert_eq!(token_amount(&w.svm, &referrer_usdc), 12_000_000);
    assert_eq!(token_amount(&w.svm, &creator_usdc), 12_000_000);
    assert_eq!(token_amount(&w.svm, &protocol_usdc), 6_000_000);
    assert_eq!(token_amount(&w.svm, &k.cash_vault), 9_970_000_000);

    // 2. Self-referral (own USDC account) → rejected.
    let usdc = w.usdc;
    set_ata(&mut w.svm, &usdc, &user, 10_000_000_000);
    let err = dep(&mut w, 1_000_000_000, Some(ata(&user, &usdc))).unwrap_err();
    assert!(err.contains("SelfReferral"), "{err}");

    // 3. Referrer == creator: creator receives both shares (0.24%).
    dep(&mut w, 1_000_000_000, Some(creator_usdc)).unwrap();
    assert_eq!(token_amount(&w.svm, &creator_usdc), 12_000_000 + 2_400_000);

    // 4. No referrer: creator receives 0.24% too; protocol share unchanged at 0.06%.
    dep(&mut w, 1_000_000_000, None).unwrap();
    assert_eq!(token_amount(&w.svm, &creator_usdc), 12_000_000 + 2_400_000 + 2_400_000);
    assert_eq!(token_amount(&w.svm, &protocol_usdc), 6_000_000 + 600_000 + 600_000);

    // 5. A referrer account of the wrong mint → rejected by the account constraint.
    let (jup, referrer) = (w.jup, w.referrer);
    let bad = set_ata(&mut w.svm, &jup, &referrer, 0);
    let err = dep(&mut w, 1_000_000_000, Some(bad)).unwrap_err();
    assert!(err.contains("ConstraintTokenMint") || err.contains("2014"), "{err}");
}

// ---------------------------------------------------------------------------
// Review findings, Oct 11 2026 (independent audit): each one pinned by a test.
// ---------------------------------------------------------------------------

/// F1: Pyth is a pull oracle. An old-but-favourable tick posted *now* (fresh posted_slot, old
/// publish_time) must be refused once it is older than max_price_age_secs, even though the
/// posted_slot check passes.
#[test]
fn tick_shopping_is_bounded_by_price_age() {
    let mut w = setup();
    let k = create_pot(&mut w, (5000, 5000), 1000);
    let c = w.creator.insecure_clone();
    finalize(&mut w, &k, &c).unwrap();
    let user = w.user.pubkey();
    set_ata(&mut w.svm, &w.usdc, &user, 1_000_000_000);
    set_ata(&mut w.svm, &k.index_mint, &user, 0);
    set_ata(&mut w.svm, &w.usdc, &w.creator.pubkey(), 0);
    set_ata(&mut w.svm, &w.usdc, &w.treasury, 0);

    // A SOL price 10% lower than now, published 45 s ago, posted in the current slot.
    write_price(&mut w.svm, w.sol_price, SOL_FEED, SOL_PRICE * 9 / 10, 10_000_000, NOW - 45);
    let err = { let i = deposit_ix(&w, &k, 100_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap_err();
    assert!(err.contains("StalePrice"), "{err}");

    // Inside the window it is accepted (the window is the only shopping room there is: 30 s).
    write_price(&mut w.svm, w.sol_price, SOL_FEED, SOL_PRICE, 10_000_000, NOW - 20);
    { let i = deposit_ix(&w, &k, 101_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();

    // And no admin can widen the window past the compiled cap.
    let widen = ix(
        pot_index::instruction::SetConfig {
            update: pot_index::instructions::admin::ConfigUpdate {
                paused: None, max_price_age_secs: Some(300), treasury: None, new_admin: None,
            },
        },
        pot_index::accounts::AdminOnly { admin: w.admin.pubkey(), config: w.config },
        vec![],
    );
    let err = send(&mut w.svm, &[widen], &w.admin, &[]).unwrap_err();
    assert!(err.contains("PriceAgeOutOfRange"), "{err}");
}

/// F5: the cash currency cannot be registered as an asset.
#[test]
fn usdc_cannot_be_a_leg() {
    let mut w = setup();
    let usdc = w.usdc;
    let i = ix(
        pot_index::instruction::RegisterAsset { feed_id: SOL_FEED },
        pot_index::accounts::RegisterAsset {
            admin: w.admin.pubkey(),
            config: w.config,
            mint: usdc,
            price_update: w.sol_price,
            asset: pda(&[ASSET_SEED, usdc.as_ref()]),
            system_program: SYSTEM,
        },
        vec![],
    );
    let err = send(&mut w.svm, &[i], &w.admin, &[]).unwrap_err();
    assert!(err.contains("InvalidLeg"), "{err}");
}

/// F7: a holder whose cash was never deployed has empty legs; exit must succeed even when the
/// leg ATAs do not exist, paying the USDC share only.
#[test]
fn exit_pays_cash_without_leg_atas() {
    let mut w = setup();
    let k = create_pot(&mut w, (5000, 5000), 1000);
    let c = w.creator.insecure_clone();
    finalize(&mut w, &k, &c).unwrap();
    let user = w.user.pubkey();
    set_ata(&mut w.svm, &w.usdc, &user, 1_000_000_000);
    set_ata(&mut w.svm, &k.index_mint, &user, 0);
    set_ata(&mut w.svm, &w.usdc, &w.creator.pubkey(), 0);
    set_ata(&mut w.svm, &w.usdc, &w.treasury, 0);
    // No SOL / JUP ATAs for the user on purpose.
    { let i = deposit_ix(&w, &k, 100_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();
    let shares = token_amount(&w.svm, &ata(&user, &k.index_mint));
    let usdc_before = token_amount(&w.svm, &ata(&user, &w.usdc));
    { let i = exit_ix(&w, &k, shares); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();
    let usdc_after = token_amount(&w.svm, &ata(&user, &w.usdc));
    // 100 deposited, 0.30% entry fee. The only holder burns the whole supply, so no exit fee is
    // kept: there is nobody left for it to accrue to.
    assert_eq!(usdc_after - usdc_before, 99_700_000);
    assert_eq!(token_amount(&w.svm, &ata(&user, &k.index_mint)), 0);
    assert_eq!(token_amount(&w.svm, &k.cash_vault), 0, "nothing stranded in the Pot");
}

/// F10: account substitution. A vault of the right mint but not the Pot's is refused on deposit;
/// a user ATA owned by someone else is refused on exit.
#[test]
fn substituted_accounts_are_refused() {
    let mut w = setup();
    let k = create_pot(&mut w, (5000, 5000), 1000);
    let c = w.creator.insecure_clone();
    finalize(&mut w, &k, &c).unwrap();
    let user = w.user.pubkey();
    set_ata(&mut w.svm, &w.usdc, &user, 1_000_000_000);
    set_ata(&mut w.svm, &k.index_mint, &user, 0);
    set_ata(&mut w.svm, &w.sol, &user, 0);
    set_ata(&mut w.svm, &w.jup, &user, 0);
    set_ata(&mut w.svm, &w.usdc, &w.creator.pubkey(), 0);
    set_ata(&mut w.svm, &w.usdc, &w.treasury, 0);

    // Deposit with a foreign SOL vault (same mint, owned by the keeper) in remaining accounts.
    let foreign = set_ata(&mut w.svm, &w.sol, &w.keeper.pubkey(), 1_000_000_000);
    let mut d = deposit_ix(&w, &k, 100_000_000, 0, false);
    let n = d.accounts.len();
    d.accounts[n - 4] = AccountMeta::new_readonly(foreign, false);
    let err = send(&mut w.svm, &[d], &w.user, &[]).unwrap_err();
    assert!(err.contains("VaultMismatch"), "{err}");

    // Honest deposit, then exit with a SOL ATA that belongs to the keeper.
    { let i = deposit_ix(&w, &k, 100_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();
    // Give the Pot some SOL so the SOL leg pays out and the ATA is actually checked.
    let sol_in = set_ata(&mut w.svm, &w.sol, &k.pot, 0);
    assert_eq!(sol_in, k.sol_vault);
    set_ata(&mut w.svm, &w.sol, &k.pot, 1_000_000_000);
    let shares = token_amount(&w.svm, &ata(&user, &k.index_mint));
    let mut e = exit_ix(&w, &k, shares);
    let n = e.accounts.len();
    e.accounts[n - 5] = AccountMeta::new(foreign, false);
    let err = send(&mut w.svm, &[e], &w.user, &[]).unwrap_err();
    assert!(err.contains("TokenOwnerMismatch"), "{err}");
}

/// F10: privileged instructions refuse the wrong signer.
#[test]
fn creator_and_admin_instructions_are_gated() {
    let mut w = setup();
    let k = create_pot(&mut w, (5000, 5000), 1000);
    // finalize by the user, not the creator
    let u = w.user.insecure_clone();
    let err = finalize(&mut w, &k, &u).unwrap_err();
    assert!(err.contains("Unauthorized") || err.contains("ConstraintHasOne"), "{err}");
    // register_asset by the creator, not the admin
    let other = set_mint(&mut w.svm, 9);
    let i = ix(
        pot_index::instruction::RegisterAsset { feed_id: SOL_FEED },
        pot_index::accounts::RegisterAsset {
            admin: w.creator.pubkey(),
            config: w.config,
            mint: other,
            price_update: w.sol_price,
            asset: pda(&[ASSET_SEED, other.as_ref()]),
            system_program: SYSTEM,
        },
        vec![],
    );
    let err = send(&mut w.svm, &[i], &w.creator, &[]).unwrap_err();
    assert!(err.contains("Unauthorized") || err.contains("ConstraintHasOne"), "{err}");
}

/// F4: only the upgrade authority can initialize, and only with the USDC mint compiled into the
/// build, so a first caller can neither take the admin role nor bind a look-alike mint.
#[test]
fn init_config_requires_upgrade_authority_and_pinned_usdc() {
    let mut svm = boot();
    let deployer = Keypair::new();
    let stranger = Keypair::new();
    for k in [&deployer, &stranger] {
        svm.airdrop(&k.pubkey(), 10_000_000_000).unwrap();
    }
    let usdc = set_mint_at(&mut svm, USDC_MINT, 6);
    let fake = set_mint(&mut svm, 6);
    let program_data = set_upgrade_authority(&mut svm, &deployer.pubkey());

    let i = init_config_ix(&stranger.pubkey(), stranger.pubkey(), usdc, program_data);
    let err = send(&mut svm, &[i], &stranger, &[]).unwrap_err();
    assert!(err.contains("NotUpgradeAuthority"), "{err}");

    let i = init_config_ix(&deployer.pubkey(), deployer.pubkey(), fake, program_data);
    let err = send(&mut svm, &[i], &deployer, &[]).unwrap_err();
    assert!(err.contains("BadUsdcMint"), "{err}");

    let i = init_config_ix(&deployer.pubkey(), deployer.pubkey(), usdc, program_data);
    send(&mut svm, &[i], &deployer, &[]).unwrap();
}

/// `register_asset` needs a live price for the feed it binds: a price account for another feed,
/// or a stale one, is refused before the asset exists.
#[test]
fn register_asset_requires_a_live_feed() {
    let mut w = setup();
    let other = set_mint(&mut w.svm, 9);
    let register = |w: &World, price_update: Pubkey| {
        ix(
            pot_index::instruction::RegisterAsset { feed_id: SOL_FEED },
            pot_index::accounts::RegisterAsset {
                admin: w.admin.pubkey(),
                config: w.config,
                mint: other,
                price_update,
                asset: pda(&[ASSET_SEED, other.as_ref()]),
                system_program: SYSTEM,
            },
            vec![],
        )
    };
    // Price account for a different feed.
    let i = register(&w, w.jup_price);
    let err = send(&mut w.svm, &[i], &w.admin, &[]).unwrap_err();
    assert!(err.contains("StalePrice"), "{err}");
    // Right feed, published outside the 30 s window.
    write_price(&mut w.svm, w.sol_price, SOL_FEED, SOL_PRICE, 10_000_000, NOW - 45);
    let i = register(&w, w.sol_price);
    let err = send(&mut w.svm, &[i], &w.admin, &[]).unwrap_err();
    assert!(err.contains("StalePrice"), "{err}");
    // Fresh price for the right feed (advance_slots reposts it and expires the blockhash, so this
    // transaction is not a byte-identical replay of the refused one).
    advance_slots(&mut w, 1);
    let i = register(&w, w.sol_price);
    send(&mut w.svm, &[i], &w.admin, &[]).unwrap();
}

/// `set_config` must change something; an admin proposal expires after PENDING_ADMIN_TTL_SLOTS
/// and can be cancelled with the default key.
#[test]
fn set_config_rejects_no_ops_and_admin_proposals_expire() {
    let mut w = setup();
    let creator = w.creator.pubkey();
    let accept = ix(pot_index::instruction::AcceptAdmin {}, pot_index::accounts::AcceptAdmin { new_admin: creator, config: w.config }, vec![]);

    // Empty update, and an update to the value already set, are both refused.
    for u in [config_update(None, None), config_update(Some(false), None)] {
        let err = { let i = set_config_ix(&w, u); send(&mut w.svm, &[i], &w.admin, &[]) }.unwrap_err();
        assert!(err.contains("NothingToUpdate"), "{err}");
    }

    // Propose, then cancel with the default key.
    { let i = set_config_ix(&w, config_update(None, Some(creator))); send(&mut w.svm, &[i], &w.admin, &[]) }.unwrap();
    let cfg = read_config(&w);
    assert_eq!(cfg.pending_admin, creator);
    assert_eq!(cfg.pending_admin_expiry_slot, 100 + PENDING_ADMIN_TTL_SLOTS);
    { let i = set_config_ix(&w, config_update(None, Some(Pubkey::default()))); send(&mut w.svm, &[i], &w.admin, &[]) }.unwrap();
    let cfg = read_config(&w);
    assert_eq!((cfg.pending_admin, cfg.pending_admin_expiry_slot), (Pubkey::default(), 0));
    let err = send(&mut w.svm, std::slice::from_ref(&accept), &w.creator, &[]).unwrap_err();
    assert!(err.contains("NotPendingAdmin"), "{err}");

    // Propose again and let it expire.
    w.svm.expire_blockhash();
    { let i = set_config_ix(&w, config_update(None, Some(creator))); send(&mut w.svm, &[i], &w.admin, &[]) }.unwrap();
    advance_slots(&mut w, PENDING_ADMIN_TTL_SLOTS + 1);
    let err = send(&mut w.svm, std::slice::from_ref(&accept), &w.creator, &[]).unwrap_err();
    assert!(err.contains("PendingAdminExpired"), "{err}");

    // A fresh proposal accepted inside the window transfers the role.
    { let i = set_config_ix(&w, config_update(None, Some(creator))); send(&mut w.svm, &[i], &w.admin, &[]) }.unwrap();
    w.svm.expire_blockhash();
    send(&mut w.svm, &[accept], &w.creator, &[]).unwrap();
    let cfg = read_config(&w);
    assert_eq!((cfg.admin, cfg.pending_admin, cfg.pending_admin_expiry_slot), (creator, Pubkey::default(), 0));
}

/// `migrate_config` grows a v1.1 Config (no `pending_admin_expiry_slot`) in place, keeps every
/// field, is admin-only, and runs once.
#[test]
fn migrate_config_grows_a_v1_1_config() {
    let mut w = setup();
    let current = w.svm.get_account(&w.config).unwrap();
    let before = Config::try_deserialize(&mut &current.data[..]).unwrap();
    let old_len = 8 + Config::INIT_SPACE - 8;
    let mut old = current.clone();
    old.data.truncate(old_len);
    old.lamports = w.svm.minimum_balance_for_rent_exemption(old_len);
    w.svm.set_account(w.config, old).unwrap();

    // Until migrated, instructions that load Config fail.
    let pause = set_config_ix(&w, config_update(Some(true), None));
    let err = send(&mut w.svm, std::slice::from_ref(&pause), &w.admin, &[]).unwrap_err();
    assert!(err.contains("AccountDidNotDeserialize"), "{err}");

    let migrate = |signer: Pubkey| {
        ix(
            pot_index::instruction::MigrateConfig {},
            pot_index::accounts::MigrateConfig { admin: signer, config: w.config, system_program: SYSTEM },
            vec![],
        )
    };
    let err = send(&mut w.svm, &[migrate(w.creator.pubkey())], &w.creator, &[]).unwrap_err();
    assert!(err.contains("Unauthorized"), "{err}");
    send(&mut w.svm, &[migrate(w.admin.pubkey())], &w.admin, &[]).unwrap();

    let acc = w.svm.get_account(&w.config).unwrap();
    assert_eq!(acc.data.len(), 8 + Config::INIT_SPACE);
    assert!(acc.lamports >= w.svm.minimum_balance_for_rent_exemption(acc.data.len()));
    let after = Config::try_deserialize(&mut &acc.data[..]).unwrap();
    assert_eq!(
        (after.admin, after.pending_admin, after.treasury, after.usdc_mint, after.max_price_age_secs, after.paused, after.pot_count, after.bump),
        (before.admin, before.pending_admin, before.treasury, before.usdc_mint, before.max_price_age_secs, before.paused, before.pot_count, before.bump),
    );
    assert_eq!(after.pending_admin_expiry_slot, 0);

    w.svm.expire_blockhash();
    let err = send(&mut w.svm, &[migrate(w.admin.pubkey())], &w.admin, &[]).unwrap_err();
    assert!(err.contains("ConfigAlreadyMigrated"), "{err}");
    send(&mut w.svm, &[pause], &w.admin, &[]).unwrap();
}

/// `update_asset` toggles an asset and repoints its feed (with a live price for the new feed);
/// Pots built earlier keep the feed their legs copied at `add_leg`.
#[test]
fn update_asset_toggles_and_repoints_the_feed() {
    const NEW_FEED: [u8; 32] = [3u8; 32];
    let mut w = setup();
    let k = create_pot(&mut w, (5000, 5000), 1000);
    let asset = pda(&[ASSET_SEED, w.sol.as_ref()]);
    let update = |w: &World, enabled: Option<bool>, feed_id: Option<[u8; 32]>, price_update: Option<Pubkey>| {
        ix(
            pot_index::instruction::UpdateAsset { update: pot_index::instructions::admin::AssetUpdate { enabled, feed_id } },
            pot_index::accounts::UpdateAsset { admin: w.admin.pubkey(), config: w.config, asset, price_update },
            vec![],
        )
    };
    let read_asset = |w: &World| AssetConfig::try_deserialize(&mut &w.svm.get_account(&asset).unwrap().data[..]).unwrap();

    for i in [update(&w, None, None, None), update(&w, Some(true), None, None)] {
        let err = send(&mut w.svm, &[i], &w.admin, &[]).unwrap_err();
        assert!(err.contains("NothingToUpdate"), "{err}");
    }
    let i = update(&w, Some(false), None, None);
    send(&mut w.svm, &[i], &w.admin, &[]).unwrap();
    assert!(!read_asset(&w).enabled);
    w.svm.expire_blockhash(); // same bytes as the refused no-op above otherwise
    let i = update(&w, Some(true), None, None);
    send(&mut w.svm, &[i], &w.admin, &[]).unwrap();
    assert!(read_asset(&w).enabled);

    let new_price = set_price(&mut w.svm, NEW_FEED, SOL_PRICE, 10_000_000, NOW - 5);
    let i = update(&w, None, Some(NEW_FEED), None);
    let err = send(&mut w.svm, &[i], &w.admin, &[]).unwrap_err();
    assert!(err.contains("MissingPriceUpdate"), "{err}");
    let i = update(&w, None, Some(NEW_FEED), Some(w.sol_price));
    let err = send(&mut w.svm, &[i], &w.admin, &[]).unwrap_err();
    assert!(err.contains("StalePrice"), "{err}");
    let i = update(&w, None, Some(NEW_FEED), Some(new_price));
    send(&mut w.svm, &[i], &w.admin, &[]).unwrap();
    assert_eq!(read_asset(&w).feed_id, NEW_FEED);
    assert_eq!(read_pot(&w.svm, &k.pot).legs[0].feed_id, SOL_FEED, "existing legs keep their feed");
}

/// F10: a price update that is only partially verified by Wormhole guardians is refused.
#[test]
fn partially_verified_price_is_refused() {
    let mut w = setup();
    let k = create_pot(&mut w, (5000, 5000), 1000);
    let c = w.creator.insecure_clone();
    finalize(&mut w, &k, &c).unwrap();
    let user = w.user.pubkey();
    set_ata(&mut w.svm, &w.usdc, &user, 1_000_000_000);
    set_ata(&mut w.svm, &k.index_mint, &user, 0);
    set_ata(&mut w.svm, &w.usdc, &w.creator.pubkey(), 0);
    set_ata(&mut w.svm, &w.usdc, &w.treasury, 0);

    let partial = VerificationLevel::Partial { num_signatures: 5 };
    write_price_verified(&mut w.svm, w.sol_price, SOL_FEED, SOL_PRICE, 10_000_000, NOW - 5, partial);
    let err = { let i = deposit_ix(&w, &k, 100_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap_err();
    assert!(err.contains("StalePrice"), "{err}");

    write_price(&mut w.svm, w.sol_price, SOL_FEED, SOL_PRICE, 10_000_000, NOW - 5);
    { let i = deposit_ix(&w, &k, 101_000_000, 0, false); send(&mut w.svm, &[i], &w.user, &[]) }.unwrap();
}

/// F8: a mint with a freeze authority cannot be listed, since a frozen leg vault would block
/// every exit.
#[test]
fn freezable_mint_cannot_be_registered() {
    let mut w = setup();
    let mint = set_mint(&mut w.svm, 9);
    let mut acc = w.svm.get_account(&mint).unwrap();
    acc.data[46] = 1; // freeze_authority: COption::Some
    acc.data[50..82].copy_from_slice(w.admin.pubkey().as_ref());
    w.svm.set_account(mint, acc).unwrap();
    let i = ix(
        pot_index::instruction::RegisterAsset { feed_id: SOL_FEED },
        pot_index::accounts::RegisterAsset {
            admin: w.admin.pubkey(),
            config: w.config,
            mint,
            price_update: w.sol_price,
            asset: pda(&[ASSET_SEED, mint.as_ref()]),
            system_program: SYSTEM,
        },
        vec![],
    );
    let err = send(&mut w.svm, &[i], &w.admin, &[]).unwrap_err();
    assert!(err.contains("FreezableMint"), "{err}");
}
