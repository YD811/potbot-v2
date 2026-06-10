# Governance System

PotBot's governance is **share-weighted** — members with more skin in the game have more voting power. Every material action in a POT (trades, withdrawals, strategy changes, budget grants) can be gated behind a configurable approval threshold, and each member can optionally delegate voting to a personal AI agent that follows their own rules.

See also [OVERVIEW.md](OVERVIEW.md) for the full product context.

---

## Governance Levels

Each POT configures two independent governance levels at creation:
- **Trade governance** — for swap / strategy proposals
- **Withdraw governance** — for large withdrawals and budget grants

| Level | Name | How it works |
|---|---|---|
| **L0** | Autocracy | Owner executes directly, no vote needed |
| **L1** | Advisory | Owner proposes; members can veto with >25% no-votes |
| **L2** | Majority | Must reach >50% yes-votes by share weight |
| **L3** | Supermajority | Must reach >66% yes-votes by share weight |
| **L4** | Consensus | 100% agreement required |

Most vaults will use **L2 Majority** as a balance of speed and democracy. Institutional pots and family offices typically pick **L3 Supermajority** + the optional timelock.

The create flow ships three one-click presets — 😎 **Chill**, ⚖️ **Balanced**, 🏛 **Institutional** — that bundle trade/withdraw levels, quorum, timelock and max-swap caps. Full mapping in [`docs/product/governance-presets.md`](../product/governance-presets.md).

### Optional risk caps (stackable on any level)

Set in `GovernanceConfig` at pot creation, changeable later by governance proposal:

- `max_swap_pct` — no single swap may exceed X% of vault balance (blocks "swap 100% of the pot into $NEWCOIN")
- `max_budget_grant_pct` — no budget grant may exceed X% of vault balance
- `require_admin_cosign` — proposals above a configurable threshold require the authority to co-sign before execution (does not override the vote; just adds a second signature gate)
- `timelock_seconds` — after a proposal passes, execution is delayed by N seconds (cooling-off / unwind window)

### Risk-param timelock (asymmetric)

On top of the per-proposal timelock, the pot can configure `risk_param_timelock_secs` — a delay that applies to changes of the risk parameters themselves (approval levels, swap-size caps, daily budget, the timelock itself):

- **Tightening applies instantly** — raising approval levels or lowering caps never waits.
- **Loosening is staged** in `pot.pending_params` and only takes effect after the delay, via the **permissionless** `apply_pending_params` instruction. Anyone can crank it; nobody can fast-track it.

