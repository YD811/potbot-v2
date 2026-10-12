//! Every guard the program has, one test each: oracle checks, deposit and exit bounds, pauses,
//! Pot setup validation, rebalance bounds, admin events and the account layouts.

mod common;
use common::*;

fn deposit(w: &mut World, k: &PotKeys, amount: u64) -> Result<Vec<String>, String> {
    let i = deposit_ix(w, k, amount, 0, false);
    send(&mut w.svm, &[i], &w.user, &[])
}

// ---------------------------------------------------------------------------------------------
// Oracle
// ---------------------------------------------------------------------------------------------

#[test]
fn oracle_account_must_be_owned_by_the_pyth_receiver() {
    let (mut w, k) = finalized_pot((5000, 5000));
    // Same bytes as a valid update, owned by another program.
    let mut acc = w.svm.get_account(&w.sol_price).unwrap();
    acc.owner = SYSTEM;
    w.svm.set_account(w.sol_price, acc).unwrap();
    let err = deposit(&mut w, &k, 100_000_000).unwrap_err();
    assert!(err.contains("BadOracleOwner"), "{err}");
}

#[test]
fn confidence_is_capped_at_two_percent() {
    let (mut w, k) = finalized_pot((5000, 5000));
    // conf = 2% of $150 exactly: accepted.
    write_price(&mut w.svm, w.sol_price, SOL_FEED, SOL_PRICE, 3_00000000, NOW - 5);
    deposit(&mut w, &k, 100_000_000).unwrap();
    // One unit wider: refused.
    write_price(&mut w.svm, w.sol_price, SOL_FEED, SOL_PRICE, 3_00000001, NOW - 5);
    let err = deposit(&mut w, &k, 101_000_000).unwrap_err();
    assert!(err.contains("OracleConfidence"), "{err}");
}

#[test]
fn non_positive_prices_are_refused() {
    let (mut w, k) = finalized_pot((5000, 5000));
    for (i, price) in [0i64, -1].into_iter().enumerate() {
        write_price(&mut w.svm, w.sol_price, SOL_FEED, price, 0, NOW - 5);
        let err = deposit(&mut w, &k, 100_000_000 + i as u64).unwrap_err();
        assert!(err.contains("NonPositivePrice"), "{price}: {err}");
    }
    // conf >= price never reaches the `price - conf > 0` check in `snapshot_legs`: the 2% cap
    // refuses it first, so that check is defence in depth only.
    write_price(&mut w.svm, w.sol_price, SOL_FEED, SOL_PRICE, SOL_PRICE as u64, NOW - 5);
    let err = deposit(&mut w, &k, 102_000_000).unwrap_err();
    assert!(err.contains("OracleConfidence"), "{err}");
}

#[test]
fn price_posted_too_many_slots_ago_is_stale() {
    let (mut w, k) = finalized_pot((5000, 5000));
    // The publish time stays fresh (the clock's unix time does not move), only the post ages.
    let mut clock: Clock = w.svm.get_sysvar();
    clock.slot += 151;
    w.svm.set_sysvar(&clock);
    w.svm.expire_blockhash();
    let err = deposit(&mut w, &k, 100_000_000).unwrap_err();
    assert!(err.contains("StalePrice"), "{err}");
    // Reposted in the current slot: accepted.
    write_price(&mut w.svm, w.sol_price, SOL_FEED, SOL_PRICE, 10_000_000, NOW - 5);
    write_price(&mut w.svm, w.jup_price, JUP_FEED, JUP_PRICE, 100_000, NOW - 5);
    deposit(&mut w, &k, 101_000_000).unwrap();
}

#[test]
fn price_accounts_in_the_wrong_leg_order_are_refused() {
    let (mut w, k) = finalized_pot((5000, 5000));
    let mut i = deposit_ix(&w, &k, 100_000_000, 0, false);
    // remaining accounts end with [sol_vault, sol_price, jup_vault, jup_price]: swap the prices.
    let n = i.accounts.len();
    i.accounts.swap(n - 3, n - 1);
    let err = send(&mut w.svm, &[i], &w.user, &[]).unwrap_err();
    assert!(err.contains("StalePrice"), "{err}");
}

// ---------------------------------------------------------------------------------------------
// Deposit and exit
// ---------------------------------------------------------------------------------------------

