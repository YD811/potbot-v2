# @potbot/mcp — PotBot MCP Server

Exposes PotBot vault operations as [MCP](https://modelcontextprotocol.io) tools for AI agents.

## Quick Start

```bash
npx @potbot/mcp
```

Or add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "potbot": {
      "command": "npx",
      "args": ["@potbot/mcp"],
      "env": {
        "POTBOT_API_URL": "https://api.potbot.fun",
        "SOLANA_NETWORK": "devnet"
      }
    }
  }
}
```

## HTTP+SSE Transport (x402 mode)

For AI agents that can pay per API call:

```bash
# Start HTTP server
npm run start:http

# Start with x402 micropayments (0.001 USDC per analytics call)
X402_ENABLED=true X402_RECEIVER_WALLET=<your-usdc-wallet> npm run start:http:x402
```

Endpoints:
- `GET  /sse`      — SSE stream for MCP messages
- `POST /message`  — MCP JSON-RPC messages
- `GET  /health`   — health check
- `GET  /mcp`      — server info + tool list

### x402 Payment

Send `X-402-Payment` header with a base64-encoded payment payload:

```json
{
  "txSignature": "<solana-tx-signature>",
  "amount_usdc": 0.001,
  "receiver": "<receiver-wallet>",
  "payer": "<your-wallet>"
}
```

Paid tools: `get_vault_analytics`, `get_yield_rates`, `get_leaderboard`
Free tools: `list_vaults`, `get_token_prices`, `create_swap_proposal`, `vote_on_proposal`, `join_strategy_vault`, `get_agent_rules`

## Tools

| Tool | Description | x402 |
|------|-------------|-------|
| `list_vaults` | List Strategy Vaults with metrics | Free |
| `get_vault_analytics` | NAV, PnL, APY, Sharpe for a vault | Paid |
| `get_token_prices` | Live prices from Jupiter Price API v2 | Free |
| `create_swap_proposal` | Draft a swap governance proposal | Free |
| `vote_on_proposal` | Vote yes/no on an active proposal | Free |
| `join_strategy_vault` | Get join instructions for a vault | Free |
| `get_yield_rates` | DeFi APY rates (Kamino/Drift/Jito) | Paid |
| `get_leaderboard` | Top vaults by performance metric | Paid |
| `get_agent_rules` | AI automation rules for a vault | Free |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POTBOT_API_URL` | `https://api.potbot.fun` | Backend API URL |
| `SOLANA_RPC_URL` | Devnet RPC | Solana RPC endpoint |
| `SOLANA_NETWORK` | `devnet` | `devnet` or `mainnet-beta` |
| `PROGRAM_ID` | Devnet ID | On-chain program ID |
| `PORT` | `3002` | HTTP server port (HTTP mode only) |
| `X402_ENABLED` | `false` | Enable x402 micropayment gate |
| `X402_PRICE_USDC` | `0.001` | Price per paid tool call in USDC |
| `X402_RECEIVER_WALLET` | `` | USDC receiver wallet address |

## Development

```bash
npm install
npm run dev        # stdio transport (Claude Desktop)
npm run dev:http   # HTTP+SSE transport

npm run build      # compile TypeScript
npm publish        # publish to npm (after npm login)
```

## Hosted deployment

For a public URL that any AI agent (or `curl`) can hit, deploy the
HTTP+SSE server.

### Render (one click)

This package ships a `render.yaml` blueprint. Open
[Render → Blueprints](https://dashboard.render.com/blueprints), pick
this repo, and Render builds from `apps/potbot-mcp/Dockerfile` with the
right env vars wired up. Free tier idles after 15 min — bump to
`starter` for an always-on demo URL. Then:

- `GET  https://<app>.onrender.com/health` — server info JSON
- `GET  https://<app>.onrender.com/mcp`    — full tool catalogue
- `GET  https://<app>.onrender.com/sse`    — SSE stream
- `POST https://<app>.onrender.com/message` — JSON-RPC

To enable x402: set `X402_ENABLED=true` + `X402_RECEIVER_WALLET=<USDC pubkey>`
in the Render dashboard (don't commit a real receiver).

### Docker (anywhere — Fly.io, Railway, Cloud Run, k8s)

```bash
docker build -f apps/potbot-mcp/Dockerfile -t potbot-mcp:latest .
docker run --rm -p 3002:3002 -e SOLANA_NETWORK=devnet potbot-mcp:latest
```

## Links

- [Full MCP Guide](https://github.com/YD811/potbot-v2/blob/main/docs/integrations/mcp.md)
- [PotBot DApp](https://potbot.fun)
- [GitHub](https://github.com/YD811/potbot-v2)
