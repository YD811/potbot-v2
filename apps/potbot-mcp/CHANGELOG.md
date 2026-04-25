# @potbot/mcp Changelog

## 0.3.0 — 2026-04-25

### Real data (replaces mocks)
- `get_yield_rates` now hits **DefiLlama** (`yields.llama.fi/pools`) for live Solana yields with TVL > $100k. Risk classification: low (APY < 10% no IL) / medium (10–30% no IL) / high (> 30% or IL). Static estimates kept as offline fallback.
- `get_vault_analytics` now reports real **SPL token holdings** via `getTokenAccountsByOwner`, prices each holding via Jupiter Price API v2, and computes a real-balance NAV. Performance fields (PnL, APY, Sharpe) clearly tagged as `mock (devnet)` until on-chain accounting lands.
- All helpers stop swallowing fetch/RPC errors silently — surfaces a `warnings` array on the tool response so the agent (and humans) can see when an upstream is degraded.

### x402 hardening
- HTTP transport `verifyX402Payment` now performs **real on-chain verification**: `getTransaction` lookup, success-status check, USDC `pre/postTokenBalances` delta against `X402_RECEIVER_WALLET`. Previously only validated signature format.
- Added replay protection — used signatures cached, capped at 10k entries.

### MCP capabilities expansion
- Added **Resources**: `potbot://network/info`, `potbot://vaults/list`, `potbot://yields/solana`.
- Added **Prompts**: `vault_strategist`, `risk_auditor`, `yield_hunter` — canned multi-step workflows for AI clients.

### Misc
- Unified `POTBOT_API_URL` default to `https://api.potbot.fun` across stdio + http transports.
- Bumped advertised server version in both transports.

## 0.2.0 — 2026-04-23
- HTTP+SSE transport (`potbot-mcp-http` bin).
- x402 micropayment gating (signature-format-only verification).

## 0.1.0 — 2026-04-23
- Initial release. 9 stdio tools.
