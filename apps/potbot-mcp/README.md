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
        "POTBOT_API_URL": "https://app.potbot.fun",
        "SOLANA_NETWORK": "devnet"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `list_vaults` | List Strategy Vaults (TVL, PnL, APY, members) |
| `get_vault_analytics` | Detailed analytics for a vault |
| `get_token_prices` | Live prices from Jupiter Price API v2 |
| `create_swap_proposal` | Draft a swap proposal for governance |
| `vote_on_proposal` | Vote yes/no on an active proposal |
| `join_strategy_vault` | Get instructions to join a vault |
| `get_yield_rates` | Current DeFi yield rates (Kamino, Drift, Marginfi) |
| `get_leaderboard` | Top vaults by performance metric |
| `get_agent_rules` | AI automation rules for a vault |

## Example Prompts

```
"Show me the top 5 vaults by APY"
"What's the SOL price right now?"
"Create a proposal to swap 20% SOL → USDC in vault PotXALPHA..."
"What are the current Kamino yield rates?"
"Show me analytics for vault PotWHALE..."
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POTBOT_API_URL` | `https://app.potbot.fun` | PotBot dApp API URL |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | Solana RPC endpoint |
| `SOLANA_NETWORK` | `devnet` | Network name |
| `PROGRAM_ID` | `2ywztkP4gaJr...` | Anchor program ID (matches `declare_id!` in pot_vault) |

## Development

```bash
cd apps/potbot-mcp
npm install
npm run dev   # tsx watch src/index.ts
npm run build # compile to dist/
```
