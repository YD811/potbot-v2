//! Shared LiteSVM harness for the pot_index integration tests.

#![allow(dead_code, unused_imports)]

pub use {
    anchor_lang::{
        prelude::{Clock, Pubkey},
        solana_program::instruction::{AccountMeta, Instruction},
        AccountDeserialize, AccountSerialize, InstructionData, Space, ToAccountMetas,
    },
    litesvm::LiteSVM,
    pot_index::{
        constants::{ASSET_SEED, CONFIG_SEED, PENDING_ADMIN_TTL_SLOTS, POT_SEED, USDC_MINT},
        state::{AssetConfig, Config, Pot},
    },
    pyth_solana_receiver_sdk::price_update::{PriceFeedMessage, PriceUpdateV2, VerificationLevel},
    solana_account::Account as RawAccount,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

pub const PROGRAM: Pubkey = pot_index::ID;
pub const TOKEN: Pubkey = anchor_spl::token::ID;
pub const ATA_PROGRAM: Pubkey = anchor_spl::associated_token::ID;
pub const SYSTEM: Pubkey = anchor_lang::solana_program::system_program::ID;
pub const INSTRUCTIONS_SYSVAR: Pubkey = anchor_lang::compat::solana_instructions_sysvar::ID;
pub const UPGRADEABLE_LOADER: Pubkey = anchor_lang::solana_program::bpf_loader_upgradeable::ID;

pub const NOW: i64 = 1_760_000_000;
pub const SOL_FEED: [u8; 32] = [1u8; 32];
pub const JUP_FEED: [u8; 32] = [2u8; 32];
pub const SOL_PRICE: i64 = 150_00000000; // $150, expo -8
pub const JUP_PRICE: i64 = 1_00000000; // $1, expo -8

pub struct World {
    pub svm: LiteSVM,
    pub admin: Keypair,
    pub treasury: Pubkey,
    pub creator: Keypair,
    pub user: Keypair,
    pub referrer: Pubkey,
    pub keeper: Keypair,
    pub usdc: Pubkey,
    pub sol: Pubkey,
    pub jup: Pubkey,
    pub sol_price: Pubkey,
    pub jup_price: Pubkey,
    pub config: Pubkey,
}

pub fn pda(seeds: &[&[u8]]) -> Pubkey {
    Pubkey::find_program_address(seeds, &PROGRAM).0
}

pub fn set_mint(svm: &mut LiteSVM, decimals: u8) -> Pubkey {
    set_mint_at(svm, Keypair::new().pubkey(), decimals)
}

pub fn set_mint_at(svm: &mut LiteSVM, key: Pubkey, decimals: u8) -> Pubkey {
    // spl-token Mint layout (82 bytes): COption<authority> 36 | supply 8 | decimals 1 | init 1 | COption<freeze> 36
    let mut data = vec![0u8; 82];
    data[44] = decimals;
    data[45] = 1;
    svm.set_account(key, RawAccount { lamports: 10_000_000, data, owner: TOKEN, executable: false, rent_epoch: 0 })
        .unwrap();
    key
}

pub fn set_ata(svm: &mut LiteSVM, mint: &Pubkey, owner: &Pubkey, amount: u64) -> Pubkey {
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

pub fn ata(owner: &Pubkey, mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[owner.as_ref(), TOKEN.as_ref(), mint.as_ref()], &ATA_PROGRAM).0
}

pub fn token_amount(svm: &LiteSVM, key: &Pubkey) -> u64 {
    let acc = svm.get_account(key).unwrap();
    u64::from_le_bytes(acc.data[64..72].try_into().unwrap())
}

pub fn set_price(svm: &mut LiteSVM, feed: [u8; 32], price: i64, conf: u64, publish_time: i64) -> Pubkey {
    let key = Keypair::new().pubkey();
    write_price(svm, key, feed, price, conf, publish_time);
    key
}

/// (Re)write a price update account at `key`, posted in the current slot (the program refuses
/// updates posted more than MAX_POSTED_SLOT_AGE slots ago).
pub fn write_price(svm: &mut LiteSVM, key: Pubkey, feed: [u8; 32], price: i64, conf: u64, publish_time: i64) {
    write_price_verified(svm, key, feed, price, conf, publish_time, VerificationLevel::Full);
}

pub fn write_price_verified(
    svm: &mut LiteSVM,
    key: Pubkey,
    feed: [u8; 32],
    price: i64,
    conf: u64,
    publish_time: i64,
    verification_level: VerificationLevel,
) {
    let slot = svm.get_sysvar::<Clock>().slot;
    let upd = PriceUpdateV2 {
        write_authority: Pubkey::default(),
        verification_level,
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
        posted_slot: slot,
    };
    let mut data = Vec::new();
    upd.try_serialize(&mut data).unwrap();
    svm.set_account(
        key,
        RawAccount { lamports: 10_000_000, data, owner: pyth_solana_receiver_sdk::ID, executable: false, rent_epoch: 0 },
    )
    .unwrap();
}

pub fn send(svm: &mut LiteSVM, ixs: &[Instruction], payer: &Keypair, extra: &[&Keypair]) -> Result<Vec<String>, String> {
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

pub fn ix(data: impl InstructionData, accounts: impl ToAccountMetas, remaining: Vec<AccountMeta>) -> Instruction {
    let mut metas = accounts.to_account_metas(None);
    metas.extend(remaining);
    Instruction::new_with_bytes(PROGRAM, &data.data(), metas)
}

/// A LiteSVM with the program loaded and the clock set, before `init_config`.
pub fn boot() -> LiteSVM {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/pot_index.so"));
    svm.add_program(PROGRAM, bytes).unwrap();
    let mut clock: Clock = svm.get_sysvar();
    clock.unix_timestamp = NOW;
    clock.slot = 100;
    svm.set_sysvar(&clock);
    svm
}

/// LiteSVM deploys with no upgrade authority; set one so `init_config` can check it.
/// Returns the ProgramData address.
pub fn set_upgrade_authority(svm: &mut LiteSVM, authority: &Pubkey) -> Pubkey {
    let program_data = Pubkey::find_program_address(&[PROGRAM.as_ref()], &UPGRADEABLE_LOADER).0;
    let mut acc = svm.get_account(&program_data).unwrap();
    // UpgradeableLoaderState::ProgramData (bincode): variant u32 | slot u64 | Option tag u8 | Pubkey
    acc.data[12] = 1;
    acc.data[13..45].copy_from_slice(authority.as_ref());
    svm.set_account(program_data, acc).unwrap();
    program_data
}

pub fn init_config_ix(admin: &Pubkey, treasury: Pubkey, usdc_mint: Pubkey, program_data: Pubkey) -> Instruction {
    ix(
        pot_index::instruction::InitConfig { treasury, max_price_age_secs: 30 },
        pot_index::accounts::InitConfig {
            admin: *admin,
            config: pda(&[CONFIG_SEED]),
            usdc_mint,
            program: PROGRAM,
            program_data,
            system_program: SYSTEM,
        },
        vec![],
    )
}

pub fn setup() -> World {
    let mut svm = boot();

    let admin = Keypair::new();
    let creator = Keypair::new();
    let user = Keypair::new();
    let keeper = Keypair::new();
    let treasury = Keypair::new().pubkey();
    let referrer = Keypair::new().pubkey();
    for k in [&admin, &creator, &user, &keeper] {
        svm.airdrop(&k.pubkey(), 10_000_000_000).unwrap();
    }

    let usdc = set_mint_at(&mut svm, USDC_MINT, 6);
    let sol = set_mint(&mut svm, 9);
    let jup = set_mint(&mut svm, 6);
    let sol_price = set_price(&mut svm, SOL_FEED, SOL_PRICE, 10_000_000, NOW - 5);
    let jup_price = set_price(&mut svm, JUP_FEED, JUP_PRICE, 100_000, NOW - 5);
    let config = pda(&[CONFIG_SEED]);

    // init_config, by the upgrade authority
    let program_data = set_upgrade_authority(&mut svm, &admin.pubkey());
    send(&mut svm, &[init_config_ix(&admin.pubkey(), treasury, usdc, program_data)], &admin, &[]).unwrap();
    // register assets
    for (mint, feed, price_update) in [(sol, SOL_FEED, sol_price), (jup, JUP_FEED, jup_price)] {
        send(
            &mut svm,
            &[ix(
                pot_index::instruction::RegisterAsset { feed_id: feed },
                pot_index::accounts::RegisterAsset {
                    admin: admin.pubkey(),
                    config,
                    mint,
                    price_update,
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

pub struct PotKeys {
    pub pot: Pubkey,
    pub index_mint: Pubkey,
    pub cash_vault: Pubkey,
    pub sol_vault: Pubkey,
    pub jup_vault: Pubkey,
}

pub fn pot_params(max_trade_bps: u16) -> pot_index::instructions::pot::CreatePotParams {
    pot_index::instructions::pot::CreatePotParams {
        name: "YD Growth".into(),
        symbol: "YDG".into(),
        deposit_cap_usd: 0,
        slippage_bps: 100,
        max_trade_bps,
    }
}

/// `create_pot` with the given params; returns the instruction, the index-mint signer and the keys.
pub fn create_pot_ix(w: &World, params: pot_index::instructions::pot::CreatePotParams) -> (Instruction, Keypair, PotKeys) {
    let index_kp = Keypair::new();
    let index_mint = index_kp.pubkey();
    let pot = pda(&[POT_SEED, index_mint.as_ref()]);
    let cash_vault = ata(&pot, &w.usdc);
    let i = ix(
        pot_index::instruction::CreatePot { params },
        pot_index::accounts::CreatePot {
            creator: w.creator.pubkey(),
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
    let keys = PotKeys { pot, index_mint, cash_vault, sol_vault: ata(&pot, &w.sol), jup_vault: ata(&pot, &w.jup) };
    (i, index_kp, keys)
}

pub fn add_leg_ix(w: &World, k: &PotKeys, mint: Pubkey, weight_bps: u16) -> Instruction {
    ix(
        pot_index::instruction::AddLeg { weight_bps },
        pot_index::accounts::AddLeg {
            creator: w.creator.pubkey(),
            pot: k.pot,
            asset: pda(&[ASSET_SEED, mint.as_ref()]),
            mint,
            vault: ata(&k.pot, &mint),
            token_program: TOKEN,
            associated_token_program: ATA_PROGRAM,
            system_program: SYSTEM,
        },
        vec![],
    )
}

pub fn create_pot(w: &mut World, weights: (u16, u16), max_trade_bps: u16) -> PotKeys {
    let (create, index_kp, k) = create_pot_ix(w, pot_params(max_trade_bps));
    send(&mut w.svm, &[create], &w.creator, &[&index_kp]).unwrap();
    for (mint, wbps) in [(w.sol, weights.0), (w.jup, weights.1)] {
        let add = add_leg_ix(w, &k, mint, wbps);
        send(&mut w.svm, &[add], &w.creator, &[]).unwrap();
    }
    k
}

pub fn finalize(w: &mut World, k: &PotKeys, signer: &Keypair) -> Result<Vec<String>, String> {
    let i = ix(
        pot_index::instruction::FinalizePot {},
        pot_index::accounts::CreatorOnly { creator: signer.pubkey(), pot: k.pot },
        vec![],
    );
    send(&mut w.svm, &[i], signer, &[])
}

pub fn price_remaining(w: &World, k: &PotKeys) -> Vec<AccountMeta> {
    vec![
        AccountMeta::new_readonly(k.sol_vault, false),
        AccountMeta::new_readonly(w.sol_price, false),
        AccountMeta::new_readonly(k.jup_vault, false),
        AccountMeta::new_readonly(w.jup_price, false),
    ]
}

pub fn deposit_ix(w: &World, k: &PotKeys, amount: u64, min_shares: u64, with_referrer: bool) -> Instruction {
    deposit_ix_for(w, k, &w.user.pubkey(), amount, min_shares, with_referrer)
}

pub fn deposit_ix_for(w: &World, k: &PotKeys, user: &Pubkey, amount: u64, min_shares: u64, with_referrer: bool) -> Instruction {
    let user = *user;
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

pub fn exit_ix(w: &World, k: &PotKeys, shares: u64) -> Instruction {
    exit_ix_for(w, k, &w.user.pubkey(), shares, 0)
}

pub fn exit_ix_for(w: &World, k: &PotKeys, user: &Pubkey, shares: u64, min_usdc_out: u64) -> Instruction {
    let user = *user;
    ix(
        pot_index::instruction::Exit { shares, min_usdc_out },
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

pub fn open_ix(w: &World, k: &PotKeys, leg_out: u8, leg_in: u8, amount_out: u64) -> Instruction {
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

pub fn close_ix(w: &World, k: &PotKeys, leg_in: u8) -> Instruction {
    let in_vault = if leg_in == 0 { k.sol_vault } else { k.jup_vault };
    ix(
        pot_index::instruction::RebalanceClose {},
        pot_index::accounts::RebalanceClose { keeper: w.keeper.pubkey(), pot: k.pot, in_vault },
        vec![],
    )
}

pub fn exit_usdc_open_ix(w: &World, k: &PotKeys, shares: u64, min_usdc_out: u64) -> Instruction {
    let user = w.user.pubkey();
    ix(
        pot_index::instruction::ExitUsdcOpen { shares, min_usdc_out },
        pot_index::accounts::ExitUsdcOpen {
            user,
            config: w.config,
            pot: k.pot,
            index_mint: k.index_mint,
            user_index_ata: ata(&user, &k.index_mint),
            usdc_mint: w.usdc,
            cash_vault: k.cash_vault,
            user_usdc: ata(&user, &w.usdc),
            token_program: TOKEN,
            instructions: INSTRUCTIONS_SYSVAR,
        },
        vec![
            AccountMeta::new(k.sol_vault, false),
            AccountMeta::new_readonly(w.sol_price, false),
            AccountMeta::new(ata(&user, &w.sol), false),
            AccountMeta::new_readonly(w.sol, false),
            AccountMeta::new(k.jup_vault, false),
            AccountMeta::new_readonly(w.jup_price, false),
            AccountMeta::new(ata(&user, &w.jup), false),
            AccountMeta::new_readonly(w.jup, false),
        ],
    )
}

pub fn exit_usdc_close_ix(w: &World, k: &PotKeys, user_usdc: Pubkey) -> Instruction {
    ix(
        pot_index::instruction::ExitUsdcClose {},
        pot_index::accounts::ExitUsdcClose {
            user: w.user.pubkey(),
            config: w.config,
            pot: k.pot,
            usdc_mint: w.usdc,
            user_usdc,
            protocol_usdc: ata(&w.treasury, &w.usdc),
            token_program: TOKEN,
        },
        vec![],
    )
}

/// Pro-rata share after the 0.5% exit fee, same integer math as the program.
pub fn exit_share(balance: u64, shares: u64, supply: u64) -> u64 {
    ((balance as u128 * shares as u128 / supply as u128) * 9950 / 10000) as u64
}

pub fn spl_transfer(from: &Pubkey, to: &Pubkey, owner: &Pubkey, amount: u64) -> Instruction {
    let mut data = vec![3u8]; // Transfer
    data.extend_from_slice(&amount.to_le_bytes());
    Instruction::new_with_bytes(
        TOKEN,
        &data,
        vec![AccountMeta::new(*from, false), AccountMeta::new(*to, false), AccountMeta::new_readonly(*owner, true)],
    )
}

/// Move the clock forward and re-post both price feeds in the new slot (as a real caller would).
pub fn advance_slots(w: &mut World, n: u64) {
    let mut clock: Clock = w.svm.get_sysvar();
    clock.slot += n;
    w.svm.set_sysvar(&clock);
    w.svm.expire_blockhash();
    write_price(&mut w.svm, w.sol_price, SOL_FEED, SOL_PRICE, 10_000_000, NOW - 5);
    write_price(&mut w.svm, w.jup_price, JUP_FEED, JUP_PRICE, 100_000, NOW - 5);
}

pub fn read_pot(svm: &LiteSVM, pot: &Pubkey) -> Pot {
    let acc = svm.get_account(pot).unwrap();
    Pot::try_deserialize(&mut &acc.data[..]).unwrap()
}

pub fn set_config_ix(w: &World, update: pot_index::instructions::admin::ConfigUpdate) -> Instruction {
    ix(
        pot_index::instruction::SetConfig { update },
        pot_index::accounts::AdminOnly { admin: w.admin.pubkey(), config: w.config },
        vec![],
    )
}

pub fn config_update(paused: Option<bool>, new_admin: Option<Pubkey>) -> pot_index::instructions::admin::ConfigUpdate {
    pot_index::instructions::admin::ConfigUpdate { paused, max_price_age_secs: None, treasury: None, new_admin }
}

pub fn read_config(w: &World) -> Config {
    Config::try_deserialize(&mut &w.svm.get_account(&w.config).unwrap().data[..]).unwrap()
}

pub fn register_asset_ix(w: &World, mint: Pubkey, feed_id: [u8; 32], price_update: Pubkey) -> Instruction {
    ix(
        pot_index::instruction::RegisterAsset { feed_id },
        pot_index::accounts::RegisterAsset {
            admin: w.admin.pubkey(),
            config: w.config,
            mint,
            price_update,
            asset: pda(&[ASSET_SEED, mint.as_ref()]),
            system_program: SYSTEM,
        },
        vec![],
    )
}

pub fn update_asset_ix(w: &World, mint: Pubkey, enabled: Option<bool>) -> Instruction {
    ix(
        pot_index::instruction::UpdateAsset { update: pot_index::instructions::admin::AssetUpdate { enabled, feed_id: None } },
        pot_index::accounts::UpdateAsset {
            admin: w.admin.pubkey(),
            config: w.config,
            asset: pda(&[ASSET_SEED, mint.as_ref()]),
            price_update: None,
        },
        vec![],
    )
}

pub fn set_pot_params_ix(w: &World, k: &PotKeys, paused: Option<bool>, deposit_cap_usd: Option<u64>) -> Instruction {
    ix(
        pot_index::instruction::SetPotParams { update: pot_index::instructions::pot::PotUpdate { paused, deposit_cap_usd } },
        pot_index::accounts::CreatorOnly { creator: w.creator.pubkey(), pot: k.pot },
        vec![],
    )
}

/// A finalized SOL/JUP Pot whose user holds 10,000 USDC, with every fee account in place.
pub fn finalized_pot(weights: (u16, u16)) -> (World, PotKeys) {
    let mut w = setup();
    let k = create_pot(&mut w, weights, 2500);
    let c = w.creator.insecure_clone();
    finalize(&mut w, &k, &c).unwrap();
    let user = w.user.pubkey();
    set_ata(&mut w.svm, &w.usdc, &user, 10_000_000_000);
    for mint in [k.index_mint, w.sol, w.jup] {
        set_ata(&mut w.svm, &mint, &user, 0);
    }
    for owner in [w.creator.pubkey(), w.treasury, w.referrer] {
        set_ata(&mut w.svm, &w.usdc, &owner, 0);
    }
    (w, k)
}

/// A new funded wallet with token accounts for USDC, the index token and both legs.
pub fn new_holder(w: &mut World, k: &PotKeys, usdc: u64) -> Keypair {
    let kp = Keypair::new();
    w.svm.airdrop(&kp.pubkey(), 10_000_000_000).unwrap();
    let owner = kp.pubkey();
    set_ata(&mut w.svm, &w.usdc, &owner, usdc);
    for mint in [k.index_mint, w.sol, w.jup] {
        set_ata(&mut w.svm, &mint, &owner, 0);
    }
    kp
}

/// The keeper's token accounts: no USDC, `sol` lamports and `jup` base units to deliver.
pub fn fund_keeper(w: &mut World, sol: u64, jup: u64) -> (Pubkey, Pubkey) {
    let keeper = w.keeper.pubkey();
    set_ata(&mut w.svm, &w.usdc, &keeper, 0);
    (set_ata(&mut w.svm, &w.sol, &keeper, sol), set_ata(&mut w.svm, &w.jup, &keeper, jup))
}

/// Overwrite the Pot's vault balances (cash in micro-USDC, SOL in lamports, JUP in base units).
pub fn set_vaults(w: &mut World, k: &PotKeys, cash: u64, sol: u64, jup: u64) {
    set_ata(&mut w.svm, &w.usdc, &k.pot, cash);
    set_ata(&mut w.svm, &w.sol, &k.pot, sol);
    set_ata(&mut w.svm, &w.jup, &k.pot, jup);
}

pub fn mint_supply(svm: &LiteSVM, mint: &Pubkey) -> u64 {
    let acc = svm.get_account(mint).unwrap();
    u64::from_le_bytes(acc.data[36..44].try_into().unwrap())
}

/// Value in nano-USD at the mid prices (SOL $150, JUP $1): exact integers, no rounding.
pub fn value_nano(usdc: u64, sol: u64, jup: u64) -> u128 {
    usdc as u128 * 1_000 + sol as u128 * 150 + jup as u128 * 1_000
}

pub fn wallet_value_nano(w: &World, owner: &Pubkey) -> u128 {
    value_nano(
        token_amount(&w.svm, &ata(owner, &w.usdc)),
        token_amount(&w.svm, &ata(owner, &w.sol)),
        token_amount(&w.svm, &ata(owner, &w.jup)),
    )
}

pub fn pot_value_nano(w: &World, k: &PotKeys) -> u128 {
    value_nano(token_amount(&w.svm, &k.cash_vault), token_amount(&w.svm, &k.sol_vault), token_amount(&w.svm, &k.jup_vault))
}

/// Events of type `E` emitted in a transaction's logs (`Program data: <base64>`).
pub fn events<E: anchor_lang::Discriminator + anchor_lang::AnchorDeserialize>(logs: &[String]) -> Vec<E> {
    logs.iter()
        .filter_map(|l| l.strip_prefix("Program data: "))
        .map(base64_decode)
        .filter(|d| d.len() >= 8 && d[..8] == *E::DISCRIMINATOR)
        .map(|d| E::try_from_slice(&d[8..]).unwrap())
        .collect()
}

fn base64_decode(s: &str) -> Vec<u8> {
    let val = |c: u8| match c {
        b'A'..=b'Z' => c - b'A',
        b'a'..=b'z' => c - b'a' + 26,
        b'0'..=b'9' => c - b'0' + 52,
        b'+' => 62,
        b'/' => 63,
        _ => panic!("not base64: {c}"),
    };
    let bytes: Vec<u8> = s.bytes().filter(|&c| c != b'=').map(val).collect();
    let mut out = Vec::with_capacity(bytes.len() * 3 / 4);
    for chunk in bytes.chunks(4) {
        let mut n = 0u32;
        for (i, &b) in chunk.iter().enumerate() {
            n |= (b as u32) << (18 - 6 * i);
        }
        out.extend_from_slice(&n.to_be_bytes()[1..chunk.len()]);
    }
    out
}