#[test]
fn minimum_deposit_and_exact_fee_split() {
    let (mut w, k) = finalized_pot((5000, 5000));
    let err = deposit(&mut w, &k, 999_999).unwrap_err();
    assert!(err.contains("DepositTooSmall"), "{err}");
    let i = deposit_ix(&w, &k, 1_000_000, 0, true);
    send(&mut w.svm, &[i], &w.user, &[]).unwrap();
    // 0.30% of 1 USDC = 3,000: referrer 40%, creator 40%, protocol 20%, nothing lost to rounding.
    assert_eq!(token_amount(&w.svm, &ata(&w.referrer, &w.usdc)), 1_200);
    assert_eq!(token_amount(&w.svm, &ata(&w.creator.pubkey(), &w.usdc)), 1_200);
    assert_eq!(token_amount(&w.svm, &ata(&w.treasury, &w.usdc)), 600);
    assert_eq!(token_amount(&w.svm, &k.cash_vault), 997_000);
}

#[test]
fn deposit_cap_is_inclusive() {
    let (mut w, k) = finalized_pot((5000, 5000));
    let cap = set_pot_params_ix(&w, &k, None, Some(100_000_000));
    send(&mut w.svm, &[cap], &w.creator, &[]).unwrap();
    // 100,300,903 → fee 300,902 → net 100,000,001: one unit over the cap.
    let err = deposit(&mut w, &k, 100_300_903).unwrap_err();
    assert!(err.contains("DepositCapExceeded"), "{err}");
    // 100,300,902 → net exactly 100,000,000: lands on the cap.
    deposit(&mut w, &k, 100_300_902).unwrap();
    let err = deposit(&mut w, &k, 1_000_000).unwrap_err();
    assert!(err.contains("DepositCapExceeded"), "{err}");
}

#[test]
fn holder_minimums_are_enforced() {
    let (mut w, k) = finalized_pot((5000, 5000));
    let i = deposit_ix(&w, &k, 100_000_000, u64::MAX, false);
    let err = send(&mut w.svm, &[i], &w.user, &[]).unwrap_err();
    assert!(err.contains("SlippageShares"), "{err}");
    deposit(&mut w, &k, 100_000_000).unwrap();

    let user = w.user.pubkey();
    let shares = token_amount(&w.svm, &ata(&user, &k.index_mint));
    let half = shares / 2;
    let cash_share = exit_share(token_amount(&w.svm, &k.cash_vault), half, mint_supply(&w.svm, &k.index_mint));
    let i = exit_ix_for(&w, &k, &user, half, cash_share + 1);
    let err = send(&mut w.svm, &[i], &w.user, &[]).unwrap_err();
    assert!(err.contains("SlippageAssets"), "{err}");
    let i = exit_ix_for(&w, &k, &user, half, cash_share);
    send(&mut w.svm, &[i], &w.user, &[]).unwrap();
}

/// The protocol pause stops new Pots, deposits and rebalances; the creator pause stops deposits
/// only. Neither stops an exit, in kind or to USDC.
#[test]
fn pauses_never_stop_exits() {
    let (mut w, k) = finalized_pot((5000, 5000));
    deposit(&mut w, &k, 1_000_000_000).unwrap();
    let (keeper_sol, _) = fund_keeper(&mut w, 10_000_000_000, 0);
    let keeper = w.keeper.pubkey();
    let user = w.user.pubkey();

    let pause = set_config_ix(&w, config_update(Some(true), None));
    send(&mut w.svm, &[pause], &w.admin, &[]).unwrap();
    let (create, index_kp, _) = create_pot_ix(&w, pot_params(2500));
    let err = send(&mut w.svm, &[create], &w.creator, &[&index_kp]).unwrap_err();
    assert!(err.contains("ProtocolPaused"), "{err}");
    let err = deposit(&mut w, &k, 10_000_000).unwrap_err();
    assert!(err.contains("ProtocolPaused"), "{err}");
    let v = vec![open_ix(&w, &k, CASH, 0, 100_000_000), spl_transfer(&keeper_sol, &k.sol_vault, &keeper, 670_000_000), close_ix(&w, &k, 0)];
    let err = send(&mut w.svm, &v, &w.keeper, &[]).unwrap_err();
    assert!(err.contains("ProtocolPaused"), "{err}");

    let shares = token_amount(&w.svm, &ata(&user, &k.index_mint));
    let i = exit_ix(&w, &k, shares / 4);
    send(&mut w.svm, &[i], &w.user, &[]).unwrap();
    let v = vec![exit_usdc_open_ix(&w, &k, shares / 4, 0), exit_usdc_close_ix(&w, &k, ata(&user, &w.usdc))];
    send(&mut w.svm, &v, &w.user, &[]).unwrap();

    // Creator pause: deposits stop, keepers and exits do not.
    let unpause = set_config_ix(&w, config_update(Some(false), None));
    send(&mut w.svm, &[unpause], &w.admin, &[]).unwrap();
    let creator_pause = set_pot_params_ix(&w, &k, Some(true), None);
    send(&mut w.svm, &[creator_pause], &w.creator, &[]).unwrap();
    let err = deposit(&mut w, &k, 11_000_000).unwrap_err();
    assert!(err.contains("PotPaused"), "{err}");
    w.svm.expire_blockhash(); // the rebalance below repeats the refused one byte for byte
    let v = vec![open_ix(&w, &k, CASH, 0, 100_000_000), spl_transfer(&keeper_sol, &k.sol_vault, &keeper, 670_000_000), close_ix(&w, &k, 0)];
    send(&mut w.svm, &v, &w.keeper, &[]).unwrap();
    let i = exit_ix(&w, &k, shares / 8);
    send(&mut w.svm, &[i], &w.user, &[]).unwrap();
}

