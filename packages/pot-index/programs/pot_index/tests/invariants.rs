//! Money invariants: what a Pot owes its holders under donations, several holders, and random
//! sequences of deposits, exits and cash deploys at fixed prices.

mod common;
use common::*;
use pot_index::constants::VIRTUAL_SHARES;

fn shares_of(w: &World, k: &PotKeys, owner: &Pubkey) -> u64 {
    token_amount(&w.svm, &ata(owner, &k.index_mint))
}

fn usdc_of(w: &World, owner: &Pubkey) -> u64 {
    token_amount(&w.svm, &ata(owner, &w.usdc))
}

/// First-depositor attack: deposit the minimum, donate a large amount straight into the vault so
/// the next deposit's shares round down. The virtual offset turns the donation into a gift: the
/// next depositor's claim is at least what they put in, and the attacker's is less.
#[test]
fn a_donation_cannot_steal_from_the_next_depositor() {
    let (mut w, k) = finalized_pot((5000, 5000));
    let attacker = new_holder(&mut w, &k, 20_000_000_000);
    let a = attacker.pubkey();
    let i = deposit_ix_for(&w, &k, &a, 1_000_000, 0, false);
    send(&mut w.svm, &[i], &attacker, &[]).unwrap();
    let donate = spl_transfer(&ata(&a, &w.usdc), &k.cash_vault, &a, 10_000_000_000);
    send(&mut w.svm, &[donate], &attacker, &[]).unwrap();

    let i = deposit_ix(&w, &k, 1_000_000_000, 1, false);
    send(&mut w.svm, &[i], &w.user, &[]).unwrap();

    let supply = mint_supply(&w.svm, &k.index_mint) as u128;
    let cash = token_amount(&w.svm, &k.cash_vault) as u128;
    let victim = cash * shares_of(&w, &k, &w.user.pubkey()) as u128 / supply;
    let attacker_claim = cash * shares_of(&w, &k, &a) as u128 / supply;
    assert!(victim >= 997_000_000, "victim's claim {victim} is below the 997 USDC it put in");
    assert!(attacker_claim < 10_000_997_000, "attacker's claim {attacker_claim} covers what it put in");
}

/// Tokens sent straight to a vault belong to the holders, pro rata.
#[test]
fn donations_accrue_to_holders_pro_rata() {
    let (mut w, k) = finalized_pot((5000, 5000));
    let other = new_holder(&mut w, &k, 1_000_000_000);
    let o = other.pubkey();
    let i = deposit_ix(&w, &k, 100_000_000, 0, false);
    send(&mut w.svm, &[i], &w.user, &[]).unwrap();
    let i = deposit_ix_for(&w, &k, &o, 100_000_000, 0, false);
    send(&mut w.svm, &[i], &other, &[]).unwrap();
    assert_eq!(shares_of(&w, &k, &o), shares_of(&w, &k, &w.user.pubkey()), "same price for both");

    let donor = new_holder(&mut w, &k, 10_000_000);
    let d = donor.pubkey();
    let donate = spl_transfer(&ata(&d, &w.usdc), &k.cash_vault, &d, 10_000_000);
    send(&mut w.svm, &[donate], &donor, &[]).unwrap();

    let (cash, supply, s) = (token_amount(&w.svm, &k.cash_vault), mint_supply(&w.svm, &k.index_mint), shares_of(&w, &k, &o));
    let i = exit_ix_for(&w, &k, &o, s, 0);
    send(&mut w.svm, &[i], &other, &[]).unwrap();
    let got = usdc_of(&w, &o) - 900_000_000;
    assert_eq!(got, exit_share(cash, s, supply));
    // Half of 99.7 + 99.7 + 10 is 104.7; minus the 0.5% exit fee ≈ 104.18.
    assert!(got > 104_000_000, "got {got}: the donation did not reach the holder");
}

/// The exit fee stays with the holders who remain; the last holder takes everything left.
#[test]
fn exit_fees_accrue_to_the_last_holder() {
    let (mut w, k) = finalized_pot((5000, 5000));
    let other = new_holder(&mut w, &k, 1_000_000_000);
    let (user, o) = (w.user.pubkey(), other.pubkey());
    let i = deposit_ix(&w, &k, 100_000_000, 0, false);
    send(&mut w.svm, &[i], &w.user, &[]).unwrap();
    let i = deposit_ix_for(&w, &k, &o, 100_000_000, 0, false);
    send(&mut w.svm, &[i], &other, &[]).unwrap();

    let (supply, s) = (mint_supply(&w.svm, &k.index_mint), shares_of(&w, &k, &o));
    let i = exit_ix_for(&w, &k, &o, s, 0);
    send(&mut w.svm, &[i], &other, &[]).unwrap();
    let other_out = usdc_of(&w, &o) - 900_000_000;
    assert_eq!(other_out, exit_share(199_400_000, s, supply));
    let fee_left = 99_700_000 - other_out;
    assert!(fee_left > 0);

    let user_before = usdc_of(&w, &user);
    let i = exit_ix(&w, &k, shares_of(&w, &k, &user));
    send(&mut w.svm, &[i], &w.user, &[]).unwrap();
    assert_eq!(usdc_of(&w, &user) - user_before, 99_700_000 + fee_left, "last holder takes its share plus the fee");
    assert_eq!(token_amount(&w.svm, &k.cash_vault), 0);
    assert_eq!(mint_supply(&w.svm, &k.index_mint), 0);
}

