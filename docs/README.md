# PotBot v2 — Documentation

Project root: [`../`](../) · Live site: [potbot.fun](https://potbot.fun) · Repo: [github.com/YD811/potbot-v2](https://github.com/YD811/potbot-v2)

## Start here

- [`architecture/overview.md`](architecture/overview.md) — read this first. What PotBot is, how the pieces connect.
- [`hackathon/submission.md`](hackathon/submission.md) — the live Solana Frontier 2026 submission writeup.

## Architecture

Foundational design — what is on-chain, what isn't, and why.

| File | What |
|---|---|
| [`architecture/overview.md`](architecture/overview.md) | High-level system overview (start here) |
| [`architecture/architecture.md`](architecture/architecture.md) | Web/API/keeper architecture |
| [`architecture/architecture-onchain.md`](architecture/architecture-onchain.md) | Tier model (Trust spine / Audit / Commitments / Off-chain), three privacy modes, threat model, phasing |
| [`architecture/adr-002-data-architecture.md`](architecture/adr-002-data-architecture.md) | ADR — data architecture decision |
| [`architecture/program.md`](architecture/program.md) | Anchor program reference |
| [`architecture/program-phase1.md`](architecture/program-phase1.md) | Post-hackathon program upgrades (PR-ready spec) |
| [`architecture/governance.md`](architecture/governance.md) | Governance levels, quorum, risk caps |
| [`architecture/private-pots.md`](architecture/private-pots.md) | Private pot threat model and role matrix |
| [`architecture/etf-token-system.md`](architecture/etf-token-system.md) | Pot tokenisation as community ETFs |
| [`architecture/premium-features.md`](architecture/premium-features.md) | Premium pot tier feature set |

## Integrations

How PotBot composes with the Solana ecosystem.

| File | What |
|---|---|
| [`integrations/overview.md`](integrations/overview.md) | All ecosystem integrations index |
| [`integrations/jupiter-dx-report.md`](integrations/jupiter-dx-report.md) | Jupiter DX report (Swap v6, Trigger, DCA, Ultra) |
| [`integrations/mcp.md`](integrations/mcp.md) | MCP server + x402 micropayments |
| [`integrations/squads-multisig-setup.md`](integrations/squads-multisig-setup.md) | Squads v4 multisig integration |
| [`integrations/kora.md`](integrations/kora.md) | Kora paymaster integration writeup |
| [`integrations/sponsors.md`](integrations/sponsors.md) | Hackathon sponsor mapping |

## Operations

Deploying, running, securing, and rotating credentials.

| File | What |
|---|---|
| [`operations/development.md`](operations/development.md) | Local development setup |
| [`operations/deploy.md`](operations/deploy.md) | Deployment guide (devnet/mainnet) |
| [`operations/deploy-render.md`](operations/deploy-render.md) | Hosted MCP deploy on Render |
| [`operations/mainnet-cutover.md`](operations/mainnet-cutover.md) | Mainnet cutover checklist |
| [`operations/mock-mode.md`](operations/mock-mode.md) | Mock mode explanation |
| [`operations/mock-to-onchain-audit.md`](operations/mock-to-onchain-audit.md) | Mock vs on-chain parity audit |
| [`operations/security-audit.md`](operations/security-audit.md) | Security audit report |
| [`operations/secrets-rotation.md`](operations/secrets-rotation.md) | Secret rotation tracker |

## Hackathon (Solana Frontier 2026)

| File | What |
|---|---|
| [`hackathon/submission.md`](hackathon/submission.md) | Live Frontier 2026 submission writeup (5 judging criteria) |
| [`hackathon/competitive-landscape.md`](hackathon/competitive-landscape.md) | Competitor map (Squads, Drift Vaults, Etherfuse, etc.) |
| [`hackathon/platform-improvements.md`](hackathon/platform-improvements.md) | Improvement backlog |

## Other top-level files

- [`../README.md`](../README.md) — repo entry point
- [`../CLAUDE.md`](../CLAUDE.md) — AI assistant memory (project-wide rules + key concepts)
- [`../marketing/`](../marketing/) — pitch decks, one-pagers, twitter threads