// ---------------------------------------------------------------------------------------------
// Pot setup
// ---------------------------------------------------------------------------------------------

type Tweak = fn(&mut pot_index::instructions::pot::CreatePotParams);

#[test]
fn create_pot_params_are_validated() {
    let mut w = setup();
    let cases: [(Tweak, &str); 7] = [
        (|p| p.name = "x".repeat(33), "NameTooLong"),
        (|p| p.name = String::new(), "NameTooLong"),
        (|p| p.symbol = "x".repeat(11), "NameTooLong"),
        (|p| p.slippage_bps = 0, "InvalidParams"),
        (|p| p.slippage_bps = 101, "InvalidParams"),
        (|p| p.max_trade_bps = 0, "InvalidParams"),
        (|p| p.max_trade_bps = 2501, "InvalidParams"),
    ];
    for (tweak, expected) in cases {
        let mut params = pot_params(2500);
        tweak(&mut params);
        let (create, index_kp, _) = create_pot_ix(&w, params);
        let err = send(&mut w.svm, &[create], &w.creator, &[&index_kp]).unwrap_err();
        assert!(err.contains(expected), "{expected}: {err}");
    }
}

#[test]
fn legs_are_validated_until_finalize() {
    let mut w = setup();
    let (create, index_kp, k) = create_pot_ix(&w, pot_params(2500));
    send(&mut w.svm, &[create], &w.creator, &[&index_kp]).unwrap();
    let add = |w: &mut World, mint: Pubkey, weight: u16| {
        let i = add_leg_ix(w, &k, mint, weight);
        send(&mut w.svm, &[i], &w.creator, &[])
    };
    let (sol, jup) = (w.sol, w.jup);

    for weight in [0, 10_001] {
        let err = add(&mut w, sol, weight).unwrap_err();
        assert!(err.contains("InvalidWeight"), "{weight}: {err}");
    }
    add(&mut w, sol, 6_000).unwrap();
    let err = add(&mut w, sol, 4_000).unwrap_err();
    assert!(err.contains("DuplicateLeg"), "{err}");
    let c = w.creator.insecure_clone();
    let err = finalize(&mut w, &k, &c).unwrap_err();
    assert!(err.contains("TooFewLegs"), "{err}");

    // A disabled asset cannot become a leg.
    let disable = update_asset_ix(&w, jup, Some(false));
    send(&mut w.svm, &[disable], &w.admin, &[]).unwrap();
    let err = add(&mut w, jup, 4_000).unwrap_err();
    assert!(err.contains("AssetDisabled"), "{err}");
    let enable = update_asset_ix(&w, jup, Some(true));
    send(&mut w.svm, &[enable], &w.admin, &[]).unwrap();
    add(&mut w, jup, 1_000).unwrap();

    // Three more assets make five legs; a sixth is refused.
    let mut extra = vec![];
    for _ in 0..4 {
        let mint = set_mint(&mut w.svm, 6);
        let reg = register_asset_ix(&w, mint, SOL_FEED, w.sol_price);
        send(&mut w.svm, &[reg], &w.admin, &[]).unwrap();
        extra.push(mint);
    }
    for &mint in &extra[..3] {
        add(&mut w, mint, 1_000).unwrap();
    }
    let err = add(&mut w, extra[3], 1_000).unwrap_err();
    assert!(err.contains("TooManyLegs"), "{err}");

    // 6,000 + 4 × 1,000 = 10,000: finalizes once, then nothing can change.
    w.svm.expire_blockhash(); // same bytes as the refused finalize above
    finalize(&mut w, &k, &c).unwrap();
    w.svm.expire_blockhash();
    let err = finalize(&mut w, &k, &c).unwrap_err();
    assert!(err.contains("PotAlreadyFinalized"), "{err}");
    let err = add(&mut w, extra[3], 500).unwrap_err();
    assert!(err.contains("PotAlreadyFinalized"), "{err}");
}

