#!/usr/bin/env python3
"""Patch the pot_vault IDL with the index-vault (flagship POT-1) surface.

Companion to patch_idl.py (same rationale: anchor 0.30.1 IDL generation is
broken on modern toolchains, so IDL changes are applied deterministically).
Run AFTER patch_idl.py. Idempotent.

Adds:
- 12 instructions: init_allowlist, set_allowlist, init_strategy_config,
  update_strategy_config, set_strategy_paused, update_nav_snapshot,
  deposit_base, redeem_instant, request_redeem, settle_redeem,
  cancel_redeem, deploy_to_strategy, withdraw_from_strategy
- 4 accounts: StrategyConfig, TokenAllowlist, StrategyPosition, RedeemRequest
- types: WeightEntry, RouteKind, TokenClass, AllowedToken, NavSnapshot,
  RedeemStatus, InitStrategyConfigArgs, UpdateStrategyConfigArgs
- PotAccount tail carve: index_mint / is_flagship / nav_snapshot, reserved 128→70
- renames the legacy plain type StrategyConfig → LegacyStrategyConfig
  (mirrors the Rust rename; no discriminator impact — it is not an account)
- 15 new error codes (positional, continuing the enum)

Usage: patch_idl_index.py [src.json] [out.json]
"""
import hashlib
import json
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "packages/sdk/src/idl/pot_vault.json"
OUT = sys.argv[2] if len(sys.argv) > 2 else SRC

idl = json.load(open(SRC))

def disc(prefix: str, name: str) -> list[int]:
    return list(hashlib.sha256(f"{prefix}:{name}".encode()).digest()[:8])

# ── self-check ──────────────────────────────────────────────────────────────
for ins in idl["instructions"]:
    assert ins["discriminator"] == disc("global", ins["name"]), f"ix disc mismatch: {ins['name']}"
for acc in idl["accounts"]:
    assert acc["discriminator"] == disc("account", acc["name"]), f"acct disc mismatch: {acc['name']}"
print(f"self-check OK: {len(idl['instructions'])} ix, {len(idl['accounts'])} accounts")

# ── legacy rename: StrategyConfig (plain struct) → LegacyStrategyConfig ─────
def rename_type_refs(node, old, new):
    if isinstance(node, dict):
        if node.get("defined", {}) if isinstance(node.get("defined"), dict) else None:
            pass
        for k, v in node.items():
            if k == "defined" and isinstance(v, dict) and v.get("name") == old:
                v["name"] = new
            else:
                rename_type_refs(v, old, new)
    elif isinstance(node, list):
        for item in node:
            rename_type_refs(item, old, new)

legacy_is_plain = any(
    t["name"] == "StrategyConfig"
    and {f["name"] for f in t["type"].get("fields", [])} >= {"risk_level", "max_swap_pct"}
    for t in idl["types"]
)
if legacy_is_plain:
    for t in idl["types"]:
        if t["name"] == "StrategyConfig":
            t["name"] = "LegacyStrategyConfig"
    rename_type_refs(idl["instructions"], "StrategyConfig", "LegacyStrategyConfig")
    rename_type_refs(idl["types"], "StrategyConfig", "LegacyStrategyConfig")
    print("renamed legacy StrategyConfig → LegacyStrategyConfig")

# ── PotAccount: carve the reserved tail ─────────────────────────────────────
for t in idl["types"]:
    if t["name"] == "PotAccount":
        fields = t["type"]["fields"]
        names_ = [f["name"] for f in fields]
        if "index_mint" not in names_:
            reserved = next(f for f in fields if f["name"] == "reserved")
            idx = fields.index(reserved)
            fields[idx:idx] = [
                {"name": "index_mint", "docs": ["SPL mint of the pot's liquid index token (iPOT*). Default = index layer not initialized."], "type": "pubkey"},
                {"name": "is_flagship", "type": "bool"},
                {"name": "nav_snapshot", "docs": ["Latest keeper NAV observation (base units)."], "type": {"option": {"defined": {"name": "NavSnapshot"}}}},
            ]
            reserved["type"] = {"array": ["u8", 70]}

