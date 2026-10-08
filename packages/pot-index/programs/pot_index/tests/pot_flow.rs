//! End-to-end LiteSVM tests for `pot_index`:
//! create → deposit (with referral fees) → bounded rebalance → deposit at NAV → exit in kind,
//! plus the paths that must fail (missing close, slippage, oversized trade, pause, auth).

use {
    anchor_lang::{
        prelude::{Clock, Pubkey},
        solana_program::instruction::{AccountMeta, Instruction},
        AccountDeserialize, AccountSerialize, InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    pot_index::{
        constants::{ASSET_SEED, CONFIG_SEED, POT_SEED},
        state::{Config, Pot},
    },
    pyth_solana_receiver_sdk::price_update::{PriceFeedMessage, PriceUpdateV2, VerificationLevel},
    solana_account::Account as RawAccount,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const PROGRAM: Pubkey = pot_index::ID;
const TOKEN: Pubkey = anchor_spl::token::ID;
const ATA_PROGRAM: Pubkey = anchor_spl::associated_token::ID;
const SYSTEM: Pubkey = anchor_lang::solana_program::system_program::ID;
const INSTRUCTIONS_SYSVAR: Pubkey = anchor_lang::compat::solana_instructions_sysvar::ID;

const NOW: i64 = 1_760_000_000;
const SOL_FEED: [u8; 32] = [1u8; 32];
const JUP_FEED: [u8; 32] = [2u8; 32];
const SOL_PRICE: i64 = 150_00000000; // $150, expo -8
const JUP_PRICE: i64 = 1_00000000; // $1, expo -8

struct World {
    svm: LiteSVM,
    admin: Keypair,
    treasury: Pubkey,
    creator: Keypair,
    user: Keypair,
    referrer: Pubkey,
    keeper: Keypair,
    usdc: Pubkey,
    sol: Pubkey,
    jup: Pubkey,
    sol_price: Pubkey,
    jup_price: Pubkey,
    config: Pubkey,
}

fn pda(seeds: &[&[u8]]) -> Pubkey {
    Pubkey::find_program_address(seeds, &PROGRAM).0
}

fn set_mint(svm: &mut LiteSVM, decimals: u8) -> Pubkey {
    let key = Keypair::new().pubkey();
    // spl-token Mint layout (82 bytes): COption<authority> 36 | supply 8 | decimals 1 | init 1 | COption<freeze> 36
    let mut data = vec![0u8; 82];
    data[44] = decimals;
    data[45] = 1;
    svm.set_account(key, RawAccount { lamports: 10_000_000, data, owner: TOKEN, executable: false, rent_epoch: 0 })
        .unwrap();
    key
}

fn set_ata(svm: &mut LiteSVM, mint: &Pubkey, owner: &Pubkey, amount: u64) -> Pubkey {
    let key = ata(owner, mint);
    // spl-token Account layout (165 bytes): mint 32 | owner 32 | amount 8 | COption<delegate> 36 | state 1 | ...
    let mut data = vec![0u8; 165];
    data[0..32].copy_from_slice(mint.as_ref());
    data[32..64].copy_from_slice(owner.as_ref());
    data[64..72].copy_from_slice(&amount.to_le_bytes());
    data[108] = 1; // AccountState::Initialized
    svm.set_account(key, RawAccount { lamports: 10_000_000, data, owner: TOKEN, executable: false, rent_epoch: 0 })
        .unwrap();
    key
}

fn ata(owner: &Pubkey, mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[owner.as_ref(), TOKEN.as_ref(), mint.as_ref()], &ATA_PROGRAM).0
}

fn token_amount(svm: &LiteSVM, key: &Pubkey) -> u64 {
    let acc = svm.get_account(key).unwrap();
    u64::from_le_bytes(acc.data[64..72].try_into().unwrap())
}

fn set_price(svm: &mut LiteSVM, feed: [u8; 32], price: i64, conf: u64, publish_time: i64) -> Pubkey {
    let key = Keypair::new().pubkey();
    let upd = PriceUpdateV2 {
        write_authority: Pubkey::default(),
        verification_level: VerificationLevel::Full,
        price_message: PriceFeedMessage {
            feed_id: feed,
            price,
            conf,
            exponent: -8,
            publish_time,
            prev_publish_time: publish_time - 1,
            ema_price: price,
            ema_conf: conf,
        },
        posted_slot: 1,
    };
    let mut data = Vec::new();
    upd.try_serialize(&mut data).unwrap();
    svm.set_account(
        key,
        RawAccount { lamports: 10_000_000, data, owner: pyth_solana_receiver_sdk::ID, executable: false, rent_epoch: 0 },
    )
    .unwrap();
    key
}

fn send(svm: &mut LiteSVM, ixs: &[Instruction], payer: &Keypair, extra: &[&Keypair]) -> Result<Vec<String>, String> {
    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(ixs, Some(&payer.pubkey()), &bh);
    let mut signers: Vec<&Keypair> = vec![payer];
    signers.extend_from_slice(extra);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &signers).unwrap();
    match svm.send_transaction(tx) {
        Ok(m) => Ok(m.logs),
        Err(e) => Err(format!("{:?}\n{}", e.err, e.meta.logs.join("\n"))),
    }
}

