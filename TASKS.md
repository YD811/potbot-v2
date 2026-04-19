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
  - Сейчас: `execute_proposal.rs` Swap ветка → `msg!("Jupiter CPI: Phase 2.")`
  - Нужно: off-chain executor сервис (backend подписывает Jupiter swap от имени vault PDA)
  - Endpoint: `https://api.jup.ag/swap/v2/order` → `/execute` → send versioned tx
  - jupiter-v2.ts уже реализован ✅ — нужен только executor сервис

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
- [ ] **x402 middleware** — micropayments per API call (0.001 USDC)
- [ ] **Publish to npm** — `npm publish @potbot/mcp`

### Analytics API ✅ ГОТОВО
- [x] `GET /api/vaults/[pubkey]/analytics` — NAV, PnL, APY, Sharpe, win_rate
- [ ] Connect to real on-chain data post devnet-deploy

### SDK StrategyVault ✅ ГОТОВО
- [x] `buildCreateStrategyVaultTx()` — создание Strategy Vault
- [x] `buildJoinStrategyVaultTx()` — вступление
- [x] `buildExitStrategyVaultTx()` — выход
- [x] `buildEvolveTamagotchiTx()` — эволюция Тамагочи
- [x] `fetchAllStrategyVaults()` — получить все Vaults
- [x] `getVaultAnalytics()` — клиентский хелпер

### Backend deploy configs ✅ ГОТОВО
- [x] `backend/railway.json` — Railway auto-deploy
- [x] `backend/Dockerfile` — Docker multi-stage build
- [x] `backend/db:migrate.sh` — PostgreSQL migration script
- [x] `apps/web/.env.example` — env template for deployment
- [x] `vercel.json` — добавлен `NEXT_PUBLIC_PROGRAM_ID`

### Backend `apps/api`
- [ ] **Price Oracle** — Jupiter Price API v2, 5s polling, Redis cache
- [ ] **PnL Engine** — entry_price × current_price → unrealized/realized PnL per position
- [ ] **APY Calculator** — `(1 + pnl_30d)^(365/30) - 1` per vault
- [ ] **Agent Cron** — 60s job: evaluate rules → create_proposal on-chain if triggered
- [ ] **Yield Aggregator** — Kamino + Drift APY (15min polling)

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

- [ ] **Jupiter Limit Orders** — для Eagle+ (200+ members)
  - jupiter-v2.ts уже реализован ✅ — нужен UI

- [ ] **Jupiter DCA** — для Dragon+ (1000+ members)
  - jupiter-v2.ts уже реализован ✅ — нужен UI

- [ ] **MoonPay on-ramp** — фиат → vault прямо на join странице

---

## 🔔 ЕСЛИ ЕСТЬ ВРЕМЯ

- [ ] **Telegram bot команды** — `/create_vault`, `/vault_stats`, `/my_vaults`
- [ ] **Browser notifications** — когда AI agent создаёт proposal
- [ ] **Tamagotchi анимации** — при level up (Lottie или CSS)
- [ ] **Token-gate** — проверять holdings при вступлении
- [ ] **pot_duel program** — 1v1 vault challenge

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
- [x] MCP Server: 9 tools, stdio transport, Jupiter + Solana RPC integration
- [x] Analytics API: `GET /api/vaults/[pubkey]/analytics`
- [x] DApp: Mock mode (Zustand, seed data)
- [x] Страницы: /, /create, /pots/[pubkey], /leaderboard, /my-pots, /vaults, /vaults/create, /for-agents, /beta
- [x] AI Agent UI: rules engine, AIAgentPanel, useAIAgent hook (60s polling)
- [x] Governance proposals + voting (shares-weighted)
- [x] GovernanceSettings + BudgetGrantPanel
- [x] Deploy configs: railway.json, Dockerfile, .env.example, vercel.json
- [x] Waitlist: waitlist.html, Hono backend API, index.html integration
- [x] Документация: ARCHITECTURE, DEVELOPMENT, PROGRAM, GOVERNANCE, MOCK_MODE
- [x] FOUNDER_JOURNAL.md, README.md

---

## 📅 Timeline до 11 мая

| Дата | Задача | Статус |
|------|--------|--------|
| Апр 17–20 | Devnet deploy + Jupiter real executor | 🔴 СЕЙЧАС |
| Апр 21–24 | apps/api: price + PnL + agent cron | 🟡 |
| Апр 25–27 | x402 micropayments + MCP publish | 🟡 |
| Апр 28–30 | Metaplex NFT + Privy + Jupiter UI | 🟢 |
| Май 1–5 | E2E тесты devnet + mobile + Telegram | 🟢 |
| Май 6–8 | Demo video | 🟢 |
| Май 9–10 | Pitch prep + submission форма | 🟢 |
| **Май 11** | **🚀 SUBMIT** | 📅 |