# ── new types ───────────────────────────────────────────────────────────────
type_names = {t["name"] for t in idl["types"]}

def add_struct(name, fields):
    if name not in type_names:
        idl["types"].append({"name": name, "type": {"kind": "struct", "fields": fields}})
        type_names.add(name)

def add_enum(name, variants):
    if name not in type_names:
        idl["types"].append({"name": name, "type": {"kind": "enum", "variants": [{"name": v} for v in variants]}})
        type_names.add(name)

add_enum("RouteKind", ["Hold", "KaminoLend", "KaminoLiquidity", "MeteoraDlmm"])
add_enum("TokenClass", ["Stable", "StakedSol", "RwaStock"])
add_enum("RedeemStatus", ["Pending", "Settled", "Cancelled"])
add_struct("WeightEntry", [
    {"name": "mint", "type": "pubkey"},
    {"name": "weight_bps", "type": "u16"},
    {"name": "route", "type": {"defined": {"name": "RouteKind"}}},
])
add_struct("AllowedToken", [
    {"name": "mint", "type": "pubkey"},
    {"name": "class", "type": {"defined": {"name": "TokenClass"}}},
])
add_struct("NavSnapshot", [
    {"name": "value_base", "type": "u64"},
    {"name": "ts", "type": "i64"},
    {"name": "slot", "type": "u64"},
])
add_struct("InitStrategyConfigArgs", [
    {"name": "keeper", "type": "pubkey"},
    {"name": "weights", "type": {"vec": {"defined": {"name": "WeightEntry"}}}},
    {"name": "band_bps", "type": "u16"},
    {"name": "max_slippage_bps", "type": "u16"},
    {"name": "idle_buffer_bps", "type": "u16"},
    {"name": "tvl_cap", "type": "u64"},
    {"name": "deposit_min", "type": "u64"},
    {"name": "deposit_max", "type": "u64"},
    {"name": "nav_staleness_slots", "type": "u64"},
    {"name": "max_nav_deviation_bps", "type": "u16"},
    {"name": "is_flagship", "type": "bool"},
])
add_struct("UpdateStrategyConfigArgs", [
    {"name": "keeper", "type": {"option": "pubkey"}},
    {"name": "weights", "type": {"option": {"vec": {"defined": {"name": "WeightEntry"}}}}},
    {"name": "band_bps", "type": {"option": "u16"}},
    {"name": "max_slippage_bps", "type": {"option": "u16"}},
    {"name": "idle_buffer_bps", "type": {"option": "u16"}},
    {"name": "tvl_cap", "type": {"option": "u64"}},
    {"name": "deposit_min", "type": {"option": "u64"}},
    {"name": "deposit_max", "type": {"option": "u64"}},
    {"name": "nav_staleness_slots", "type": {"option": "u64"}},
    {"name": "max_nav_deviation_bps", "type": {"option": "u16"}},
])
add_struct("StrategyConfig", [
    {"name": "pot", "type": "pubkey"},
    {"name": "bump", "type": "u8"},
    {"name": "base_mint", "type": "pubkey"},
    {"name": "keeper", "type": "pubkey"},
    {"name": "weights", "type": {"array": [{"defined": {"name": "WeightEntry"}}, 10]}},
    {"name": "weights_count", "type": "u8"},
    {"name": "band_bps", "type": "u16"},
    {"name": "max_slippage_bps", "type": "u16"},
    {"name": "idle_buffer_bps", "type": "u16"},
    {"name": "tvl_cap", "type": "u64"},
    {"name": "deposit_min", "type": "u64"},
    {"name": "deposit_max", "type": "u64"},
    {"name": "fee_reserved_bps", "type": "u16"},
    {"name": "nav_staleness_slots", "type": "u64"},
    {"name": "max_nav_deviation_bps", "type": "u16"},
    {"name": "paused", "type": "bool"},
    {"name": "pending_redeem_shares", "type": "u64"},
    {"name": "next_redeem_id", "type": "u64"},
    {"name": "reserved", "type": {"array": ["u8", 64]}},
])
add_struct("TokenAllowlist", [
    {"name": "authority", "type": "pubkey"},
    {"name": "bump", "type": "u8"},
    {"name": "tokens", "type": {"vec": {"defined": {"name": "AllowedToken"}}}},
    {"name": "reserved", "type": {"array": ["u8", 32]}},
])
add_struct("StrategyPosition", [
    {"name": "pot", "type": "pubkey"},
    {"name": "mint", "type": "pubkey"},
    {"name": "route", "type": {"defined": {"name": "RouteKind"}}},
    {"name": "bump", "type": "u8"},
    {"name": "deployed_base", "type": "u64"},
    {"name": "receipt_amount", "type": "u64"},
    {"name": "last_updated_ts", "type": "i64"},
    {"name": "reserved", "type": {"array": ["u8", 32]}},
])
add_struct("RedeemRequest", [
    {"name": "pot", "type": "pubkey"},
    {"name": "member", "type": "pubkey"},
    {"name": "id", "type": "u64"},
    {"name": "bump", "type": "u8"},
    {"name": "index_amount", "type": "u64"},
    {"name": "min_out_base", "type": "u64"},
    {"name": "requested_at", "type": "i64"},
    {"name": "settled_at", "type": "i64"},
    {"name": "status", "type": {"defined": {"name": "RedeemStatus"}}},
    {"name": "reserved", "type": {"array": ["u8", 16]}},
])