This closes the "vote once to remove the guardrails, then drain" pattern: members always get the full timelock window to exit before looser rules take effect. Semantics in [`program.md` § Security layer](program.md#security-layer-sentinel--freeze--timelocks--allowlists).

### Sentinel / guardian

The pot authority can register one **sentinel** wallet (`set_sentinel`) — a circuit-breaker that can `freeze_pot` (sentinel or authority; only the authority can unfreeze) and `cancel_proposal` (sentinel, authority, or the proposer), but has **no instruction that can move funds**. A frozen pot blocks deposits, proposal execution, swaps and strategy creation — while member `withdraw` and `redeem_tokens` stay open unconditionally. Cancelled proposals land in the terminal `Cancelled` status.

---

## Voting Mechanics

### Share-weighted votes

```
Member A: 500 shares → votes YES  → contributes 500 yes-weight
Member B: 300 shares → votes NO   → contributes 300 no-weight
Member C: 200 shares → abstains  → no contribution

Total shares: 1000
Yes weight:   500 / 1000 = 50%

At L2 (>50%), this proposal would NOT pass — needs > 50%, not = 50%.
At L3 (>66%), also does not pass.
```

### Auto-resolution

When a member casts the deciding vote:
- **Quorum reached** → proposal status flips to `Passed` in the same transaction
- **Veto threshold reached** → proposal status flips to `Rejected`
- **No auto-execution** for swap proposals (requires explicit `execute_proposal` call with Jupiter accounts)
- **Auto-execution** for governance updates (no external CPIs needed)
- **Timelock respected** — if `timelock_seconds > 0`, `execute_proposal` errors with `TimelockActive` until the window passes

### Proposal lifecycle

```
create_proposal()
    │
    ▼
  Active ──── vote() calls ────▶ Passed ──── [timelock wait] ──── execute_proposal() ──▶ Executed
    │                               │
    │                           Rejected
    │
    ├─── expires_at reached ──▶ Rejected (permissionless close)
    │
    └─── cancel_proposal() ───▶ Cancelled (terminal — sentinel, authority, or proposer;
                                 also possible from Passed, before execution)
```

---

## Personal AI Voters

A unique feature that makes PotBot governance scale: **each member can register a personal AI agent wallet to vote on their behalf**, according to rules the member defines.

### Why

On most DAOs, governance dies of participation rot — most members never read the proposal, never vote, quorum is never reached, and a handful of whales decide everything. Personal AI voters fix this:

- A sophisticated voting policy (*"Only YES on swaps under 10% of vault"*, *"NO on anything that touches stablecoins"*) can be expressed in plain English, saved once, and reused on every proposal
- The AI reads proposal context and casts the vote on behalf of the member, 24/7
- The member stays fully in control: they can override, update, or revoke the delegation at any time
- Every AI vote is signed on-chain by the delegate wallet, with the member's rules URI in the event log — fully auditable

### How it works on-chain

1. Member calls `delegate_vote` on the `pot_vault` program, passing:
   - `delegate: Pubkey` — the AI agent wallet
   - `rules_uri: String` — URI to the rule set (IPFS / Arweave / https)
   - `revocable_after: i64` — earliest revocation timestamp (usually `0`)
2. The program creates a `VoterDelegationAccount` PDA at `["voter", pot, member]`
3. The program updates `member.voter_delegate = Some(delegate)`
4. When a proposal is created, the delegate wallet can call `vote` — the program checks that the signer matches `member.voter_delegate` and counts the vote at `member.shares` weight
5. Member can call `revoke_delegation` at any time after `revocable_after` to close the PDA and reset `member.voter_delegate = None`

### Rule templates (off-chain, enforced by the AI itself)

PotBot ships a set of voting rule presets. These live in the PotBot MCP server — the on-chain program only stores the pointer (`rules_uri`) and trusts the AI to follow it. Misbehaving AIs can be detected by anyone reading the rules + the on-chain votes, and the member can revoke instantly.

- **Conservative** — YES only on proposals below a configurable swap-size threshold; NO on anything that increases leverage
- **Aggressive** — YES on any swap that increases risk-on exposure; NO on stablecoin conversions
- **Yield-only** — YES only on `UpdateStrategy` proposals for yield sources
- **Copy-Alice** — copy another member's votes (the "Alice" wallet); abstain if Alice hasn't voted yet
- **Custom** — free-form natural language rule, evaluated by a PotBot-hosted LLM

### Trust model

The on-chain program never verifies that the AI followed the rules — that's a client-side / social problem. What the program guarantees:

- The delegate wallet is *exactly* the one the member registered
- Every delegated vote emits an event with the `rules_uri` and a brief `reason` string
- Delegation is scoped per-pot; there is no "global" delegation
- Revocation is always possible after `revocable_after`

---

## Money Tree Health × governance

When a pot's Money Tree takes damage (see [OVERVIEW § Money Tree — Levels, Rules, Health](OVERVIEW.md#money-tree--levels-rules-health)), governance rules tighten automatically to prevent members from "buying the dip with 100% of the vault" when the vault is already bleeding.

| Health | Mode | Governance impact |
|---|---|---|
| 90–100 | 🟢 Thriving | Normal rules |
| 50–89  | 🟡 Wilting | Normal rules + warning banner on all active proposals |
| 10–49  | 🟠 Sickly | New proposals are stamped `risk_class = 1` if they increase risk exposure; quorum requirement is silently bumped one level higher (L2 → L3) |
| 1–9    | 🔴 Dying | Only defensive proposals (withdraw to stables, convert to SOL, exit yield strategies) can be passed. Risk-increasing proposals error with `DefensiveOnly` at `create_proposal` time |
| 0      | ☠️ Dead | All proposals blocked except `Resurrect` |

These adjustments are enforced by the `pot_vault` program, not by the frontend — they can't be bypassed by calling the RPC directly.

---

## Proposal Actions

### ExecuteSwap

The most common action. Members vote to swap some of the vault's SOL into another token.

```
Proposal: "Swap 10 SOL → BONK"
  token_in:       SOL
  token_out:      BONK mint address
  amount_in:      10_000_000_000 (10 SOL in lamports)
  min_amount_out: 1_000_000 (slippage protection)
```

After passing (and after the optional timelock), anyone can call `execute_proposal` which CPIs into Jupiter v6 with the vault's funds.

### UpdateGovernance

Change the governance levels for trades or withdrawals.

```
Proposal: "Increase trade governance from L2 to L3"
  trade_level:    3
  withdraw_level: 2 (unchanged)
```

This proposal is subject to the *current* governance level — so changing from L2 to L4 requires a majority vote first.

### UpdateStrategy

Change the yield strategy for idle capital.

```
Proposal: "Switch from Conservative (Kamino) to Aggressive (Drift)"
  strategy: Aggressive
```

### BudgetGrant

Transfer SOL from the vault to an external recipient for a defined purpose (marketing, grants, team payments).

```
Proposal: "[BUDGET GRANT] 5 SOL → wallet.sol for 30d · marketing campaign"
  recipient: wallet.sol
  amount:    5_000_000_000
  purpose:   "Marketing Q3 2026"
```

Subject to `max_budget_grant_pct` cap if set. On execution the payout goes to the **beneficiary recorded in the proposal** via a seeds-signed vault transfer — the executor only cranks the instruction and must pass a `recipient` account matching the beneficiary (`RecipientMismatch` otherwise).

### Custom

Arbitrary byte payload for future instruction types (POT Duels challenge acceptance, NFT minting, resurrection seed round, etc.).

---

## UI Flow

### Creating a proposal (Swap tab)

1. Member selects token pair and amount
2. Clicks "Propose Swap"
3. If the pot is in Sickly or Dying mode, UI warns this is a risk-increasing proposal
4. `createProposal()` is called → transaction signed → proposal appears in Governance tab
5. All members see it with vote bars at 0%

### Voting

1. Member opens Governance tab
2. Sees active proposals with current vote distribution
3. Option A — vote manually (clicks "Yes" or "No")
4. Option B — their personal AI voter already cast a vote (shown with a 🤖 badge and the rule that triggered)
5. If quorum reached → status changes to Passed / Rejected immediately
6. "Execute" button appears for Passed proposals (disabled during timelock)

### Governance levels in the UI

Displayed as badges on POT cards:
- `L0` / `L1` / `L2` / `L3` / `L4` next to a ⚖️ icon
- Risk caps shown on the pot detail page (e.g. "Max swap: 20% · Timelock: 24h")
- Full names shown in POT detail → Overview tab

### Personal AI Voter setup

1. Member opens "My AI Voter" on the pot detail page
2. Picks a template or writes custom rules
3. Clicks "Generate delegate wallet" — PotBot creates a new keypair for the delegate (stored encrypted client-side) or imports an existing one
4. Member signs `delegate_vote` transaction on-chain
5. From that moment, the delegate wallet can vote; member can revoke at any time

---

## Design Trade-offs

**Why share-weighted and not 1-member-1-vote?**
Members with more SOL at risk should have more say. 1M1V is vulnerable to Sybil attacks (split 1 SOL across 100 wallets to get 100 votes).

**Why configurable per action type?**
A DAO might want consensus for large trades (L4) but majority for governance updates (L2). Mixing levels gives flexibility.

**Why optional timelocks?**
Some pots want sub-second execution (traders); others need a 24h cooldown before funds move (family offices). Making it config rather than mandated keeps both use cases native to the protocol.

**Why per-pot delegation instead of global?**
A user might want a Conservative AI on their main pot and an Aggressive AI on their degen pot. Per-pot delegation also dramatically reduces blast radius if a delegate wallet is compromised.

**Why not slash delegates for voting against the rules?**
Slashing requires on-chain rule evaluation, which requires rules to be expressible in Rust. Plain-English rules interpreted by an LLM cannot be slashed deterministically. Instead we rely on social pressure + easy revocation — if a delegate votes badly, revoke it and publish the story.

---

## PotBot v1 vs v2 — governance differences

Quick reference (full context in [OVERVIEW § PotBot v1 vs v2](OVERVIEW.md#potbot-v1-vs-v2)):

- **v1** (Telegram bot) — governance was in-chat polls, off-chain tallying, bot-managed execution
- **v2** (this program) — governance is on-chain proposals + on-chain votes + Personal AI Voters

The two products are independent and do not share governance state. A "pot" in v1 is a different entity than a "pot" in v2.
