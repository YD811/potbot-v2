#!/usr/bin/env python3
"""Patch the pot_vault IDL with Phase A security-hardening surface.

Why this exists: anchor 0.30.1's IDL generation is broken on modern
toolchains (anchor-syn needs proc_macro2::Span::source_file(), removed in
rustc >= 1.85 / proc-macro2 >= 1.0.95, while the IDL temp-project resolves
fresh dependencies that require newer rustc). `anchor build --no-idl`
builds the program fine, so we patch the IDL deterministically instead.

Self-check: recomputes discriminators of entries already present in the
IDL and aborts on mismatch, proving the algorithm matches anchor's.
"""
import hashlib
import json
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "/Users/yegordo/potbot-v2/packages/sdk/src/idl/pot_vault.json"
OUT = sys.argv[2] if len(sys.argv) > 2 else SRC

idl = json.load(open(SRC))

def disc(prefix: str, name: str) -> list[int]:
    return list(hashlib.sha256(f"{prefix}:{name}".encode()).digest()[:8])

# ── self-check ──────────────────────────────────────────────────────────────
for ins in idl["instructions"]:
    assert ins["discriminator"] == disc("global", ins["name"]), f"ix disc mismatch: {ins['name']}"
for ev in idl["events"]:
    assert ev["discriminator"] == disc("event", ev["name"]), f"event disc mismatch: {ev['name']}"
for acc in idl["accounts"]:
    assert acc["discriminator"] == disc("account", acc["name"]), f"acct disc mismatch: {acc['name']}"
print(f"self-check OK: {len(idl['instructions'])} ix, {len(idl['events'])} events, {len(idl['accounts'])} accounts")

names = {i["name"] for i in idl["instructions"]}

def add_ix(name, accounts, args, docs=None):
    if name in names:
        return
    entry = {"name": name, "discriminator": disc("global", name), "accounts": accounts, "args": args}
    if docs:
        entry["docs"] = docs
    idl["instructions"].append(entry)

POT_W = {"name": "pot", "writable": True}
AUTH_S = {"name": "authority", "signer": True}
SIGNER = {"name": "signer", "signer": True}

# ── new instructions ────────────────────────────────────────────────────────
add_ix("set_sentinel", [POT_W, AUTH_S],
       [{"name": "new_sentinel", "type": {"option": "pubkey"}}],
       ["Assign or clear the sentinel/guardian wallet. The sentinel can freeze the pot and cancel proposals but can NEVER move funds."])
add_ix("freeze_pot", [POT_W, SIGNER], [],
       ["Freeze the pot (sentinel or authority). Blocks deposits, proposal execution, swaps and strategy creation. Member withdrawals stay open."])
add_ix("unfreeze_pot", [POT_W, SIGNER], [],
       ["Unfreeze the pot — authority only."])
add_ix("cancel_proposal",
       [POT_W, {"name": "proposal", "writable": True}, SIGNER], [],
       ["Cancel an Active or Passed proposal (sentinel, authority or proposer)."])
add_ix("set_allowed_programs", [POT_W, AUTH_S],
       [{"name": "args", "type": {"defined": {"name": "SetAllowedProgramsArgs"}}}],
       ["Set the program-id allowlist for external CPI targets."])
add_ix("set_risk_timelock", [POT_W, AUTH_S],
       [{"name": "args", "type": {"defined": {"name": "SetRiskTimelockArgs"}}}],
       ["Configure the risk-param timelock and per-asset exposure cap."])
add_ix("apply_pending_params", [POT_W, {"name": "cranker", "signer": True}], [],
       ["Permissionless crank: apply a staged risky-param change once its timelock has elapsed."])
add_ix("fund_fee_reserve",
       [POT_W, {"name": "authority", "writable": True, "signer": True},
        {"name": "system_program", "address": "11111111111111111111111111111111"}],
       [{"name": "args", "type": {"defined": {"name": "FundFeeReserveArgs"}}}],
       ["Fund the pot's keeper-gas reserve."])