# ── new accounts ────────────────────────────────────────────────────────────
acct_names = {a["name"] for a in idl["accounts"]}
for acc in ["StrategyConfig", "TokenAllowlist", "StrategyPosition", "RedeemRequest"]:
    if acc not in acct_names:
        idl["accounts"].append({"name": acc, "discriminator": disc("account", acc)})

# ── new instructions ────────────────────────────────────────────────────────
names = {i["name"] for i in idl["instructions"]}

def add_ix(name, accounts, args, docs=None):
    if name in names:
        return
    entry = {"name": name, "discriminator": disc("global", name), "accounts": accounts, "args": args}
    if docs:
        entry["docs"] = docs
    idl["instructions"].append(entry)

SYS = {"name": "system_program", "address": "11111111111111111111111111111111"}
TOK = {"name": "token_program", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}
ATOK = {"name": "associated_token_program", "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"}

add_ix("init_allowlist",
       [{"name": "allowlist", "writable": True},
        {"name": "authority", "writable": True, "signer": True}, SYS],
       [{"name": "tokens", "type": {"vec": {"defined": {"name": "AllowedToken"}}}}],
       ["Bootstrap the global mint allowlist (protocol authority = signer)."])
add_ix("set_allowlist",
       [{"name": "allowlist", "writable": True},
        {"name": "authority", "signer": True}],
       [{"name": "tokens", "type": {"vec": {"defined": {"name": "AllowedToken"}}}}],
       ["Replace the global mint allowlist (authority only)."])
add_ix("init_index_mint",
       [{"name": "pot", "writable": True},
        {"name": "vault"},
        {"name": "index_mint", "writable": True},
        {"name": "authority", "writable": True, "signer": True},
        TOK, SYS],
       [],
       ["Index bootstrap step 1: create the iPOT mint (authority = vault PDA)."])
add_ix("init_strategy_config",
       [{"name": "pot", "writable": True},
        {"name": "config", "writable": True},
        {"name": "index_mint"},
        {"name": "base_mint"},
        {"name": "allowlist"},
        {"name": "authority", "writable": True, "signer": True},
        SYS],
       [{"name": "args", "type": {"defined": {"name": "InitStrategyConfigArgs"}}}],
       ["Index bootstrap step 2: StrategyConfig (weights, caps, keeper). Vault ATAs are created client-side."])