/// 80 random steps by three holders (deposits, partial exits, cash deploys by a keeper paying the
/// mid price) at fixed prices. After every step, supply equals the holders' balances. An exit never
/// lowers the value behind one index token. A deposit can lower it by at most the virtual holder's
/// slice, `VIRTUAL_SHARES / (supply + VIRTUAL_SHARES)` of the Pot: the cost of the inflation-attack
/// offset, which only matters while supply is small. At the end everyone exits, nothing stays in
/// the Pot, and value is conserved to the unit: holders lose exactly the entry fees plus the
/// keeper's rounding.
#[test]
fn random_sequences_conserve_value() {
    let (mut w, k) = finalized_pot((6000, 4000));
    let mut holders = vec![w.user.insecure_clone()];
    for _ in 0..2 {
        holders.push(new_holder(&mut w, &k, 10_000_000_000));
    }
    let (keeper_sol, keeper_jup) = fund_keeper(&mut w, 1_000_000_000_000, 1_000_000_000_000);
    let keeper = w.keeper.pubkey();
    let initial: u128 = holders.iter().map(|h| wallet_value_nano(&w, &h.pubkey())).sum();
    let keeper_initial = wallet_value_nano(&w, &keeper);

    let mut rng = 0x2545_F491_4F6C_DD1Du64;
    let mut next = move || {
        rng ^= rng << 13;
        rng ^= rng >> 7;
        rng ^= rng << 17;
        rng
    };
    let mut deploys = 0u128;
    for step in 0..80 {
        advance_slots(&mut w, 1);
        let h = &holders[(next() % 3) as usize];
        let owner = h.pubkey();
        let supply0 = mint_supply(&w.svm, &k.index_mint) as u128;
        let value0 = pot_value_nano(&w, &k);
        let action = next() % 3;
        match action {
            0 => {
                let amount = 1_000_000 + next() % 500_000_000;
                let i = deposit_ix_for(&w, &k, &owner, amount, 0, false);
                send(&mut w.svm, &[i], h, &[]).unwrap();
            }
            1 => {
                let shares = shares_of(&w, &k, &owner);
                if shares == 0 {
                    continue;
                }
                let i = exit_ix_for(&w, &k, &owner, 1 + next() % shares, 0);
                send(&mut w.svm, &[i], h, &[]).unwrap();
            }
            _ => {
                let cash = token_amount(&w.svm, &k.cash_vault);
                if cash < 2_000_000 {
                    continue;
                }
                let amount = 1_000_000 + next() % (cash / 4);
                let (leg, vault, from, delivered) = if next() % 2 == 0 {
                    (0u8, k.sol_vault, keeper_sol, amount * 1_000 / 150) // SOL at $150, rounded down
                } else {
                    (1u8, k.jup_vault, keeper_jup, amount) // JUP at $1
                };
                let v = vec![open_ix(&w, &k, u8::MAX, leg, amount), spl_transfer(&from, &vault, &keeper, delivered), close_ix(&w, &k, leg)];
                // The bounds (target, trade size) may refuse a random trade; then nothing moves.
                if send(&mut w.svm, &v, &w.keeper, &[]).is_ok() {
                    deploys += 1;
                } else {
                    assert_eq!(pot_value_nano(&w, &k), value0, "a refused deploy moved value at step {step}");
                }
            }
        }

        let supply1 = mint_supply(&w.svm, &k.index_mint) as u128;
        let balances: u128 = holders.iter().map(|h| shares_of(&w, &k, &h.pubkey()) as u128).sum();
        assert_eq!(balances, supply1, "supply != balances at step {step}");
        let value1 = pot_value_nano(&w, &k);
        if supply0 > 0 && supply1 > 0 {
            // Value lost by the tokens that existed before, scaled by supply1: value0·s1 − value1·s0.
            let lost = (value0 * supply1).saturating_sub(value1 * supply0);
            match action {
                1 => assert_eq!(lost, 0, "an exit lowered the value per token at step {step}"),
                0 => {
                    let bound = value0 * VIRTUAL_SHARES / (supply0 + VIRTUAL_SHARES) * supply1;
                    assert!(lost <= bound, "a deposit took more than the virtual slice at step {step}: {lost} > {bound}");
                }
                _ => {}
            }
        }
    }

    // Everyone leaves; the last one out takes whatever is left.
    for h in &holders {
        let shares = shares_of(&w, &k, &h.pubkey());
        if shares > 0 {
            let i = exit_ix_for(&w, &k, &h.pubkey(), shares, 0);
            send(&mut w.svm, &[i], h, &[]).unwrap();
        }
    }
    assert_eq!(mint_supply(&w.svm, &k.index_mint), 0);
    assert_eq!(pot_value_nano(&w, &k), 0, "value left behind in an empty Pot");

    let after: u128 = holders.iter().map(|h| wallet_value_nano(&w, &h.pubkey())).sum();
    let fees = (usdc_of(&w, &w.creator.pubkey()) as u128 + usdc_of(&w, &w.treasury) as u128) * 1_000;
    let keeper_gain = wallet_value_nano(&w, &keeper) - keeper_initial;
    assert!(deploys > 0, "the sequence never deployed cash");
    assert_eq!(initial, after + fees + keeper_gain, "value created or destroyed");
    assert!(keeper_gain <= deploys * 150, "keeper kept {keeper_gain} nano-USD over {deploys} deploys");
}
