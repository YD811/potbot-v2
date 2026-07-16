<div align="center">

# POTBOT

### Turn yield-bearing assets into liquid, composable tokens.

**Deposit into a POT, receive a token representing your share of the underlying assets and accrued yield, and redeem it through the protocol.**

`POT` = Programmable On-chain Treasury · `BOT` = optional Blockchain Orchestration Tool

[potbot.fun](https://potbot.fun) · [@PotBot_sol](https://x.com/PotBot_sol) · [Documentation](docs/)

[![CI](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?style=flat-square)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.30.1-blue?style=flat-square)](https://anchor-lang.com)
[![MCP](https://img.shields.io/badge/MCP-native-14F195?style=flat-square)](https://www.npmjs.com/package/@potbot/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## Mainnet MVP

POTBOT is focusing its first mainnet release on one narrow, auditable flow:

```text
deposit supported Solana asset
        ↓
deploy through one allowlisted yield adapter
        ↓
mint a transferable POT share token
        ↓
yield increases NAV per share
        ↓
burn shares to redeem the underlying position
```

The first release is deliberately **not** a multi-asset RWA index. It will support one Solana-native underlying asset and one yield strategy. Multi-asset baskets, blue-chip tokens, tokenized equities/RWAs, Apple Pay funding, and lending-market collateral integrations are later milestones and must not be presented as live until deployed and verified.

- [Mainnet MVP scope](docs/product/MAINNET_MVP.md)
- [Share-accounting specification](docs/architecture/SHARE_ACCOUNTING.md)
- [Feature-status language](docs/product/FEATURE_STATUS.md)

---

## What is a POT?

A POT is a program-controlled Solana vault. For the focused MVP, a user deposits one supported asset and receives proportional SPL shares. The share token represents the holder's pro-rata claim on the vault's conservatively accounted assets.

Yield earned by the allowlisted strategy increases total assets and therefore NAV per share. Redemption burns shares atomically and returns the corresponding amount of underlying assets, subject to available strategy liquidity and user-defined slippage protection.

For the single-asset MVP, use **POT share token**, **liquid vault token**, or **yield index token**. **Basket index token** is reserved for the later multi-asset product.

---

## Product layers

### 1. Financial primitive — mainnet focus

- Program-controlled custody through a vault PDA
- One supported underlying asset
- One allowlisted yield adapter
- Proportional share minting
- Conservative NAV accounting
- Atomic share burn and redemption
- Pause and emergency-exit protections

### 2. Coordination — supporting layer

The existing governance system can control strategy and risk parameters. It is not required to explain the core deposit → yield → redeem experience.

### 3. Automation — optional BOT layer

The BOT, keeper, and MCP server can monitor vaults, propose actions, and automate allowlisted operations. Automation does not change the ownership or redemption guarantees of POT shares.

---

## Status

Use the labels defined in [FEATURE_STATUS.md](docs/product/FEATURE_STATUS.md).

| Capability | Status |
|---|---|
| `pot_vault` Anchor program: deposits, withdrawals, governance, swaps | Devnet live |
| POT share/NAV primitives | Implemented on devnet; mainnet accounting review required |
| Single production yield adapter | Planned / under implementation |
| End-to-end deposit → yield → redeem flow | Mainnet MVP target |
| Jupiter execution and keeper automation | Devnet live |
| `@potbot/mcp@0.2.0` | Live |
| Privy and wallet-adapter onboarding | Live |
| Multi-asset blue-chip baskets | Planned |
| Tokenized equities and RWAs | Planned |
| POT shares as third-party lending collateral | Planned |
| Apple Pay funding | Planned |

Devnet program: `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`.

No token, no airdrop farming, and no guaranteed APY.

---

## Safety model

The focused MVP is not mainnet-ready until:

- first-depositor inflation and donation attacks are mitigated;
- decimal normalization and rounding are adversarially tested;
- share minting cannot occur without an increase in managed assets;
- redemption always burns shares;
- stale or invalid oracle/NAV data cannot authorize value-dependent actions;
- the yield adapter can move assets only between allowlisted vault-owned accounts;
- losses reduce NAV and cannot be hidden by cached values;
- emergency redemption remains available when risk-increasing actions are paused;
- independent security-review findings are resolved or explicitly accepted.

See [SHARE_ACCOUNTING.md](docs/architecture/SHARE_ACCOUNTING.md).

---

## Roadmap

1. **Single-asset mainnet POT** — one underlying, one yield adapter, mint/redeem shares.
2. **Blue-chip baskets** — multiple crypto assets, deterministic NAV and rebalancing.
3. **Composability** — secondary liquidity and selected lending integrations for POT shares.
4. **Tokenized equities and RWAs** — only with explicit issuer, oracle, compliance, market-hours, liquidity, and jurisdiction handling.

Governance, MCP, Blinks, Money Tree, Duels, NFTs, and privacy research remain supporting or experimental layers. They are not the primary MVP promise.

---

## Architecture

```text
user
  │ deposit / redeem
  ▼
POTBOT web + SDK
  │
  ▼
pot_vault Anchor program
  ├── idle underlying vault
  ├── POT share mint
  ├── NAV/share accounting
  └── allowlisted yield adapter
          │
          ▼
    Solana yield protocol
```

Optional governance, keeper, and MCP components sit around this core. They may authorize or automate allowlisted operations but cannot create unbacked shares or redirect user redemption.

Detailed system documentation:

- [Architecture overview](docs/architecture/overview.md)
- [Program reference](docs/architecture/program.md)
- [Governance model](docs/architecture/governance.md)
- [MCP integration](docs/integrations/mcp.md)
- [Local development](docs/operations/development.md)
- [Deployment](docs/operations/deploy.md)
- [Security policy](SECURITY.md)

---

## Repository layout

```text
potbot-v2/
├── apps/
│   ├── web/              Next.js DApp + API routes
│   └── potbot-mcp/       MCP server published as @potbot/mcp
├── packages/
│   ├── program/          Anchor programs
│   ├── sdk/              TypeScript SDK
│   └── ui/               Shared React components
├── docs/                 Product, architecture, security, operations
├── scripts/              Devnet and operational utilities
└── supabase/             Off-chain indexing and metadata
```

---

## Quick start

```bash
git clone https://github.com/YD811/potbot-v2.git
cd potbot-v2
npm install
npm run dev
```

Copy `.env.example` to the relevant app environment and use devnet unless a mainnet action has been explicitly approved. See [development setup](docs/operations/development.md).

---

## License

MIT © 2026 Y-DAO Amsterdam.
