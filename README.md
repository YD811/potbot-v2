#  PotBot v2

**Group trading vaults on Solana.** Collective POT management, on-chain governance, DeFi yield, Tamagotchi NFTs & POT Duels.

Built for [Solana Frontier 2026](https://frontier.solana.com) hackathon by [@CryptoYDao](https://twitter.com/CryptoYDao) — Y-DAO Amsterdam

---

## Links

| | |
|---|---|
| 🏠 Landing | [potbot.fun](https://potbot.fun) |
| 📱 DApp | [app.potbot.fun](https://app.potbot.fun) |
| 🤖 Telegram Bot | [t.me/PotBot](https://t.me/PotBot) |
| 🌐 SNS | potbot.sol |

---

## Architecture

```
potbot-v2/
├─ apps/
│  ├─ web/                 # Next.js 14 DApp (app.potbot.fun)
│  ├─ landing/             # Static landing page (potbot.fun)
│  └─ bot/                 # Telegram grammy bot
├─ packages/
│  ├─ program/             # Anchor Solana programs (Rust)
│  │  ├─ programs/pot_vault/    # Core vault, governance, yield
│  │  └─ programs/pot_duel/     # POT Duels, side bets, settlement
│  ├─ sdk/                 # TypeScript SDK for on-chain programs
│  └─ ui/                  # Shared React UI components
└─ turbo.json              # Turborepo pipeline
```

---

## Core Concepts

### POT = Collective Vault
A POT is a shared on-chain SOL vault with:
- **ETF-like community tokens** (SPL) representing fractional ownership
- **Configurable governance** (L0 Autocracy → L4 Consensus) per action type
- **DeFi yield** via Kamino / Marginfi / Drift (Conservative / Balanced / Aggressive)
- **Tamagotchi mascot** evolving from trade stats (XP → level 0-5)
- **SNS subdomain** `<name>.potbot.site` per POT

### Governance Levels
| Level | Name | Trades | Notes |
|---|---|---|---|
| 0 | Autocracy | Owner decides | Max speed |
| 1 | Advisory | Majority can veto | |
| 2 | Majority | >50% must approve | Default |
| 3 | Supermajority | >66% approval | |
| 4 | Consensus | 100% required | Full democracy |

### POT Duels 🎮
Group-vs-group trading competition. Inspired by DeFi (ETHGlobal).
- Governance vote to accept a challenge
- Stake % of vault into escrow
- Real-time P&L scoreboard via WebSocket
- Spectators place side bets
- Settled permissionlessly via Pyth oracle
- Tamagotchi HP & XP awarded to winner

---

## On-Chain Programs

### `pot_vault` — `PotVLT...`
| Instruction | Description |
|---|---|
| `create_pot` | Initialize vault + community token mint |
| `deposit` | Join POT, get share units |
| `withdraw` | Redeem shares for SOL |
| `create_proposal` | Governance proposal |
| `vote` | Member vote (auto-resolves at quorum) |
| `execute_proposal` | Execute passed proposal |
| `execute_swap` | Jupiter CPI swap |
| `mint_community_tokens` | ETF-like token mint |
| `update_tamagotchi` | Permissionless XP crank |

### `pot_duel` — `PotDUL...`
| Instruction | Description |
|---|---|
| `challenge_pot` | Issue duel challenge |
| `accept_duel` | Defender accepts |
| `lock_stake` | Escrow POT stake |
| `settle_duel` | Pyth oracle settlement |
| `place_side_bet` | Spectator side bet |
| `claim_winnings` | Winner claims escrow |
| `claim_side_bet` | Bettor claims payout |

---

## Getting Started

### Prerequisites
- Node.js ≥20, npm ≥10
- Rust + Anchor CLI (`cargo install --git https://github.com/coral-xyz/anchor anchor-cli`)
- Solana CLI

### Install
```bash
npm install
```

### Dev
```bash
npm run dev                 # All apps in parallel
cd apps/web && npm run dev   # DApp only (port 3000)
cd apps/bot && npm run dev   # Telegram bot only
```

### Build Anchor Programs
```bash
cd packages/program
anchor build
anchor deploy --provider.cluster devnet
```

### Copy .env
```bash
cp apps/web/.env.local.example apps/web/.env.local
# Fill in RPC URL, program IDs, Anthropic API key
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Blockchain | Solana (Anchor 0.30, SPL Token) |
| Price Oracle | Pyth Network |
| DEX | Jupiter v6 (CPI) |
| DeFi Yield | Kamino, Marginfi, Drift |
| Frontend | Next.js 14, Tailwind CSS, Framer Motion |
| State | Zustand + TanStack Query |
| Wallets | Phantom, Solflare, Backpack |
| Voice AI | Web Speech API + Claude claude-opus-4-6 |
| Bot | grammy (Telegram) |
| Monorepo | Turborepo |
| Privacy | PrivacyCash / StampPot (ZK deposits) |
| Domains | SNS (potbot.sol, *.potbot.site) |

---

## Roadmap

**Week 1 (Hackathon)**
- [x] Monorepo scaffold
- [x] Anchor programs: pot_vault + pot_duel
- [x] TypeScript SDK
- [x] Next.js DApp shell
- [ ] Deploy to devnet
- [ ] Jupiter swap integration
- [ ] Live governance flow

**Week 2**
- [ ] Community token (ETF mechanics)
- [ ] DeFi yield integrations
- [ ] Tamagotchi NFT minting
- [ ] Voice AI copilot
- [ ] POT Duels live beta
- [ ] SNS domain registration

---

## License

MIT © Built with ❤️ in Amsterdam
