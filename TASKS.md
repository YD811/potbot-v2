# PotBot v2 — Hackathon Task Tracker
> Solana Frontier 2026 | GitHub: YD811/potbot-v2 | Deadline: May 11, 2026

---

## 🔴 БЛОКЕРЫ — без этого нельзя сабмитить

- [ ] **Devnet deploy**
  ```bash
  cd packages/program
  anchor build
  anchor deploy --provider.cluster devnet
  # Скопировать Program ID → packages/sdk/src/index.ts + apps/web/.env.local
  ```

- [ ] **Jupiter реальный swap executor**
  - `apps/api/src/services/jupiter-executor.ts` ✅ реализован
  - Нужно: задеплоить `apps/api` на Railway/Fly.io, добавить `EXECUTOR_KEYPAIR` в env
  - Endpoint: `https://api.jup.ag/swap/v2/order` → `/execute` → send versioned tx

- [ ] **E2E тест на devnet**
  - create_pot → deposit → create_proposal → vote → execute → verify balance
  - Скрипт `scripts/e2e-devnet.ts` написан ✅ — нужен live program

- [ ] **Демо-видео** (3–5 минут)
  - Сценарий: создание пота → AI agent proposal → голосование → исполнение свапа → Strategy Vault join

- [ ] **Submission на colosseum.com/frontier** (до 11 мая)

---

## 🟡 ВАЖНО — делает проект сильным

### MCP Server (`apps/potbot-mcp`) ✅ ГОТОВО
- [x] `list_vaults` — вывод Strategy Vaults с метриками
- [x] `get_vault_analytics` — NAV, PnL, APY, win rate, Sharpe
- [x] `get_token_prices` — Jupiter Price API v2
- [x] `create_swap_proposal` — создать swap proposal
- [x] `vote_on_proposal` — голосование
- [x] `join_strategy_vault` — присоединиться к Vault
- [x] `get_yield_rates` — Kamino/Drift/Marginfi доходность
- [x] `get_leaderboard` — топ Vaults
- [x] `get_agent_rules` — правила AI агента
- [ ] **x402 HTTP mode** ✅ — `apps/potbot-mcp/src/http.ts` (HTTP+SSE + x402 gate, v0.2.0)
- [ ] **Publish to npm** — `npm publish @potbot/mcp` (ready: run `npm run build && npm publish`, needs `npm login`)

### Backend `apps/api` ✅ ГОТОВО
- [x] **Price Oracle** — Jupiter Price API v2, 5s TTL (HOT), 60s TTL (COLD), in-memory + Upstash Redis
- [x] **PnL Engine** — entry_price × current_price → unrealized/realized PnL per position
- [x] **APY Calculator** — `(1 + pnl_30d)^(365/30) - 1` per vault, 7d + 30d windows
- [x] **Agent Cron** — 60s node-cron: evaluate rules → log triggers (on-chain after devnet deploy)
- [x] **Yield Aggregator** — Kamino API + Drift + Jito fallback (5min cache)
- [x] **Jupiter Executor** — full swap execution with retries + Supabase logging
- [x] **Helius Webhooks** — on-chain event listener for proposal/swap events
- [x] **x402 middleware** — 0.001 USDC gate on `/analytics/*` (activate with X402_ENABLED=true)
- [x] **Redis Cache** — Upstash REST API + in-memory fallback, CacheKeys namespace
- [x] **Rate limiting** — sliding window, per-IP, 60 req/min public
- [ ] **Deploy to Railway/Fly.io** — connect DB + Redis + set EXECUTOR_KEYPAIR

### Analytics API ✅ ГОТОВО
- [x] `GET /api/vaults/[pubkey]/analytics` — NAV, PnL, APY, Sharpe, win_rate (Next.js route)
- [x] `GET /analytics/:pubkey` — same via `apps/api` (standalone backend)
- [ ] Connect to real on-chain data post devnet-deploy

### SDK StrategyVault ✅ ГОТОВО
- [x] `buildCreateStrategyVaultTx()`, `buildJoinStrategyVaultTx()`, `buildExitStrategyVaultTx()`
- [x] `buildEvolveTamagotchiTx()`, `fetchAllStrategyVaults()`, `getVaultAnalytics()`

### Jupiter Integration ✅ ГОТОВО
- [x] **Swap** — `packages/sdk/src/jupiter-v2.ts` — Swap V2 (/order + /execute)
- [x] **Limit Orders UI** — `apps/web/src/components/LimitOrderPanel.tsx` — propose via governance
- [x] **DCA UI** — `apps/web/src/components/DCAPanel.tsx` — propose DCA strategy via governance
- [x] **Pot page tabs** — `📋 Orders` + `📈 DCA` tabs added to vault detail page
- [ ] **Limit Orders real execution** — connect LimitOrderPanel to jupiter-v2.ts Trigger API
- [ ] **DCA real execution** — connect DCAPanel to jupiter-v2.ts DCA API