// ---------------------------------------------------------------------------------------------
// Rebalance bounds (compositions set directly on the vaults; prices: SOL $150 ± 0.10, JUP $1 ± 0.001)
// ---------------------------------------------------------------------------------------------

const CASH: u8 = u8::MAX;

#[test]
fn trades_inside_the_deadband_are_refused() {
    let (mut w, k) = finalized_pot((5000, 5000));
    // Cash 1, SOL 3.36 (≈ 504), JUP 496: NAV ≈ 1,001.8, deadband ≈ 5.0 per leg.
    set_vaults(&mut w, &k, 1_000_000, 3_360_000_000, 496_000_000);
    let (_, keeper_jup) = fund_keeper(&mut w, 10_000_000_000, 1_000_000_000);
    let keeper = w.keeper.pubkey();
    // SOL is ≈ 3.4 over target: inside the band.
    let v = vec![open_ix(&w, &k, 0, 1, 10_000_000), spl_transfer(&keeper_jup, &k.jup_vault, &keeper, 1_600_000), close_ix(&w, &k, 1)];
    let err = send(&mut w.svm, &v, &w.keeper, &[]).unwrap_err();
    assert!(err.contains("WithinDeadband"), "{err}");
    // 1 USDC of cash is under the band too.
    let v = vec![open_ix(&w, &k, CASH, 1, 500_000), spl_transfer(&keeper_jup, &k.jup_vault, &keeper, 500_000), close_ix(&w, &k, 1)];
    let err = send(&mut w.svm, &v, &w.keeper, &[]).unwrap_err();
    assert!(err.contains("WithinDeadband"), "{err}");
}

#[test]
fn rotations_wait_out_the_cooldown() {
    let (mut w, k) = finalized_pot((5000, 5000));
    // SOL 4 (≈ 600) vs JUP 400: SOL ≈ 100 over target.
    set_vaults(&mut w, &k, 1_000_000, 4_000_000_000, 400_000_000);
    let (_, keeper_jup) = fund_keeper(&mut w, 0, 1_000_000_000);
    let keeper = w.keeper.pubkey();
    // 0.2 SOL (≈ 30) for 30.1 JUP: fair, inside every bound.
    let rotate = |w: &World| vec![open_ix(w, &k, 0, 1, 200_000_000), spl_transfer(&keeper_jup, &k.jup_vault, &keeper, 30_100_000), close_ix(w, &k, 1)];
    let v = rotate(&w);
    send(&mut w.svm, &v, &w.keeper, &[]).unwrap();
    assert_eq!(read_pot(&w.svm, &k.pot).last_rebalance_slot, 100);
    advance_slots(&mut w, 1);
    let v = rotate(&w);
    let err = send(&mut w.svm, &v, &w.keeper, &[]).unwrap_err();
    assert!(err.contains("Cooldown"), "{err}");
    advance_slots(&mut w, 149); // slot 250 = 100 + REBALANCE_COOLDOWN_SLOTS
    let v = rotate(&w);
    send(&mut w.svm, &v, &w.keeper, &[]).unwrap();
}

#[test]
fn a_rotation_cannot_sell_past_the_target() {
    let (mut w, k) = finalized_pot((5000, 5000));
    set_vaults(&mut w, &k, 1_000_000, 4_000_000_000, 400_000_000);
    let (_, keeper_jup) = fund_keeper(&mut w, 0, 1_000_000_000);
    let keeper = w.keeper.pubkey();
    // Selling 0.8 SOL (≈ 120) would leave SOL ≈ 480, under its ≈ 501 target.
    let v = vec![open_ix(&w, &k, 0, 1, 800_000_000), spl_transfer(&keeper_jup, &k.jup_vault, &keeper, 121_000_000), close_ix(&w, &k, 1)];
    let err = send(&mut w.svm, &v, &w.keeper, &[]).unwrap_err();
    assert!(err.contains("OvershootOut"), "{err}");
}