add_ix("update_strategy_config",
       [{"name": "pot"},
        {"name": "config", "writable": True},
        {"name": "allowlist"},
        {"name": "authority", "signer": True}],
       [{"name": "args", "type": {"defined": {"name": "UpdateStrategyConfigArgs"}}}],
       ["Tune launch guards / weights / keeper (pot authority only)."])
add_ix("set_strategy_paused",
       [{"name": "pot"},
        {"name": "config", "writable": True},
        {"name": "signer", "signer": True}],
       [{"name": "paused", "type": "bool"}],
       ["Pause (authority or sentinel) / unpause (authority) deposits+deploys."])
add_ix("update_nav_snapshot",
       [{"name": "pot", "writable": True},
        {"name": "config"},
        {"name": "keeper", "signer": True}],
       [{"name": "value_base", "type": "u64"}],
       ["Keeper NAV crank, guarded by monotonic slot + deviation cap."])
add_ix("deposit_base",
       [{"name": "pot", "writable": True},
        {"name": "config"},
        {"name": "vault"},
        {"name": "vault_base_ata", "writable": True},
        {"name": "index_mint", "writable": True},
        {"name": "base_mint"},
        {"name": "depositor", "writable": True, "signer": True},
        {"name": "depositor_base_ata", "writable": True},
        {"name": "depositor_index_ata", "writable": True},
        TOK, ATOK, SYS],
       [{"name": "amount_base", "type": "u64"},
        {"name": "min_shares_out", "type": "u64"}],
       ["Deposit base (USDC) → mint iPOT index tokens at NAV."])
add_ix("redeem_instant",
       [{"name": "pot", "writable": True},
        {"name": "config"},
        {"name": "vault"},
        {"name": "vault_base_ata", "writable": True},
        {"name": "index_mint", "writable": True},
        {"name": "base_mint"},
        {"name": "member", "signer": True},
        {"name": "member_index_ata", "writable": True},
        {"name": "member_base_ata", "writable": True},
        TOK],
       [{"name": "index_amount", "type": "u64"},
        {"name": "min_out_base", "type": "u64"}],
       ["Burn iPOT at NAV, paid instantly from the idle buffer."])
add_ix("request_redeem",
       [{"name": "pot"},
        {"name": "config", "writable": True},
        {"name": "vault"},
        {"name": "vault_index_ata", "writable": True},
        {"name": "index_mint"},
        {"name": "request", "writable": True},
        {"name": "member", "writable": True, "signer": True},
        {"name": "member_index_ata", "writable": True},
        TOK, SYS],
       [{"name": "index_amount", "type": "u64"},
        {"name": "min_out_base", "type": "u64"}],
       ["Queue a redemption (escrows iPOT now, prices at settlement NAV)."])
add_ix("settle_redeem",
       [{"name": "pot", "writable": True},
        {"name": "config", "writable": True},
        {"name": "vault"},
        {"name": "vault_base_ata", "writable": True},
        {"name": "vault_index_ata", "writable": True},
        {"name": "index_mint", "writable": True},
        {"name": "base_mint"},
        {"name": "request", "writable": True},
        {"name": "member", "writable": True},
        {"name": "member_base_ata", "writable": True},
        {"name": "cranker", "writable": True, "signer": True},
        TOK],
       [],
       ["Settle a queued redemption (permissionless crank)."])
add_ix("cancel_redeem",
       [{"name": "pot"},
        {"name": "config", "writable": True},
        {"name": "vault"},
        {"name": "vault_index_ata", "writable": True},
        {"name": "request", "writable": True},
        {"name": "member", "writable": True, "signer": True},
        {"name": "member_index_ata", "writable": True},
        TOK],
       [],
       ["Cancel own queued redemption; escrowed iPOT returns."])
