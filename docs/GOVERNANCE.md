# Governance System

PotBot's governance is **share-weighted** — members with more skin in the game have more voting power. Every material action in a POT (trades, withdrawals, strategy changes) can be gated behind a configurable approval threshold.

---

## Governance Levels

Each POT configures two independent governance levels at creation:
- **Trade governance** — for swap proposals
- **Withdraw governance** — for large withdrawals

| Level | Name | How it works |
|---|---|---|
| **L0** | Autocracy | Owner executes directly, no vote needed |
| **L1** | Advisory | Owner proposes; members can veto with >25% no-votes |
| **L2** | Majority | Must reach >50% yes-votes by share weight |
| **L3** | Supermajority | Must reach >66% yes-votes by share weight |
| **L4** | Consensus | 100% agreement required |

Most vaults will use **L2 Majority** as a balance of speed and democracy.

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

### Proposal lifecycle

```
create_proposal()
    │
    ▼
  Active ──── vote() calls ────▶ Passed ──── execute_proposal() ──▶ Executed
    │                               │
    │                           Rejected
    │
    └─── expires_at reached ──▶ Rejected (permissionless close)
```

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

After passing, anyone can call `execute_proposal` which CPIs into Jupiter v6 with the vault's funds.

### UpdateGovernance

Change the governance levels for trades or withdrawals.

```
Proposal: "Increase trade governance from L2 to L3"
  trade_level:    3
  withdraw_level: 2 (unchanged)
```

This proposal itself is subject to the *current* governance level — so changing from L2 to L4 requires a majority vote first.

### UpdateStrategy

Change the yield strategy for idle capital.

```
Proposal: "Switch from Conservative (Kamino) to Aggressive (Drift)"
  strategy: Aggressive
```

### Custom

Arbitrary byte payload for future instruction types (POT Duels challenge acceptance, NFT minting, etc.).

---

## UI Flow

### Creating a proposal (Swap tab)

1. Member selects token pair and amount
2. Clicks "Propose Swap"
3. `createProposal()` is called → transaction signed → proposal appears in Governance tab
4. All members see it with vote bars at 0%

### Voting

1. Member opens Governance tab
2. Sees active proposals with current vote distribution
3. Clicks "Yes" or "No"
4. If quorum reached → status changes to Passed / Rejected immediately
5. "Execute" button appears for Passed proposals

### Governance levels in the UI

Displayed as badges on POT cards:
- `L0` / `L1` / `L2` / `L3` / `L4` next to a ⚖️ icon
- Full names shown in POT detail → Overview tab

---

## Design Trade-offs

**Why share-weighted and not 1-member-1-vote?**
Members with more SOL at risk should have more say. 1M1V is vulnerable to Sybil attacks (split 1 SOL across 100 wallets to get 100 votes).

**Why configurable per action type?**
A DAO might want consensus for large trades (L4) but majority for governance updates (L2). Mixing levels gives flexibility.

**Why not time-locked proposals by default?**
In v1, proposals expire after 7 days. Time locks on execution will be added in v2 as an optional config parameter.