fn ix(data: impl InstructionData, accounts: impl ToAccountMetas, remaining: Vec<AccountMeta>) -> Instruction {
    let mut metas = accounts.to_account_metas(None);
    metas.extend(remaining);
    Instruction::new_with_bytes(PROGRAM, &data.data(), metas)
}

fn setup() -> World {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/pot_index.so"));
    svm.add_program(PROGRAM, bytes).unwrap();
    let mut clock: Clock = svm.get_sysvar();
    clock.unix_timestamp = NOW;
    clock.slot = 100;
    svm.set_sysvar(&clock);

    let admin = Keypair::new();
    let creator = Keypair::new();
    let user = Keypair::new();
    let keeper = Keypair::new();
    let treasury = Keypair::new().pubkey();
    let referrer = Keypair::new().pubkey();
    for k in [&admin, &creator, &user, &keeper] {
        svm.airdrop(&k.pubkey(), 10_000_000_000).unwrap();
    }

    let usdc = set_mint(&mut svm, 6);
    let sol = set_mint(&mut svm, 9);
    let jup = set_mint(&mut svm, 6);
    let sol_price = set_price(&mut svm, SOL_FEED, SOL_PRICE, 10_000_000, NOW - 5);
    let jup_price = set_price(&mut svm, JUP_FEED, JUP_PRICE, 100_000, NOW - 5);
    let config = pda(&[CONFIG_SEED]);

    // init_config
    send(
        &mut svm,
        &[ix(
            pot_index::instruction::InitConfig { treasury, max_price_age_secs: 3600 },
            pot_index::accounts::InitConfig { admin: admin.pubkey(), config, usdc_mint: usdc, system_program: SYSTEM },
            vec![],
        )],
        &admin,
        &[],
    )
    .unwrap();
    // register assets
    for (mint, feed) in [(sol, SOL_FEED), (jup, JUP_FEED)] {
        send(
            &mut svm,
            &[ix(
                pot_index::instruction::RegisterAsset { feed_id: feed },
                pot_index::accounts::RegisterAsset {
                    admin: admin.pubkey(),
                    config,
                    mint,
                    asset: pda(&[ASSET_SEED, mint.as_ref()]),
                    system_program: SYSTEM,
                },
                vec![],
            )],
            &admin,
            &[],
        )
        .unwrap();
    }

    World { svm, admin, treasury, creator, user, referrer, keeper, usdc, sol, jup, sol_price, jup_price, config }
}

struct PotKeys {
    pot: Pubkey,
    index_mint: Pubkey,
    cash_vault: Pubkey,
    sol_vault: Pubkey,
    jup_vault: Pubkey,
}

fn create_pot(w: &mut World, weights: (u16, u16), max_trade_bps: u16) -> PotKeys {
    let index_kp = Keypair::new();
    let index_mint = index_kp.pubkey();
    let pot = pda(&[POT_SEED, index_mint.as_ref()]);
    let cash_vault = ata(&pot, &w.usdc);
    let sol_vault = ata(&pot, &w.sol);
    let jup_vault = ata(&pot, &w.jup);
    let creator = w.creator.pubkey();

    let create = ix(
        pot_index::instruction::CreatePot {
            params: pot_index::instructions::pot::CreatePotParams {
                name: "YD Growth".into(),
                symbol: "YDG".into(),
                deposit_cap_usd: 0,
                slippage_bps: 100,
                max_trade_bps,
            },
        },
        pot_index::accounts::CreatePot {
            creator,
            config: w.config,
            index_mint,
            pot,
            usdc_mint: w.usdc,
            cash_vault,
            token_program: TOKEN,
            associated_token_program: ATA_PROGRAM,
            system_program: SYSTEM,
        },
        vec![],
    );
    send(&mut w.svm, &[create], &w.creator, &[&index_kp]).unwrap();

    for (mint, vault, wbps) in [(w.sol, sol_vault, weights.0), (w.jup, jup_vault, weights.1)] {
        let add = ix(
            pot_index::instruction::AddLeg { weight_bps: wbps },
            pot_index::accounts::AddLeg {
                creator,
                pot,
                asset: pda(&[ASSET_SEED, mint.as_ref()]),
                mint,
                vault,
                token_program: TOKEN,
                associated_token_program: ATA_PROGRAM,
                system_program: SYSTEM,
            },
            vec![],
        );
        send(&mut w.svm, &[add], &w.creator, &[]).unwrap();
    }
    PotKeys { pot, index_mint, cash_vault, sol_vault, jup_vault }
}