### Deploy configs ✅ ГОТОВО
- [x] `backend/railway.json`, `backend/Dockerfile`, `apps/api/Dockerfile`, `apps/api/fly.toml`
- [x] `apps/web/.env.example`, `vercel.json` with NEXT_PUBLIC_PROGRAM_ID

---

## 🟢 СПОНСОРЫ / BONUS — дополнительный импакт

- [ ] **Metaplex Core** — NFT Strategy Shares для Titan вольтов
  ```bash
  npm install @metaplex-foundation/mpl-core
  ```

- [ ] **Privy embedded wallet** — join vault без Phantom (по email)
  ```bash
  npm install @privy-io/react-auth
  ```

- [ ] **MagicBlock Private Payments** — конфиденциальные реферальные выплаты

- [ ] **Jupiter Limit Orders** — real execution via Trigger API (UI ✅ done)
- [ ] **Jupiter DCA** — real execution via DCA API (UI ✅ done)
- [ ] **MoonPay on-ramp** — фиат → vault прямо на join странице

---

## 🔔 ЕСЛИ ЕСТЬ ВРЕМЯ

- [ ] **Browser notifications** — когда AI agent создаёт proposal
- [ ] **Tamagotchi анимации** — при level up (Lottie или CSS)
- [ ] **Token-gate** — проверять holdings при вступлении
- [ ] **pot_duel program** — 1v1 vault challenge
- [ ] **Telegram bot** — `/create_vault`, `/vault_stats`, `/my_vaults` (structure exists in `apps/bot/`)

---

## ✅ ГОТОВО

- [x] Anchor программа: create_pot, deposit, withdraw, create_proposal, vote, execute_proposal
- [x] Anchor: execute_swap, update_tamagotchi, init_token_mint
- [x] Strategy Vault on-chain: create_strategy_vault, join_strategy_vault, exit_strategy_vault, evolve_tamagotchi
- [x] ReferralAccount on-chain с автоматическими выплатами (L1 + L2)
- [x] Tamagotchi 6 уровней + compute_tamagotchi_level
- [x] On-chain Events: StrategyVaultCreated, ParticipantJoined, ParticipantExited, TamagotchiEvolved
- [x] TypeScript SDK: PDAs, IDL, client helpers, StrategyVault methods
- [x] Jupiter V2: Swap, Trigger (Limit Orders), DCA, Price API — полная реализация
- [x] **Jupiter Limit Orders UI** — `LimitOrderPanel.tsx` (propose via governance → Jupiter Trigger)
- [x] **Jupiter DCA UI** — `DCAPanel.tsx` (propose DCA strategy → Jupiter DCA)
- [x] **Pot page Orders + DCA tabs** — `📋 Orders` and `📈 DCA` in vault detail page
- [x] MCP Server: 9 tools, stdio transport, Jupiter + Solana RPC integration
- [x] Analytics API: `GET /api/vaults/[pubkey]/analytics` + `GET /analytics/:pubkey`
- [x] **apps/api backend**: Price Oracle, PnL Engine, APY Calc, Agent Cron, Yield Aggregator, Jupiter Executor, Helius Webhooks, Redis Cache, Rate Limiting
- [x] **x402 micropayments** — `apps/api/src/middleware/x402.ts` (USDC gate, Solana on-chain verification, replay protection)
- [x] DApp: Mock mode (Zustand, seed data)
- [x] Страницы: /, /create, /pots/[pubkey], /leaderboard, /my-pots, /vaults, /vaults/create, /for-agents, /beta
- [x] AI Agent UI: rules engine, AIAgentPanel, useAIAgent hook (60s polling)
- [x] Governance proposals + voting (shares-weighted)
- [x] GovernanceSettings + BudgetGrantPanel
- [x] Deploy configs: railway.json, Dockerfile, fly.toml, .env.example, vercel.json
- [x] Waitlist: waitlist.html, Hono backend API, index.html integration
- [x] Документация: ARCHITECTURE, DEVELOPMENT, PROGRAM, GOVERNANCE, MOCK_MODE
- [x] FOUNDER_JOURNAL.md, README.md

---

## 📅 Timeline до 11 мая

| Дата | Задача | Статус |
|------|--------|--------|
| Апр 17–20 | Devnet deploy + Jupiter real executor | 🔴 В РАБОТЕ |
| Апр 21–24 | Metaplex NFT Shares + Privy wallet | 🟡 |
| Апр 25–27 | x402 HTTP mode for MCP + npm publish | 🟡 |
| Апр 28–30 | Deploy apps/api to Fly.io + connect live data | 🟢 |
| Май 1–5 | E2E тесты devnet + mobile + Telegram | 🟢 |
| Май 6–8 | Demo video | 🟢 |
| Май 9–10 | Pitch prep + submission форма | 🟢 |
| **Май 11** | **🚀 SUBMIT** | 📅 |