add_ix("set_oracle_config", [POT_W, AUTH_S],
       [{"name": "args", "type": {"defined": {"name": "SetOracleConfigArgs"}}}],
       ["Configure the pot's oracle source, confidence bound, and swap deviation guard."])

# ── instructions missing from the stale May-2026 IDL ────────────────────────
add_ix("redeem_tokens",
       [POT_W,
        {"name": "vault", "writable": True},
        {"name": "member", "writable": True, "signer": True},
        {"name": "token_mint", "writable": True},
        {"name": "member_token_ata", "writable": True},
        {"name": "token_program", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
        {"name": "system_program", "address": "11111111111111111111111111111111"}],
       [{"name": "token_amount", "type": "u64"}],
       ["Burn SPL share-tokens and receive SOL from the vault at NAV."])
add_ix("route_to_yield",
       [POT_W,
        {"name": "vault"},
        {"name": "authority", "writable": True, "signer": True}],
       [{"name": "args", "type": {"defined": {"name": "RouteToYieldArgs"}}}],
       ["Route idle vault SOL to a yield protocol (Phase 4 stub)."])

# ── execute_proposal: optional recipient account ────────────────────────────
for ins in idl["instructions"]:
    if ins["name"] == "execute_proposal":
        acc_names = [a["name"] for a in ins["accounts"]]
        if "recipient" not in acc_names:
            ins["accounts"].insert(acc_names.index("system_program"),
                                   {"name": "recipient", "writable": True, "optional": True})

# ── PotAccount: new fields ──────────────────────────────────────────────────
NEW_POT_FIELDS = [
    {"name": "sentinel", "docs": ["Optional sentinel/guardian wallet. Can freeze the pot and cancel proposals; has NO instruction that can move funds."], "type": {"option": "pubkey"}},
    {"name": "risk_param_timelock_secs", "docs": ["Timelock (seconds) applied when a risky governance parameter is LOOSENED. 0 = disabled."], "type": "i64"},
    {"name": "pending_params", "docs": ["Staged loosening change awaiting its timelock."], "type": {"defined": {"name": "PendingRiskParams"}}},
    {"name": "allowed_programs", "docs": ["Program-id allowlist for external CPI targets. count == 0 = open mode."], "type": {"array": ["pubkey", 8]}},
    {"name": "allowed_programs_count", "type": "u8"},
    {"name": "max_asset_exposure_bps", "docs": ["Max cumulative daily spend toward one output mint, bps of vault. 0 = unlimited."], "type": "u16"},
    {"name": "per_mint_daily_spent", "docs": ["Daily spend per allowed_mints slot."], "type": {"array": ["u64", 16]}},
    {"name": "oracle_kind", "docs": ["Oracle source: 0 = Pyth, 1 = Switchboard."], "type": "u8"},
    {"name": "max_oracle_conf_bps", "docs": ["Max accepted oracle confidence interval, bps. 0 = source default."], "type": "u16"},
    {"name": "max_oracle_deviation_bps", "docs": ["Max swap-vs-oracle deviation, bps. 0 = guard disabled."], "type": "u16"},
    # ── Liquid Vaults (Phase B) — carved from reserved (128 → 117) ──
    {"name": "liquid_mode", "docs": ["deposit auto-mints SPL shares at NAV when true."], "type": "bool"},
    {"name": "withdrawal_reserve_bps", "docs": ["Target % of NAV kept liquid in SOL for instant redemptions."], "type": "u16"},
    {"name": "next_redemption_id", "docs": ["Monotonic id for RedemptionRequest PDAs."], "type": "u64"},
    {"name": "reserved", "docs": ["Forward-compat tail — carve new fields from here, never insert."], "type": {"array": ["u8", 117]}},
]
_managed = {f["name"] for f in NEW_POT_FIELDS}
for t in idl["types"]:
    if t["name"] == "PotAccount":
        # Idempotent: drop any managed fields already present (so a changed
        # size like reserved[128]→[117] is corrected on re-run), then append
        # the managed set in canonical order after the base fields.
        t["type"]["fields"] = [
            f for f in t["type"]["fields"] if f["name"] not in _managed
        ] + NEW_POT_FIELDS
    if t["name"] == "ProposalStatus":
        if not any(v["name"] == "Cancelled" for v in t["type"]["variants"]):
            t["type"]["variants"].append({"name": "Cancelled"})

# ── new types ───────────────────────────────────────────────────────────────
type_names = {t["name"] for t in idl["types"]}

def add_type(name, fields):
    if name in type_names:
        return
    idl["types"].append({"name": name, "type": {"kind": "struct", "fields": fields}})

def upsert_type(name, fields):
    """Replace the struct definition if present (keeps re-runs idempotent
    when a type gains fields), else append it."""
    for t in idl["types"]:
        if t["name"] == name:
            t["type"]["fields"] = fields
            return
    idl["types"].append({"name": name, "type": {"kind": "struct", "fields": fields}})

upsert_type("PendingRiskParams", [
    {"name": "is_pending", "type": "bool"},
    {"name": "effective_at", "type": "i64"},
    {"name": "trade_level", "type": "u8"},
    {"name": "withdraw_level", "type": "u8"},
    {"name": "max_trade_size_bps", "type": "u16"},
    {"name": "single_swap_cap_bps", "type": "u16"},
    {"name": "daily_budget_lamports", "type": "u64"},
    {"name": "risk_param_timelock_secs", "type": "i64"},
    {"name": "max_asset_exposure_bps", "type": "u16"},
])
add_type("SetAllowedProgramsArgs", [
    {"name": "programs", "type": {"vec": "pubkey"}},
])
add_type("SetRiskTimelockArgs", [
    {"name": "risk_param_timelock_secs", "type": "i64"},
    {"name": "max_asset_exposure_bps", "type": "u16"},
])
add_type("FundFeeReserveArgs", [
    {"name": "amount", "type": "u64"},
])
add_type("SetOracleConfigArgs", [
    {"name": "oracle_kind", "type": "u8"},
    {"name": "max_oracle_conf_bps", "type": "u16"},
    {"name": "max_oracle_deviation_bps", "type": "u16"},
])
add_type("OracleConfigUpdated", [
    {"name": "pot", "type": "pubkey"},
    {"name": "oracle_kind", "type": "u8"},
    {"name": "max_oracle_conf_bps", "type": "u16"},
    {"name": "max_oracle_deviation_bps", "type": "u16"},
])
# event payload types
add_type("SentinelUpdated", [
    {"name": "pot", "type": "pubkey"},
    {"name": "sentinel", "type": {"option": "pubkey"}},
])
add_type("PotFrozenEvent", [
    {"name": "pot", "type": "pubkey"},
    {"name": "by", "type": "pubkey"},
    {"name": "frozen", "type": "bool"},
])
add_type("ProposalCancelled", [
    {"name": "pot", "type": "pubkey"},
    {"name": "proposal", "type": "pubkey"},
    {"name": "proposal_id", "type": "u64"},
    {"name": "by", "type": "pubkey"},
])
add_type("AllowedProgramsUpdated", [
    {"name": "pot", "type": "pubkey"},
    {"name": "count", "type": "u8"},
])
add_type("PendingParamsApplied", [
    {"name": "pot", "type": "pubkey"},
    {"name": "applied_at", "type": "i64"},
])

add_type("RouteToYieldArgs", [
    {"name": "amount_lamports", "type": "u64"},
    {"name": "yield_target", "type": {"defined": {"name": "YieldRouteTarget"}}},
])
if "YieldRouteTarget" not in type_names:
    idl["types"].append({"name": "YieldRouteTarget", "type": {"kind": "enum", "variants": [
        {"name": "Kamino"}, {"name": "MeteoraStable"}, {"name": "MeteoraDynamic"}]}})
add_type("YieldRouted", [
    {"name": "pot", "type": "pubkey"},
    {"name": "target", "type": {"defined": {"name": "YieldRouteTarget"}}},
    {"name": "amount", "type": "u64"},
    {"name": "executed", "type": "bool"},
    {"name": "timestamp", "type": "i64"},
])

# ── events ──────────────────────────────────────────────────────────────────
event_names = {e["name"] for e in idl["events"]}
for ev in ["SentinelUpdated", "PotFrozenEvent", "ProposalCancelled",
           "AllowedProgramsUpdated", "PendingParamsApplied", "YieldRouted",
           "OracleConfigUpdated"]:
    if ev not in event_names:
        idl["events"].append({"name": ev, "discriminator": disc("event", ev)})

# ── errors ──────────────────────────────────────────────────────────────────
# The May-2026 IDL ends at 6062 MathOverflow; the program enum continues with
# the redeem_tokens block, then the Phase A block. Codes are positional.
TAIL_ERRORS = [
    ("InvalidBurnAmount", "Burn amount must be > 0"),
    ("InsufficientReserve", "Redemption would violate 20% reserve guard"),
    ("RedemptionPausedWhilePotPaused", "Cannot redeem while pot is paused"),
    ("RedemptionInsufficientVault", "Insufficient vault balance for redemption"),
    ("YieldTargetNoneNotRoutable", "YieldTarget None is not routable"),
    ("WithdrawalReserveBreached", "Redemption exceeds 80% vault liquidity reserve"),
    ("PotPaused", "Pot is paused -- redemptions blocked"),
    ("InvalidAmount", "Amount must be greater than zero"),
    ("NotSentinelOrAuthority", "Signer is neither the pot authority nor the sentinel"),
    ("PotFrozen", "Pot is frozen — this action is blocked until unfreeze"),
    ("SentinelCannotUnfreeze", "Only the pot authority can unfreeze the pot"),
    ("ProposalNotCancellable", "Proposal is not in a cancellable state"),
    ("RecipientMismatch", "Recipient account does not match the proposal beneficiary"),
    ("RecipientMissing", "Recipient account is required for this proposal type"),
    ("PendingChangeNotReady", "Pending parameter change has not reached effective_at yet"),
    ("NoPendingChange", "No pending parameter change staged for this pot"),
    ("ProgramNotAllowed", "Program is not in the pot's protocol allowlist"),
    ("AssetExposureExceeded", "Daily exposure cap for this asset exceeded"),
    ("OracleConfidenceTooLow", "Oracle confidence interval wider than the configured bound"),
    ("OracleDeviationExceeded", "Realised swap price deviates from the oracle mid beyond the cap"),
    ("OracleKindUnsupported", "Configured oracle source is not supported"),
    ("OracleAccountMissing", "Oracle price account required for this guarded action"),
    ("OracleGuardUnavailable", "Oracle deviation guard needs two-feed pricing (Phase B); not enableable yet"),
    ("NotLiquidMode", "Pot is not in liquid (SPL share) mode"),
    ("NavLegAccountInvalid", "A required token-leg account or its oracle feed is missing/mismatched"),
    ("RedemptionNotQueued", "Redemption can be paid instantly — use redeem_tokens, not the queue"),
    ("RedemptionNotPending", "Redemption request is not in a Pending state"),
    ("RedemptionStillIlliquid", "Liquid vault still lacks the SOL to fulfil this redemption"),
    ("InvalidReserveBps", "Withdrawal reserve bps must be <= 10000"),
]
have = {e["name"] for e in idl["errors"]}
next_code = max(e["code"] for e in idl["errors"]) + 1
for name, msg in TAIL_ERRORS:
    if name not in have:
        idl["errors"].append({"code": next_code, "name": name, "msg": msg})
        next_code += 1

json.dump(idl, open(OUT, "w"), indent=2)
print(f"patched → {OUT}: {len(idl['instructions'])} ix, {len(idl['events'])} events, "
      f"{len(idl['types'])} types, {len(idl['errors'])} errors")