fn finalize(w: &mut World, k: &PotKeys, signer: &Keypair) -> Result<Vec<String>, String> {
    let i = ix(
        pot_index::instruction::FinalizePot {},
        pot_index::accounts::CreatorOnly { creator: signer.pubkey(), pot: k.pot },
        vec![],
    );
    send(&mut w.svm, &[i], signer, &[])
}

fn price_remaining(w: &World, k: &PotKeys) -> Vec<AccountMeta> {
    vec![
        AccountMeta::new_readonly(k.sol_vault, false),
        AccountMeta::new_readonly(w.sol_price, false),
        AccountMeta::new_readonly(k.jup_vault, false),
        AccountMeta::new_readonly(w.jup_price, false),
    ]
}

fn deposit_ix(w: &World, k: &PotKeys, amount: u64, min_shares: u64, with_referrer: bool) -> Instruction {
    let user = w.user.pubkey();
    ix(
        pot_index::instruction::Deposit { amount, min_shares_out: min_shares },
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
            referrer_usdc: if with_referrer { Some(ata(&w.referrer, &w.usdc)) } else { None },
            token_program: TOKEN,
        },
        price_remaining(w, k),
    )
}

fn exit_ix(w: &World, k: &PotKeys, shares: u64) -> Instruction {
    let user = w.user.pubkey();
    ix(
        pot_index::instruction::Exit { shares, min_usdc_out: 0 },
        pot_index::accounts::Exit {
            user,
            pot: k.pot,
            index_mint: k.index_mint,
            user_index_ata: ata(&user, &k.index_mint),
            usdc_mint: w.usdc,
            cash_vault: k.cash_vault,
            user_usdc: ata(&user, &w.usdc),
            token_program: TOKEN,
        },
        vec![
            AccountMeta::new(k.sol_vault, false),
            AccountMeta::new(ata(&user, &w.sol), false),
            AccountMeta::new_readonly(w.sol, false),
            AccountMeta::new(k.jup_vault, false),
            AccountMeta::new(ata(&user, &w.jup), false),
            AccountMeta::new_readonly(w.jup, false),
        ],
    )
}

fn open_ix(w: &World, k: &PotKeys, leg_out: u8, leg_in: u8, amount_out: u64) -> Instruction {
    let keeper = w.keeper.pubkey();
    let (out_vault, out_mint) = match leg_out {
        u8::MAX => (k.cash_vault, w.usdc),
        0 => (k.sol_vault, w.sol),
        _ => (k.jup_vault, w.jup),
    };
    let in_vault = if leg_in == 0 { k.sol_vault } else { k.jup_vault };
    ix(
        pot_index::instruction::RebalanceOpen { leg_out, leg_in, amount_out },
        pot_index::accounts::RebalanceOpen {
            keeper,
            config: w.config,
            pot: k.pot,
            cash_vault: k.cash_vault,
            out_vault,
            out_mint,
            keeper_out_ata: ata(&keeper, &out_mint),
            in_vault,
            token_program: TOKEN,
            instructions: INSTRUCTIONS_SYSVAR,
        },
        price_remaining(w, k),
    )
}

fn close_ix(w: &World, k: &PotKeys, leg_in: u8) -> Instruction {
    let in_vault = if leg_in == 0 { k.sol_vault } else { k.jup_vault };
    ix(
        pot_index::instruction::RebalanceClose {},
        pot_index::accounts::RebalanceClose { keeper: w.keeper.pubkey(), pot: k.pot, in_vault, instructions: INSTRUCTIONS_SYSVAR },
        vec![],
    )
}

fn spl_transfer(from: &Pubkey, to: &Pubkey, owner: &Pubkey, amount: u64) -> Instruction {
    let mut data = vec![3u8]; // Transfer
    data.extend_from_slice(&amount.to_le_bytes());
    Instruction::new_with_bytes(
        TOKEN,
        &data,
        vec![AccountMeta::new(*from, false), AccountMeta::new(*to, false), AccountMeta::new_readonly(*owner, true)],
    )
}

fn read_pot(svm: &LiteSVM, pot: &Pubkey) -> Pot {
    let acc = svm.get_account(pot).unwrap();
    Pot::try_deserialize(&mut &acc.data[..]).unwrap()
}

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

    // A second trade inside all bounds (201 + 240 < 599 target, 240 < 25% of NAV) fails only
    // because this keeper delivers nothing: the Pot is never left short.
    let err = { let v = vec![open_ix(&w, &k, u8::MAX, 0, 240_000_000), close_ix(&w, &k, 0)]; send(&mut w.svm, &v, &w.keeper, &[]) }.unwrap_err();
    assert!(err.contains("RebalanceSlippage"), "{err}");

    // Selling SOL (leg 0) into JUP (leg 1): SOL is underweight (201 < 599), so it cannot be sold.
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
}
