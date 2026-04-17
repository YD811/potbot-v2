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
  - Endpoint: `https://quote-api.jup.ag/v6/quote` → `/swap` → send versioned tx

- [ ] **E2E тест на devnet**
  - create_pot → deposit → create_proposal → vote → execute → verify balance
  - Написать скрипт `scripts/e2e-devnet.ts`

- [ ] **Демо-видео** (3–5 минут)
  - Сценарий: создание пота → AI agent proposal → голосование → исполнение свапа → Strategy Vault join

- [ ] **Submission на colosseum.com/frontier** (до 11 мая)

---

## 🟡 ВАЖНО — делает проект сильным

### Backend (`apps/api`)
- [ ] **Price Oracle** — Jupiter Price API v2, 5s polling, Redis cache
- [ ] **PnL Engine** — entry_price × current_price → unrealized/realized PnL per position
- [ ] **APY Calculator** — `(1 + pnl_30d)^(365/30) - 1` per vault
- [ ] **Agent Cron** — 60s job: evaluate rules → create_proposal on-chain if triggered
- [ ] **Yield Aggregator** — Kamino + Drift APY (15min polling)
- [ ] **Analytics API** — `/api/vaults/:pubkey/analytics` → NAV, PnL, APY, Sharpe, win_rate

### MCP Server (`apps/potbot-mcp`)
- [ ] **Setup solana-agent-kit** — `@solana-agent-kit/core` + `@solana-agent-kit/adapter-mcp`
- [ ] **Tools:** `list_pots`, `get_pot_analytics`, `create_proposal`, `vote_on_proposal`, `join_vault`, `get_yield_rates`, `get_agent_rules`, `update_agent_rules`
- [ ] **x402 middleware** — micropayments per API call (0.001 USDC)
- [ ] **Docs page** — `/for-agents` уже есть, обновить с реальными примерами

### SDK update
- [ ] **StrategyVault методы** в `packages/sdk/src/client.ts`:
  - `createStrategyVault()`, `joinStrategyVault()`, `exitStrategyVault()`, `evolveTagmagotchi()`
- [ ] **ReferralAccount** десериализация
- [ ] **crank_vault_fees** инструкция добавить в program + SDK

### Frontend polish
- [ ] **Vault detail новые табы** — Strategy, Performance, Referrals, Tamagotchi
- [ ] **Real PnL данные** на /vaults карточках (подключить к API вместо mock)
- [ ] **SwapPanel** — token selector с live ценами, slippage настройка
- [ ] **Mobile UI** — проверить и починить layout на всех страницах
- [ ] **Membership flow** — invite / join / approve для публичных потов

---

## 🟢 СПОНСОРЫ / BONUS — дополнительный импакт

- [ ] **Metaplex Core** — NFT Strategy Shares для Titan вольтов
  ```bash
  npm install @metaplex-foundation/mpl-core
  # Минтить NFT при Titan unlock (tamagotchi_level == 5)
  ```

- [ ] **Privy embedded wallet** — join vault без Phantom (по email)
  ```bash
  npm install @privy-io/react-auth
  # На странице /vaults/[pubkey] добавить "Join with email" кнопку
  ```

- [ ] **MagicBlock Private Payments** — конфиденциальные реферальные выплаты
  - MCP server от MagicBlock для privacy-transfers

- [ ] **Jupiter Limit Orders** — для Eagle+ (200+ members)
  - API: `https://jup.ag/api/limit/v1/createOrder`
  - Добавить как новый тип proposal: `ProposalType::LimitOrder`

- [ ] **Jupiter DCA** — для Dragon+ (1000+ members)
  - API: `https://jup.ag/api/dca/v1/createDca`

- [ ] **MoonPay on-ramp** — фиат → vault прямо на join странице

- [ ] **Phantom** — versioned transactions + transaction simulation preview

---

## 🔔 ЕСЛИ ЕСТЬ ВРЕМЯ

- [ ] **Telegram bot команды**
  - `/create_vault`, `/vault_stats [name]`, `/my_vaults`, `/ref_stats`, `/join [name]`
- [ ] **Browser notifications** — когда AI agent создаёт proposal
- [ ] **Tamagotchi анимации** — при level up (Lottie или CSS)
- [ ] **Token-gate** — проверять holdings при вступлении (BONK, JUP holder = бесплатный вход)
- [ ] **Landing page обновление** — добавить Strategy Vault и MCP секции
- [ ] **pot_duel program** — 1v1 vault challenge (Dragon+ unlock)

---

## ✅ ГОТОВО

- [x] Anchor программа: create_pot, deposit, withdraw, create_proposal, vote, execute_proposal
- [x] Anchor: execute_swap, update_tamagotchi, init_token_mint
- [x] Strategy Vault on-chain: create_strategy_vault, join_strategy_vault, exit_strategy_vault, evolve_tamagotchi
- [x] ReferralAccount on-chain с автоматическими выплатами (L1 + L2)
- [x] StrategyConfig, RiskLevel, StrategyType — Rust types
- [x] Tamagotchi 6 уровней + compute_tamagotchi_level + swap_fee_bps + entry_fee_discount_bps
- [x] On-chain Events: StrategyVaultCreated, ParticipantJoined, ParticipantExited, TamagotchiEvolved
- [x] TypeScript SDK: PDAs, IDL, client helpers
- [x] DApp: Mock mode (Zustand, seed data)
- [x] Страницы: /, /create, /pots/[pubkey], /leaderboard, /my-pots, /vaults, /vaults/create, /for-agents, /beta
- [x] /vaults page: filters, sort, join UI, strategy cards (14KB, production-ready)
- [x] AI Agent UI: rules engine, AIAgentPanel, useAIAgent hook (60s polling)
- [x] Governance proposals + voting (shares-weighted)
- [x] GovernanceSettings (quorum %, approval %, risk profiles)
- [x] BudgetGrantPanel wizard
- [x] Proposal PnL tracking + FOMO alert
- [x] Leaderboard (public pots, sorting)
- [x] Navbar с leaderboard ссылкой
- [x] Landing page
- [x] Документация: ARCHITECTURE, DEVELOPMENT, PROGRAM, GOVERNANCE, MOCK_MODE
- [x] FOUNDER_JOURNAL.md — история проекта
- [x] README.md — полный обновлённый

---

## 📅 Timeline до 11 мая

| Дата | Задача | Статус |
|------|--------|--------|
| Апр 17–20 | Devnet deploy + Jupiter real executor | 🔴 СЕЙЧАС |
| Апр 21–24 | apps/api: price + PnL + agent cron | 🟡 |
| Апр 25–27 | apps/potbot-mcp + SDK StrategyVault | 🟡 |
| Апр 28–30 | Kamino yield + Metaplex NFT + Privy | 🟢 |
| Май 1–5 | E2E тесты devnet + mobile + Telegram | 🟢 |
| Май 6–8 | Demo video | 🟢 |
| Май 9–10 | Pitch prep + submission форма | 🟢 |
| **Май 11** | **🚀 SUBMIT** | 📅 |
