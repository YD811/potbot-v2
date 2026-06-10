# Governance Presets

One-click governance bundles surfaced in `apps/web/src/components/GovernanceSettings.tsx`
("Quick Setup"). Each preset applies a deterministic set of values; if the current
settings exactly match a bundle the preset is highlighted, otherwise the UI shows **Custom**.
Advanced controls below the presets stay fully editable.

## The three presets

| Preset | Audience | Trade level | Withdraw level | Quorum | Timelock | Max swap |
|---|---|---|---|---|---|---|
| 😎 Chill | Friends & small groups | L1 Advisory | L2 Majority | 30% | 0 | 50% |
| ⚖️ Balanced | Default communities | L2 Majority | L3 Supermajority | 50% | 24h | 20% |
| 🏛 Institutional | Serious capital | L3 Supermajority | L4 Consensus | 66% | 48h | 10% |

## On-chain field mapping

Governance levels are 0–4 integers (L0 Autocracy · L1 Advisory · L2 Majority ·
L3 Supermajority · L4 Consensus). Ratios are basis points; timelock is seconds.

| Preset | `trade_level` | `withdraw_level` | `quorum_bps` | `timelock_seconds` | `max_trade_size_bps` |
|---|---|---|---|---|---|
| 😎 Chill | 1 | 2 | 3000 | 0 | 5000 |
| ⚖️ Balanced | 2 | 3 | 5000 | 86400 | 2000 |
| 🏛 Institutional | 3 | 4 | 6600 | 172800 | 1000 |

## UI mapping (current `GovernanceSettings.tsx` fields)

The web component manages percent integers and hours, with a single approval
threshold for all binding proposals. Presets map as follows:

- `withdraw_level` → `approvalPct` (51 / 66 / 90 — L4 Consensus = 100% is clamped to the slider max of 90)
- `quorum_bps` → `quorumPct` (30 / 50 / 66)
- `timelock_seconds` → `votingWindowHours` = 24h base + timelock (24 / 48 / 72) until a dedicated timelock field ships
- `trade_level` → `riskLevel` profile (`aggressive` / `moderate` / `conservative`)
- `max_trade_size_bps` → `maxSwapPct` (50 / 20 / 10)

## Rationale

- **Trades are routine, withdrawals are existential** — every preset gates withdrawals one level stricter than trades, so day-to-day agility never weakens exit security.
- **Quorum scales with stakes** — 30% keeps small friend pots unblocked; 66% makes institutional decisions representative.
- **Timelock buys reaction time** — 0 for trusted groups; 24–48h gives serious capital a window to veto or exit before execution.
- **Max swap caps blast radius** — a single bad proposal can move at most 50/20/10% of the vault, complementing the on-chain risk-caps overlay (`max_swap_pct`, `timelock_seconds`, defensive-only mode at low HP).
