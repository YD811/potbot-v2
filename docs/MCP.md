# PotBot MCP Server — AI Agent Guide

The PotBot MCP (Model Context Protocol) server lets any AI agent — Claude, GPT-4, Cursor, or custom LLMs — interact with every vault on Solana without writing any blockchain code.

**Source:** `apps/potbot-mcp/`
**Based on:** [solana-agent-kit](https://github.com/sendaifun/solana-agent-kit)
**Transport:** stdio (default) · HTTP/SSE (x402 gated)

---

## Quick Start

### Option 1 — npx (no install)

```bash
npx @potbot/mcp
```

### Option 2 — Claude Desktop config

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
      "potbot": {
            "command": "npx",
                  "args": ["@potbot/mcp"],
                        "env": {
                                "SOLANA_NETWORK": "devnet",
                                        "POTBOT_PROGRAM_ID": "2ywztkP4gaJr2HtmBvqMXrBWab3FLd3uG6TjGXvVogJL"
                                              }
                                                  }
                                                    }
                                                    }
                                                    ```

                                                    Then restart Claude Desktop. You'll see PotBot tools appear in the tools panel.

                                                    ### Option 3 — Local dev

                                                    ```bash
                                                    cd apps/potbot-mcp
                                                    npm install
                                                    npm run build
                                                    npm start
                                                    ```

                                                    ---

                                                    ## Available Tools

                                                    ### Vault Discovery

                                                    | Tool | Description | Parameters |
                                                    |------|-------------|------------|
                                                    | `list_vaults` | List all public Strategy Vaults with metrics | `limit?`, `sortBy?` |
                                                    | `get_vault_analytics` | Full analytics for a specific vault | `pubkey` |
                                                    | `get_leaderboard` | Top vaults ranked by PnL / APY / TVL | `metric`, `limit?` |
                                                    | `get_yield_rates` | Live APY from Kamino / Drift / JLP | — |
                                                    | `get_token_prices` | Jupiter Price API v2 for any token | `tokens[]` |

                                                    ### Vault Actions

                                                    | Tool | Description | Parameters |
                                                    |------|-------------|------------|
                                                    | `create_swap_proposal` | Create governance proposal for a token swap | `pot`, `inputMint`, `outputMint`, `amount` |
                                                    | `vote_on_proposal` | Cast vote on an existing proposal | `proposal`, `approve` |
                                                    | `join_strategy_vault` | Join a Strategy Vault (pay entry fee) | `vault`, `referrer?` |
                                                    | `get_agent_rules` | Get AI agent rules for a pot | `pot` |
                                                    | `list_pots` | List group pots | `member?` |
                                                    | `get_pot_analytics` | Full analytics for a group pot | `pubkey` |
                                                    | `create_pot` | Create a new group pot | `name`, `governanceLevel`, `members[]` |

                                                    ### Utility

                                                    | Tool | Description | Parameters |
                                                    |------|-------------|------------|
                                                    | `get_wallet_balance` | SOL + token balances for a wallet | `wallet?` |
                                                    | `get_program_health` | Check if Solana program is live | — |
                                                    | `get_mock_mode` | Check if server is running in demo/mock mode | — |

                                                    ---

                                                    ## Example Interactions

                                                    ### Browse vaults and find the best yield

                                                    ```
                                                    You: Show me the top 5 Strategy Vaults by 30-day APY

                                                    Claude uses: list_vaults(sortBy: "apy30d", limit: 5)
                                                    → Returns: vault names, NAV, PnL%, APY, Sharpe ratio, member count
                                                    ```

                                                    ### Propose a trade in your group pot

                                                    ```
                                                    You: In pot 7xKp...abc, propose selling 50% of SOL for USDC

                                                    Claude uses: create_swap_proposal({
                                                      pot: "7xKp...abc",
                                                        inputMint: "So11111111111111111111111111111111111111112",  // SOL
                                                          outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  // USDC
                                                            amount: 0.5,
                                                              description: "Take 50% profit — SOL up 40% this month"
                                                              })
                                                              → Creates on-chain proposal, returns proposal pubkey + voting link
                                                              ```

                                                              ### Join a Strategy Vault

                                                              ```
                                                              You: Join the "SolanaWhale" vault with referral from my friend

                                                              Claude uses: join_strategy_vault({
                                                                vault: "SolanaWhale vault pubkey",
                                                                  referrer: "friend wallet address"
                                                                  })
                                                                  → Signs and sends transaction, pays entry fee, registers referral on-chain
                                                                  ```

                                                                  ### Check yield rates across protocols

                                                                  ```
                                                                  You: What's the current yield on Kamino vs Drift?

                                                                  Claude uses: get_yield_rates()
                                                                  → Returns: { kamino: "8.2% APY", drift: "6.7% APY", jlp: "12.1% APY" }
                                                                  ```

                                                                  ---

                                                                  ## x402 Micropayments — Pay-Per-Call API

                                                                  The HTTP/SSE transport uses [x402](https://x402.org/) for per-request micropayments. This enables fully autonomous agent economies where agents pay for analytics data in USDC.

                                                                  ### How it works

                                                                  1. Agent sends request to `https://api.potbot.fun/analytics/:pubkey`
                                                                  2. Server returns `402 Payment Required` with payment details
                                                                  3. Agent pays `0.001 USDC` via Solana (x402 protocol)
                                                                  4. Server returns analytics data

                                                                  ### Try it with curl

                                                                  ```bash
                                                                  # Without payment (returns 402)
                                                                  curl https://api.potbot.fun/analytics/VAULT_PUBKEY_HERE

                                                                  # Check if x402 is enabled
                                                                  curl https://api.potbot.fun/health
                                                                  # → { "x402": true, "price": "0.001 USDC per request" }
                                                                  ```

                                                                  ### Enable x402 on self-hosted API

                                                                  ```bash
                                                                  # In apps/api/.env
                                                                  X402_ENABLED=true
                                                                  X402_PRICE_USDC=0.001
                                                                  X402_RECIPIENT=YOUR_WALLET_ADDRESS
                                                                  ```

                                                                  ### x402 Payment flow (technical)

                                                                  ```
                                                                  GET /analytics/:pubkey
                                                                  ← 402 { "payment": { "amount": 0.001, "currency": "USDC", "recipient": "..." } }
                                                                  → POST /analytics/:pubkey + x-payment: { signature, payer }
                                                                  ← 200 { "nav": ..., "pnl": ..., "apy": ... }
                                                                  ```

                                                                  The middleware at `apps/api/src/middleware/x402.ts` handles:
                                                                  - USDC on-chain verification via Solana RPC
                                                                  - Replay protection (stores used signatures in Redis)
                                                                  - Automatic activation via `X402_ENABLED=true` env flag

                                                                  ---

                                                                  ## Analytics Response Schema

                                                                  ```typescript
                                                                  interface VaultAnalytics {
                                                                    pubkey: string;
                                                                      name: string;
                                                                        nav: number;               // Net Asset Value (vault_balance / total_shares)
                                                                          tvl_usd: number;           // Total Value Locked in USD
                                                                            pnl_24h: number;           // % change last 24 hours
                                                                              pnl_7d: number;            // % change last 7 days
                                                                                pnl_30d: number;           // % change last 30 days
                                                                                  pnl_all_time: number;      // % change since inception
                                                                                    apy_estimated: number;     // Annualized: (1 + pnl_30d)^(365/30) - 1
                                                                                      sharpe_ratio: number;      // Risk-adjusted return
                                                                                        max_drawdown: number;      // Maximum peak-to-trough decline
                                                                                          win_rate: number;          // % of profitable trades
                                                                                            total_volume_usd: number;  // Cumulative trading volume
                                                                                              member_count: number;      // Active members
                                                                                                tamagotchi_stage: number;  // 0-5 (Seedling → Titan)
                                                                                                  created_at: string;        // ISO timestamp
                                                                                                  }
                                                                                                  ```

                                                                                                  ---

                                                                                                  ## MCP in Demo Mode

                                                                                                  Without a wallet or devnet connection, the MCP server runs in **mock mode** automatically:

                                                                                                  ```bash
                                                                                                  npx @potbot/mcp
                                                                                                  # → "Running in demo mode — 5 seeded vaults loaded"
                                                                                                  ```

                                                                                                  Mock mode returns realistic seeded data for all read operations. Write operations (create_proposal, vote, join) return simulated success responses with mock transaction IDs.

                                                                                                  To disable mock mode and connect to devnet:
                                                                                                  ```bash
                                                                                                  SOLANA_NETWORK=devnet \
                                                                                                  ANCHOR_WALLET=~/.config/solana/id.json \
                                                                                                  npx @potbot/mcp
                                                                                                  ```

                                                                                                  ---

                                                                                                  ## Building Custom Agents

                                                                                                  ### Python agent example

                                                                                                  ```python
                                                                                                  import anthropic
                                                                                                  import subprocess

                                                                                                  # Start MCP server as subprocess
                                                                                                  mcp = subprocess.Popen(["npx", "@potbot/mcp"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)

                                                                                                  client = anthropic.Anthropic()

                                                                                                  # Claude will automatically use PotBot tools
                                                                                                  response = client.messages.create(
                                                                                                      model="claude-opus-4-5",
                                                                                                          max_tokens=1024,
                                                                                                              tools=[...],  # MCP tools injected automatically
                                                                                                                  messages=[{
                                                                                                                          "role": "user",
                                                                                                                                  "content": "Find the highest-yield vault and create a proposal to deposit 10 SOL"
                                                                                                                                      }]
                                                                                                                                      )
                                                                                                                                      ```
                                                                                                                                      
                                                                                                                                      ### TypeScript agent example
                                                                                                                                      
                                                                                                                                      ```typescript
                                                                                                                                      import { Client } from "@modelcontextprotocol/sdk/client/index.js";
                                                                                                                                      import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
                                                                                                                                      
                                                                                                                                      const transport = new StdioClientTransport({
                                                                                                                                        command: "npx",
                                                                                                                                          args: ["@potbot/mcp"],
                                                                                                                                          });
                                                                                                                                          
                                                                                                                                          const client = new Client({ name: "my-agent", version: "1.0.0" }, {});
                                                                                                                                          await client.connect(transport);
                                                                                                                                          
                                                                                                                                          // List all vaults
                                                                                                                                          const vaults = await client.callTool({ name: "list_vaults", arguments: { limit: 10 } });
                                                                                                                                          
                                                                                                                                          // Get analytics for best vault
                                                                                                                                          const analytics = await client.callTool({
                                                                                                                                            name: "get_vault_analytics",
                                                                                                                                              arguments: { pubkey: vaults.content[0].pubkey }
                                                                                                                                              });
                                                                                                                                              ```
                                                                                                                                              
                                                                                                                                              ---
                                                                                                                                              
                                                                                                                                              ## Environment Variables
                                                                                                                                              
                                                                                                                                              | Variable | Default | Description |
                                                                                                                                              |----------|---------|-------------|
                                                                                                                                              | `SOLANA_NETWORK` | `devnet` | `mainnet-beta` or `devnet` |
                                                                                                                                              | `SOLANA_RPC_URL` | Helius devnet | Custom RPC endpoint |
                                                                                                                                              | `POTBOT_PROGRAM_ID` | `2ywz...JL` | Anchor program ID |
                                                                                                                                              | `ANCHOR_WALLET` | Auto-generated | Path to keypair JSON |
                                                                                                                                              | `JUPITER_API_URL` | `https://api.jup.ag` | Jupiter API base URL |
                                                                                                                                              | `POTBOT_API_URL` | `https://api.potbot.fun` | Backend analytics API |
                                                                                                                                              
                                                                                                                                              ---
                                                                                                                                              
                                                                                                                                              ## Related Docs
                                                                                                                                              
                                                                                                                                              - [ARCHITECTURE.md](ARCHITECTURE.md) — How MCP fits into the overall system
                                                                                                                                              - [DEVELOPMENT.md](DEVELOPMENT.md) — Local dev setup
                                                                                                                                              - [SPONSORS.md](SPONSORS.md) — x402 + MagicBlock integration details
