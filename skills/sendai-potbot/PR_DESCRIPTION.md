# Add `potbot` skill — group-trading vaults with Personal AI Voters

## Summary

Adds a new skill, `potbot`, that lets any AI agent participate in **PotBot** group-trading vaults on Solana — discovering pots, decoding state, and (uniquely in this marketplace) **producing real on-chain transactions on behalf of a human member** via the `MemberDelegate` PDA + `vote_as_delegate` instruction.

PotBot is the first protocol in this marketplace where the AI agent is **a delegated voting participant in a group**, not a single-manager vault (Drift) or a generic governance tool (Realms). It complements existing skills:

| Existing skill | What it covers | PotBot adds |
|---|---|---|
| `jupiter` | Swap routing | PotBot uses Jupiter v6 inside `execute_swap` CPI |
| `pyth` | Oracle prices | PotBot uses Pyth on-chain inside StrategyTrigger swaps |
| `squads` | Multisig threshold custody | PotBot adds share-weighted governance + active trading + AI delegates |
| (none) | Multi-member vault with per-seat AI delegation | **`potbot`** |

## Why this is novel

- **First MCP server in the marketplace where 3 tools produce real on-chain transactions, not advice** (`vote_on_proposal`, `register_delegate`, `revoke_delegate`).
- **Personal AI Voters are a primitive**, not a feature — `MemberDelegate` PDA + `VoterRecord` keyed by `member.wallet` (not signer) means double-voting is impossible whether the human or their AI casts the vote, and rotating the AI is one ix away.
- **AI grounded in real data** — the `vault_strategist` prompt refuses to recommend without first calling `get_market_analytics` (CoinGecko + RSI/volatility/trend) and `get_social_sentiment` (LunarCrush + Reddit + CryptoPanic + VADER).

## Verification

E2E reproducible on devnet against program `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`:

- Pot creation: [`5oJpF5Ai…4GQ7hZk`](https://explorer.solana.com/tx/5oJpF5AiLAtQ4aM178Hq5JNdskuTHMUwPzMzTMcUmcHbR6eS7jMUAzcYD9f5ZHSDDL9nvBggMWEisbRwW4GQ7hZk?cluster=devnet)
- Deposit via `join_strategy_vault`: [`4V8i9MD3…HLWn4`](https://explorer.solana.com/tx/4V8i9MD3qTyqhgpjaMQeBAkZBDRhZAzDvS5iVnPN2kP3h8chmDyroVtbu3xBga57ymkXVQ9kaUzzhuMKPFTHLWn4?cluster=devnet)
- Swap proposal via `create_swap_proposal`: [`2xQNzisj…g5d3AXn`](https://explorer.solana.com/tx/2xQNzisjTAqWwUdrWdXky1bvF18S1DSWgrNwa1DGg1pRwWFoFi8GsmaRnd2GbhnAPPb9xngUT5s1SdbqZg5d3AXn?cluster=devnet)

## Links

- npm: [`@potbot/mcp@0.6.0`](https://www.npmjs.com/package/@potbot/mcp)
- GitHub: https://github.com/YD811/potbot-v2
- For-agents docs: https://potbot.fun/for-agents
- Hackathon submission: Solana Frontier 2026

## Format compliance

- `name: integrating-potbot` — matches existing pattern (`integrating-jupiter`, etc.)
- `license: MIT`
- `metadata.author: potbot`, `metadata.version: 0.6.0`
- 18 tags covering protocol, primitives, dependencies (jupiter-cpi, pyth-oracle), and grounding sources

## Test path

```bash
npm install -g @potbot/mcp
# Configure Claude Desktop:
# { "mcpServers": { "potbot": { "command": "potbot-mcp" } } }
# Restart Claude → /mcp shows 18 tools → "List devnet pots" → list_vaults returns demo pot
```
