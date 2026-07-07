<div align="center">

# POTBOT

### Infrastructure for on-chain vaults — think S&P 500, but on the blockchain.

**Drop in USDC → receive a liquid index token → stay liquid while your capital works.**

`POT` = Programmable On-chain Treasury  ·  `BOT` = Blockchain Orchestration Tool

[potbot.fun](https://potbot.fun) · [docs](https://potbot.fun/docs) · [@PotBot_sol](https://twitter.com/PotBot_sol)

[![CI](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?style=flat-square)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.30.1-blue?style=flat-square)](https://anchor-lang.com)
[![MCP](https://img.shields.io/badge/MCP-native-14F195?style=flat-square)](https://www.npmjs.com/package/@potbot/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## What is POTBOT

POTBOT is a container for tokenized assets. You put assets into a **POT**, connect it to
DeFi protocols to generate yield, and when you invest you receive a liquid **index token
(iPOT)** that represents the vault's contents.

That token isn't just a receipt — it's composable across the ecosystem. Use it as
collateral in lending protocols, deposit the borrowed stables back into the POT, and you
have a **looping economy** that compounds exposure and yield. In short: we make
diversified, income-generating baskets of crypto assets as liquid and reusable as a
single token.

The vault is a Solana program account from day one — no custodian, no operator, no
shared seed phrase. Every move is signed on-chain.

## How the index vault works

```
Investor                        Program (vault PDA)                    Keeper
   │ deposit USDC ──────────▶  mint iPOT at NAV  ◀──── NAV snapshot (60s)
   │ receive iPOT               USDC → idle buffer (5–10%)              guarded by
   │                            │                                       staleness +
   │                            ▼ deploy_to_strategy (capped)           deviation caps
   │                            index legs per target weights
   │                            45% Stable · 35% Staked SOL · 20% RWA
   │                            → Kamino lend / Meteora DLMM
   │
   │ redeem iPOT ───────────▶  instant from buffer, else queue → keeper settles
   │
   └── loop (Phase 2): iPOT as collateral → borrow stables → redeposit
       profitable ⟺ basket yield ≥ borrow rate      net APY ≈ y + L·(y − b)
```

- **Index pricing** — `price/share = NAV / supply`. The keeper writes NAV on-chain every
  minute; the program enforces a staleness bound and a deviation cap, so a compromised
  keeper can neither mint itself cheap shares nor drain via redeem. Deposits and
  redemptions move NAV and supply proportionally — only basket repricing moves the
  share price.
- **Instant exits** — an idle buffer (5–10% of NAV) always stays liquid; bigger
  redemptions queue, escrow immediately, and settle at settlement NAV. Exits are never
  blockable — not by pause, not by freeze.
- **Propose/crank, never custody** — the keeper is an allowlisted crank identity with no
  instruction that can pay any wallet except a redeeming member's own.
- **Safety rails** — global asset allowlist, TVL + per-deposit caps, idle-buffer floor,
  program-wide 5% slippage ceiling, sentinel/guardian pause, risk-param timelock.

Deep dive: [`docs/architecture/index-vault.md`](docs/architecture/index-vault.md) —
including the NAV math and "Looping: when leverage is free".

## Beyond the flagship: any community, any basket

The same engine powers community treasuries: creator funds, AI vaults, startup
syndicates, friend-group ETFs, investment clubs. Every pot gets:

- **On-chain governance in the swap instruction itself** — five levels (Autocracy L0 →
  Consensus L4), quorum, risk caps, one-click presets (😎 ⚖️ 🏛). Not a generic
  multisig queue: `execute_swap` enforces `AdminDirect` / `Proposal` / `StrategyTrigger`
  mode at the program level.
- **AI orchestration (BOT)** — the base BOT surfaces candidate proposals; every member
  can register a **Personal AI Voter** (`MemberDelegate` + `vote_as_delegate`) as a
  revocable on-chain voting delegate. Keeper automation runs stop-loss / take-profit /
  trailing-stop strategy slots.
- **MCP-native** — [`@potbot/mcp`](https://www.npmjs.com/package/@potbot/mcp) (18 tools):
  Claude, Cursor or any agent can list, propose, vote, and execute over one `npx` command.
- **Solana Blinks** — every proposal is a vote-able URL that renders directly in X.
- **Money Tree lifecycle** — pots evolve 🌱→🌴 as AUM/members/volume grow, with an HP
  health system and defensive-only mode at low HP.

Monetization: subscriptions ([potbot.fun/pricing](https://potbot.fun/pricing)) + protocol
fees (creation fee live on devnet; swap/performance fee switch ships with mainnet). No
token, no airdrop farming.

## Quick start

```bash
git clone https://github.com/YD811/potbot-v2.git
cd potbot-v2
npm install

# DApp (mock mode works out of the box)
npm run dev --workspace=apps/web        # → http://localhost:3000

# Anchor program — build + full test suite on a local validator
cd packages/program
anchor build --no-idl                   # IDL is patched via scripts/patch_idl*.py
solana-test-validator --reset \
  --bpf-program GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK target/deploy/pot_vault.so &
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json \
  npx ts-mocha -p ./tsconfig.json -t 1000000 'tests/**/*.ts'   # 30 passing

# Talk to the live MCP server from any AI client
npx @potbot/mcp
```

Set `NEXT_PUBLIC_PRIVY_APP_ID` to enable email / Google / Twitter / LinkedIn login
(Normie mode); the Phantom flow works without it. Full setup:
[`docs/operations/development.md`](docs/operations/development.md).

## Repository layout

```
potbot-v2/
├── apps/
│   ├── web/              Next.js 14 DApp (+ /docs page) · mock + on-chain modes
│   ├── keeper/           Crank service — NAV snapshots, redeem settler, strategy triggers
│   ├── api/              Hono backend — prices, PnL/APY, analytics
│   ├── potbot-mcp/       MCP server published as @potbot/mcp
│   └── bot/              Telegram frontend
├── packages/
│   ├── program/          Anchor programs (Rust) — pot_vault, pot_duel
│   ├── sdk/              TypeScript SDK (@potbot/sdk) — PDAs, IDL, tx builders
│   └── ui/               Shared React components (@potbot/ui)
├── docs/                 Architecture, operations, integrations
├── scripts/              Devnet utilities
└── supabase/             Off-chain index migrations
```

## Status

🟢 live · 🟡 devnet · 🔵 next up

| Layer | Status |
|---|---|
| `pot_vault` program — vaults, governance L0–L4, Jupiter v6 swap CPI, security rails (sentinel, risk-param timelock, CPI allowlist, exposure caps) | 🟡 devnet |
| **Index vault** — iPOT mint/redeem at NAV, StrategyConfig weights + caps, global allowlist, NAV staleness/deviation guards, instant + queued redemptions, deploy/withdraw seam · 30 tests green | 🟡 built (pending devnet redeploy) |
| Keeper — NAV crank (60s) + redeem settler + stop/take/trailing triggers | 🟡 devnet |
| DApp potbot.fun — crypto + Normie mode (Privy), mock demo, flagship pin, `/docs` | 🟢 live |
| `@potbot/mcp` (18 tools) · Solana Blinks · Squads v4 · Helius indexer · PWA | 🟢 live |
| Personal AI Voters · Money Tree lifecycle · strategy slots · `pot_duel` | 🟡 devnet |
| Kamino / Meteora CPI adapters · looping layer (interfaces shipped, behind flag) | 🔵 Phase 2 |
| Mainnet deploy — runbook ready, gated on devnet e2e + founder sign-off | 🔵 [`runbook`](docs/operations/index-mainnet-runbook.md) |

Devnet program: `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK` · full feature map:
[potbot.fun/roadmap](https://potbot.fun/roadmap)

## Documentation

| | |
|---|---|
| [Index vault](docs/architecture/index-vault.md) | iPOT token, NAV math, yield routing, looping economics |
| [Architecture overview](docs/architecture/overview.md) | System design, on-chain accounts, data flow |
| [Program reference](docs/architecture/program.md) | Instructions, PDAs, governance accounts |
| [Governance model](docs/architecture/governance.md) | L0–L4 levels, quorum, risk caps |
| [Index keeper runbook](docs/operations/index-keeper.md) | NAV crank, settler, key rotation, kill switch |
| [Mainnet runbook](docs/operations/index-mainnet-runbook.md) | Launch gates + open decisions |
| [Local development](docs/operations/development.md) | Setup, commands, troubleshooting |
| [MCP integration](docs/integrations/mcp.md) | AI-agent integration guide |
| [Security policy](SECURITY.md) | Responsible disclosure |
| [Contributing](CONTRIBUTING.md) | How to propose changes |

## License

MIT © 2026 Y-DAO Amsterdam.
