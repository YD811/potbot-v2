# 🪴 PotBot v2

**Group trading vaults on Solana.** Collective POT management, on-chain governance, DeFi yield, and Tamagotchi mascots that evolve with your vault's performance.

Built for [Solana Frontier 2026](https://frontier.solana.com) hackathon · [@CryptoYDao](https://twitter.com/CryptoYDao) · Y-DAO Amsterdam

[![Build](https://img.shields.io/badge/build-passing-00ff88?style=flat-square)](https://github.com/YD811/potbot-v2)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?style=flat-square)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.30.1-blue?style=flat-square)](https://anchor-lang.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)](https://nextjs.org)

---

## Links

| | |
|---|---|
| 🏠 Landing | [potbot.fun](https://potbot.fun) |
| 📱 DApp | [app.potbot.fun](https://app.potbot.fun) |
| 🤖 Telegram Bot | [t.me/PotBot](https://t.me/PotBot) |
| 🌐 SNS | potbot.sol |

---

## Quick Start

```bash
git clone https://github.com/YD811/potbot-v2.git
cd potbot-v2
npm install
cd apps/web
npx next dev
# Open http://localhost:3000
```

> **No wallet needed to explore.** The DApp boots in demo mode with 3 pre-seeded vaults,
> members, and governance proposals. Connect Phantom to interact.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for full setup including Anchor + devnet deploy.

---

## What is a POT?

A **POT** is a shared on-chain SOL vault governed by its members:

- **Collective ownership** — members deposit SOL and receive shares proportional to their stake
- **On-chain governance** — every trade, withdrawal, or strategy change goes through a vote (configurable level L0–L4)
- **DeFi yield** — idle capital deployed via Kamino / Marginfi / Drift
- **Tamagotchi mascot** — a creature that evolves (🥚→🐣→🐤→🦅→🐉→👑) based on vault XP earned from trading volume, wins, and yield
- **SNS subdomain** — each POT gets `<name>.potbot.site`

---

## Monorepo Structure

```
potbot-v2/
├── apps/
│   ├── web/              # Next.js 14 DApp — main product
│   ├── landing/          # Static landing page
│   └── bot/              # Telegram bot (grammy)
├── packages/
│   ├── program/          # Anchor programs (Rust)
│   │   └── programs/
│   │       └── pot_vault/    # Core: vault, governance, yield
│   ├── sdk/              # TypeScript SDK for on-chain programs
│   └── ui/               # Shared React components
└── docs/                 # Architecture, guides, references
```

---

## Current Status

| Component | Status | Notes |
|---|---|---|
| Anchor program `pot_vault` | ✅ Written | Needs devnet deploy |
| TypeScript SDK | ✅ Done | PDAs, IDL, client helpers |
| Next.js DApp | ✅ Builds & runs | Full UI with mock mode |
| Mock demo mode | ✅ Working | 3 seed vaults, live on localhost |
| Devnet deploy | 🔜 Next | `anchor deploy --provider.cluster devnet` |
| Jupiter swap CPI | 🔜 Next | Program integration pending |
| Tamagotchi NFT minting | 📋 Planned | Week 2 |
| POT Duels | 📋 Planned | Week 2 |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Blockchain | Solana · Anchor 0.30.1 · SPL Token |
| Price Oracle | Pyth Network |
| DEX | Jupiter v6 (CPI) |
| DeFi Yield | Kamino · Marginfi · Drift |
| Frontend | Next.js 14 · Tailwind CSS |
| State | Zustand · TanStack Query |
| Wallets | Phantom · Solflare · WalletConnect |
| Monorepo | Turborepo · npm workspaces |

---

## Documentation

| Doc | Description |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, key decisions |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local setup, commands, troubleshooting |
| [PROGRAM.md](docs/PROGRAM.md) | Solana program: accounts, instructions, PDAs |
| [GOVERNANCE.md](docs/GOVERNANCE.md) | Governance levels, voting mechanics |
| [MOCK_MODE.md](docs/MOCK_MODE.md) | Demo mode architecture |

---

## License

MIT © 2026 Y-DAO Amsterdam — Built with ❤️ for Solana Frontier