add_ix("init_position",
       [{"name": "pot"},
        {"name": "config"},
        {"name": "vault"},
        {"name": "base_mint"},
        {"name": "leg_mint"},
        {"name": "position", "writable": True},
        {"name": "keeper", "writable": True, "signer": True},
        SYS],
       [{"name": "route", "type": {"defined": {"name": "RouteKind"}}}],
       ["Per-leg bootstrap step 1: position record (keeper or authority)."])
add_ix("init_position_vault",
       [{"name": "pot"},
        {"name": "config"},
        {"name": "vault"},
        {"name": "base_mint"},
        {"name": "leg_mint"},
        {"name": "position_vault", "writable": True},
        {"name": "keeper", "writable": True, "signer": True},
        TOK, SYS],
       [{"name": "route", "type": {"defined": {"name": "RouteKind"}}}],
       ["Per-leg bootstrap step 2: escrow token account."])
add_ix("deploy_to_strategy",
       [{"name": "pot", "writable": True},
        {"name": "config"},
        {"name": "allowlist"},
        {"name": "vault"},
        {"name": "vault_base_ata", "writable": True},
        {"name": "base_mint"},
        {"name": "leg_mint"},
        {"name": "position", "writable": True},
        {"name": "position_vault", "writable": True},
        {"name": "keeper", "writable": True, "signer": True},
        TOK],
       [{"name": "route", "type": {"defined": {"name": "RouteKind"}}},
        {"name": "amount_base", "type": "u64"}],
       ["Keeper: move idle base into a configured index leg (idle buffer preserved)."])
add_ix("withdraw_from_strategy",
       [{"name": "pot"},
        {"name": "config"},
        {"name": "vault"},
        {"name": "vault_base_ata", "writable": True},
        {"name": "base_mint"},
        {"name": "leg_mint"},
        {"name": "position", "writable": True},
        {"name": "position_vault", "writable": True},
        {"name": "keeper", "signer": True},
        TOK],
       [{"name": "route", "type": {"defined": {"name": "RouteKind"}}},
        {"name": "amount_base", "type": "u64"}],
       ["Keeper: unwind a leg back into the idle buffer (allowed even while paused)."])

# ── errors (positional — continue the enum after OracleGuardUnavailable) ────
TAIL_ERRORS = [
    ("StrategyPaused", "Strategy is paused — deposits and deploys are blocked"),
    ("WeightsMustSumTo100", "Active index weights must sum to exactly 10000 bps"),
    ("TooManyTokens", "Index composition exceeds the 10-token limit"),
    ("NavSnapshotStale", "NAV snapshot is older than the configured staleness bound"),
    ("NavDeviationTooHigh", "NAV moved more than the configured deviation cap since last snapshot"),
    ("DepositBelowMin", "Deposit is below the configured minimum"),
    ("DepositAboveCap", "Deposit is above the configured per-deposit cap"),
    ("TvlCapExceeded", "Deposit would push NAV above the TVL cap"),
    ("InsufficientIdleBuffer", "Deploy would breach the idle redemption buffer"),
    ("UnauthorizedKeeper", "Signer is not the allowlisted keeper for this pot"),
    ("RouteNotConfigured", "No route configured for this mint in the index weights"),
    ("IndexNotInitialized", "Index layer is not initialized for this pot"),
    ("RedeemNotPending", "Redeem request is not in a settleable state"),
    ("RedeemBelowMinOut", "Settlement payout is below the requester's min_out floor"),
]
have = {e["name"] for e in idl["errors"]}
next_code = max(e["code"] for e in idl["errors"]) + 1
for name, msg in TAIL_ERRORS:
    if name not in have:
        idl["errors"].append({"code": next_code, "name": name, "msg": msg})
        next_code += 1

json.dump(idl, open(OUT, "w"), indent=2)
print(f"patched → {OUT}: {len(idl['instructions'])} ix, {len(idl['accounts'])} accounts, "
      f"{len(idl['types'])} types, {len(idl['errors'])} errors")
