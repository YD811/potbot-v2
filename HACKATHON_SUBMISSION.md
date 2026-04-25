# 🪴 PotBot v2 — Solana Frontier 2026 Hackathon Submission

**Track**: DeFi / Infrastructure / AI Agents
**Team**: Y-DAO Amsterdam (@YegorDO / @CryptoYDao)
**Deadline**: May 11, 2026
**Submission portal**: [colosseum.com/frontier](https://colosseum.com/frontier)

---

## Live Links

| Resource | URL |
|----------|-----|
| 🌐 DApp (live, devnet) | https://potbot.fun |
| 📺 Demo Video | recording May 6-8 |
| 📖 GitHub | https://github.com/YD811/potbot-v2 |
| 🔌 MCP Server | npx @potbot/mcp |
| 🐦 Twitter | https://x.com/PotBot_sol |

---

## Program IDs

| Network | Program ID |
|---------|-----------|
| Devnet  | GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK |
| Mainnet | cut ~May 7-8 |

---

## Release

Tag: v0.9.0-hackathon — https://github.com/YD811/potbot-v2/releases/tag/v0.9.0-hackathon

---

## Judges Checklist

| What to test | How |
|-------------|-----|
| DApp demo mode | Open https://potbot.fun |
| Create a Pot | Click Create Pot on DApp |
| Governance proposals | Open any pot, Proposals tab |
| AI Agent rules | Pot page, AI tab |
| Leaderboard | https://potbot.fun/leaderboard |
| MCP Server | npx @potbot/mcp |
| Analytics API | GET https://api.potbot.fun/analytics/<pubkey> |
| Devnet program | solana program show GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK --url devnet |

---

## Track Integrations

| Partner | Integration | Status |
|---------|------------|--------|
| Jupiter v6 | All swaps - best route, slippage control, CPI | Done |
| Dune SIM | Vault portfolio analytics ($6K Enterprise plan) | Done |
| Pyth Network | On-chain price oracle for StrategyTrigger | Done |
| x402 | AI micropayments - 0.001 USDC/request | Done |

---

## Known Limitations

- Jupiter swap CPI requires executor wallet on Fly.io - funding in progress
- E2E devnet test: script ready (scripts/e2e-devnet.ts), blocked on executor wallet
- Demo video: recording May 6-8

---

## Team

Yehor Dolinskiy (YD) - Solo founder
Amsterdam - Y-DAO co-founder - ex-BD Binance ecosystem + Trust Wallet
@YegorDO on TG - @CryptoYDao on X

Built entirely solo in 5 weeks.