#[test]
fn open_needs_an_amount_and_its_own_close() {
    let (mut w, k) = finalized_pot((5000, 5000));
    set_vaults(&mut w, &k, 1_000_000, 4_000_000_000, 400_000_000);
    fund_keeper(&mut w, 0, 1_000_000_000);
    let v = vec![open_ix(&w, &k, 0, 1, 0), close_ix(&w, &k, 1)];
    let err = send(&mut w.svm, &v, &w.keeper, &[]).unwrap_err();
    assert!(err.contains("ZeroAmount"), "{err}");
    // More than the vault holds.
    let v = vec![open_ix(&w, &k, 0, 1, 4_000_000_001), close_ix(&w, &k, 1)];
    let err = send(&mut w.svm, &v, &w.keeper, &[]).unwrap_err();
    assert!(err.contains("InsufficientVaultBalance"), "{err}");
    // Two opens before a close: the first open finds the second one where its close must be.
    // `RebalanceOpen` itself is only reachable through a CPI from another program, which the
    // instructions-sysvar walk does not see.
    let v = vec![open_ix(&w, &k, 0, 1, 100_000_000), open_ix(&w, &k, 0, 1, 50_000_000), close_ix(&w, &k, 1)];
    let err = send(&mut w.svm, &v, &w.keeper, &[]).unwrap_err();
    assert!(err.contains("MissingClose"), "{err}");
}

// ---------------------------------------------------------------------------------------------
// Admin events and account layouts
// ---------------------------------------------------------------------------------------------

#[test]
fn admin_actions_emit_events() {
    use pot_index::instructions::admin::{AdminAccepted, AssetRegistered, AssetUpdated, ConfigUpdated};
    let mut w = setup();
    let creator = w.creator.pubkey();

    let i = set_config_ix(&w, config_update(Some(true), Some(creator)));
    let logs = send(&mut w.svm, &[i], &w.admin, &[]).unwrap();
    let e = events::<ConfigUpdated>(&logs);
    assert_eq!(e.len(), 1);
    assert!(e[0].paused);
    assert_eq!((e[0].admin, e[0].pending_admin), (w.admin.pubkey(), creator));
    assert_eq!(e[0].pending_admin_expiry_slot, 100 + PENDING_ADMIN_TTL_SLOTS);
    assert_eq!(e[0].max_price_age_secs, 30);

    let accept = ix(pot_index::instruction::AcceptAdmin {}, pot_index::accounts::AcceptAdmin { new_admin: creator, config: w.config }, vec![]);
    let logs = send(&mut w.svm, &[accept], &w.creator, &[]).unwrap();
    let e = events::<AdminAccepted>(&logs);
    assert_eq!((e[0].previous_admin, e[0].admin), (w.admin.pubkey(), creator));

    // The creator is now the admin.
    let mint = set_mint(&mut w.svm, 9);
    let mut reg = register_asset_ix(&w, mint, SOL_FEED, w.sol_price);
    reg.accounts[0].pubkey = creator;
    let logs = send(&mut w.svm, &[reg], &w.creator, &[]).unwrap();
    let e = events::<AssetRegistered>(&logs);
    assert_eq!((e[0].mint, e[0].feed_id), (mint, SOL_FEED));

    let mut disable = update_asset_ix(&w, mint, Some(false));
    disable.accounts[0].pubkey = creator;
    let logs = send(&mut w.svm, &[disable], &w.creator, &[]).unwrap();
    let e = events::<AssetUpdated>(&logs);
    assert_eq!((e[0].mint, e[0].enabled, e[0].feed_id), (mint, false, SOL_FEED));
}

/// Pins the account layouts, so a layout change fails here on purpose and gets a migration
/// decision (see docs/potfolio/decisions.md) instead of slipping through.
#[test]
fn account_layouts_are_pinned() {
    assert_eq!(8 + Config::INIT_SPACE, 162);
    assert_eq!(8 + AssetConfig::INIT_SPACE, 75);
    assert_eq!(8 + Pot::INIT_SPACE, 727);

    let config = Config {
        admin: Pubkey::new_from_array([1; 32]),
        pending_admin: Pubkey::new_from_array([2; 32]),
        treasury: Pubkey::new_from_array([3; 32]),
        usdc_mint: Pubkey::new_from_array([4; 32]),
        max_price_age_secs: 5,
        paused: true,
        pot_count: 7,
        bump: 8,
        pending_admin_expiry_slot: 9,
    };
    let mut d = Vec::new();
    config.try_serialize(&mut d).unwrap();
    assert_eq!(d.len(), 162);
    assert_eq!((d[8], d[40], d[72], d[104]), (1, 2, 3, 4));
    assert_eq!((d[136], d[144], d[145], d[153], d[154]), (5, 1, 7, 8, 9));

    let asset = AssetConfig { mint: Pubkey::new_from_array([1; 32]), feed_id: [2; 32], decimals: 3, enabled: true, bump: 5 };
    let mut d = Vec::new();
    asset.try_serialize(&mut d).unwrap();
    assert_eq!(d.len(), 75);
    assert_eq!((d[8], d[40], d[72], d[73], d[74]), (1, 2, 3, 1, 5));
}
