# Security Policy

## Reporting a vulnerability

POTBOT custodies real value onchain. We take responsible disclosure seriously and reward valid reports.

**Please do not open a public GitHub issue for security findings.**

Email: **security@potbot.fun**
Backup channel: DM [@CryptoYDao](https://twitter.com/CryptoYDao) on X.

When reporting, include:

- Component (program / DApp / MCP / API endpoint / SDK)
- Affected version, commit hash, or deployed cluster
- Steps to reproduce, expected vs. observed behavior
- Impact assessment (financial, governance, data, denial-of-service)
- Suggested mitigation if you have one
- Whether you'd like public credit after the fix ships

## Response timeline

| Step | Target |
|---|---|
| Initial acknowledgement | within 48 hours |
| Triage and severity rating | within 5 business days |
| Fix or mitigation in place | depends on severity |
| Public disclosure | coordinated with reporter, after a fix ships |

## Scope

In scope:

- The `pot_vault` and `pot_duel` Anchor programs (`packages/program/`)
- The DApp and API routes at [potbot.fun](https://potbot.fun) (`apps/web/`)
- The published MCP server `@potbot/mcp` (`apps/potbot-mcp/`)
- The TypeScript SDK (`packages/sdk/`)

Out of scope:

- Findings that require physical access, social engineering, or stolen wallets
- Issues only reproducible against forks or unsupported branches
- Denial-of-service via volumetric attack on the public DApp
- Best-practice or hardening suggestions without a concrete exploit path

## Supported versions

We patch the most recent release on the `main` branch. Devnet deployments are upgraded continuously; mainnet upgrades follow the security pass.

## Safe harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to follow this policy
- Avoid privacy violations, data destruction, and service disruption
- Give us reasonable time to investigate and remediate before any public disclosure
- Test only against accounts and funds that you control
