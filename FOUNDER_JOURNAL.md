# Дневник фаундера PotBot

> Личный журнал проекта. Что мы строим, почему, и куда идём.
> Solana Frontier 2026 Hackathon · YD811/potbot-v2

---

## Идея в одном абзаце

PotBot — это групповые торговые сейфы на Solana. Представь: ты с друзьями хочешь торговать вместе. Сейчас для этого нужен либо один человек с доступом ко всем деньгам (риск доверия), либо огромная юридическая конструкция (MultiSig + документы). PotBot решает это за 2 минуты: создаёшь POT, зовёшь участников, они заходят с SOL или USDC, все голосуют за трейды — и программа исполняет их атомарно. Никто не держит ключи. Контракт — это и есть кошелёк.

Но это только база. В апреле 2026 мы поняли, что строим нечто большее — **инфраструктуру для AI-нативного DeFi**.

---

## Что такое POT

POT — это on-chain сущность, которая хранит:
- **Vault** — реальный кошелёк на блокчейне с деньгами группы
- **Shares** — пропорциональные доли каждого участника (NAV-механика как у ETF)
- **AI Agent** — автономный движок правил, который предлагает трейды 24/7
- **Tamagotchi** — живое существо, которое эволюционирует вместе с активностью группы
- **Governance Level** — правило, сколько голосов нужно чтобы исполнить трейд

---

## Механика шейров (Shares) — как это работает

Это самая важная часть. Объясняю по-простому:

### Вход в POT

Когда участник делает депозит:
```
Ты кладёшь 1 SOL → получаешь шейры
Шейры = твой депозит / общий vault × total_shares
```

**Пример:**
- POT создан. В нём 0 SOL, 0 шейров
- Саша вносит 5 SOL → получает 5,000,000 шейров (базовая единица: 1 SOL = 1,000,000 шейров)
- Женя вносит 3 SOL → получает 3,000,000 шейров
- Итого в vault: 8 SOL, 8,000,000 шейров
- Саша владеет 62.5% POT, Женя — 37.5%

### Рост vault

Если POT совершает трейд и зарабатывает:
- В vault теперь 10 SOL (было 8)
- Шейры не меняются — их по-прежнему 8,000,000
- Но NAV вырос: было 0.000001 SOL/шейр, стало 0.00000125 SOL/шейр
- Саша при выходе получает: 5,000,000 × 0.00000125 = **6.25 SOL** (зарабатывает вместе с POT)

### Выход

```
Получаешь = твои_шейры / total_shares × vault_balance
```

Это честная математика. Никакого доверия к людям — только к программе.

---

## Strategy Vaults — почему мы это строим (апрель 2026)

В середине апреля мы поняли: POT как "закрытый клуб для своих" — это слишком узко. Настоящий рынок — это публичные стратегии.

**Инсайт:** Каждый хороший трейдер хочет монетизировать свои знания. Но взять деньги в управление — это лицензии, доверие, риски. Strategy Vault решает это: трейдер создаёт vault, устанавливает комиссии, все деньги остаются на блокчейне. Он никогда не держит чужие средства — только предлагает трейды. Группа голосует. Код исполняет.

Так появилась концепция **Creator Strategy Vault**:
- Трейдер/инфлюенсер/AI-агент создаёт публичный vault
- Инвесторы входят, получают Strategy Shares (SPL-токены, NAV-priced)
- Создатель монетизирует через entry/performance/management fee
- Реферальная система — автоматические on-chain выплаты в момент транзакции
- Tamagotchi эволюционирует с ростом: скидки на комиссии, новые инструменты

**Написали полный спек. Реализовали on-chain за 3 дня:**
- `create_strategy_vault` — создание с полной конфигурацией
- `join_strategy_vault` — вход с entry fee + referral routing
- `exit_strategy_vault` — выход с performance fee расчётом
- `evolve_tamagotchi` — permissionless эволюция по порогам AUM/members
- `ReferralAccount` — on-chain запись реф-связей с автоматическими выплатами

---

## AI Agent — главная фича которую мы недооценили

AI Agent уже был в проекте с самого начала — правила, триггеры, логи. Но это был просто UI в браузере. Никакого backend.

**Переосмысление:** AI Agent — это не фича. Это душа продукта.

Подумай: зачем ты создаёшь POT? Чтобы торговать вместе. Но торговля — это 95% времени мониторинга и 5% действий. AI Agent берёт на себя мониторинг. Он смотрит на цены 24/7. Когда триггер срабатывает — создаёт proposal. Группа нажимает YES/NO за 30 секунд.

**Архитектура которую мы строим:**
```
Agent Cron (каждые 60 секунд)
  → Загрузить правила пота
  → Получить текущие цены (Jupiter Price API)
  → Оценить каждый триггер
  → Если сработал → create_proposal on-chain
  → Записать в agent_log
  → Уведомить группу (Telegram/браузер)
```

**Пример правила:**
```json
{
  "trigger": { "type": "price_below", "token": "SOL", "threshold": 120 },
  "action": { "type": "propose_swap", "from": "USDC", "to": "SOL", "amount_pct": 10 },
  "cooldown_minutes": 360
}
```

AI предлагает. Люди решают. Ничего не исполняется без кворума. Это принципиально важно — мы не строим рискованного автономного трейдера. Мы строим умного советника с человеческим контролем.

---

## MCP Server — инфраструктура для автономных агентов

Самое неожиданное открытие этого спринта: PotBot — это не только UI для людей. Это **инфраструктура для AI агентов**.

MCP (Model Context Protocol) позволяет любому AI агенту — Claude, GPT, кастомному LLM — взаимодействовать с PotBot через стандартизированный интерфейс.

**Что это значит на практике:**
- Разработчик пишет AI агента: "найди все вольты с APY > 10% и предложи депозит"
- Агент вызывает `list_pots` → `get_pot_analytics` → `create_proposal`
- Всё происходит on-chain, всё проверяется governance

**Почему это важно для хакатона:** Colosseum сам включил MCP в список ресурсов Frontier 2026. Constellation MCP, MagicBlock Private Payments MCP — это сигнал от организаторов: AI-native инфраструктура в тренде.

Мы строим `apps/potbot-mcp` на базе [solana-agent-kit](https://github.com/sendaifun/solana-agent-kit) (60+ готовых Solana действий) + добавляем PotBot-специфичные инструменты.

**Монетизация через x402:** AI агенты платят 0.001 USDC за каждый MCP вызов. Это создаёт реальный revenue stream для протокола с первого дня без токена.

---

## Backend и PnL — чего не хватало

До этого спринта у нас не было backend. Вся аналитика была либо мок-данные, либо localStorage.

**Что мы строим:**
```
apps/api (Hono.js)
  price service   → Jupiter Price API v2 (каждые 5 секунд в Redis)
  pnl engine      → entry_price × current = unrealized PnL
  apy calculator  → annualized from 30d: (1+pnl_30d)^(365/30) - 1
  yield aggregator → Kamino + Drift + JLP APY
  agent cron      → AI Agent rules evaluation
  crank service   → management fees + Tamagotchi evolution

PostgreSQL (Supabase)
  price_snapshots, positions, pot_analytics, agent_log, yield_opportunities
```

**Метрики которые теперь будут реальными:**
- NAV (Net Asset Value per share)
- PnL 24h/7d/30d/all-time
- APY (annualized estimate)
- Sharpe ratio, max drawdown, win rate
- Сравнение с бенчмарком (SOL performance)

---

## DeFi агрегация — что подключаем

Jupiter был с начала. Теперь добавляем:

**Kamino** — лучший yield на Solana. До 15% APY на USDC/SOL. Используем для стратегии "Yield" внутри потов и как опцию для idle capital.

**Drift** — perps и lending. Интересен для агрессивных стратегий (Degen вольты).

**Jupiter Limit Orders** — разблокируется для Eagle+ (200+ участников). Агент ставит limit order вместо market.

**Jupiter DCA** — разблокируется для Dragon+ (1000+ участников). Настоящий DCA прямо из vault.

**Metaplex Core** — NFT Strategy Shares для Titan вольтов. Шеры становятся NFT, торгуются на вторичном рынке.

**MagicBlock Private Payments** — конфиденциальные реферальные выплаты. Реферер получает выплату без видимой on-chain связи.

**Privy** — embedded wallet. Пользователь заходит по email, без Phantom. Это важно для аудитории инфлюенсеров — большинство подписчиков не имеют crypto wallet.

**MoonPay** — fiat on-ramp на странице Join Vault. Подписчик инфлюенсера платит картой и сразу попадает в vault.

---

## Что делает PotBot уникальным

| Фича | PotBot | Обычный MultiSig | DAO | Copy-trading CEX |
|------|--------|-----------------|-----|-------------------|
| Создание за 2 мин | ✅ | ❌ | ❌ | ✅ (но централизованный) |
| Без токена управления | ✅ | ✅ | ❌ | ✅ |
| Auto-execute | ✅ | ❌ | ❌ | ✅ |
| AI Agent с governance | ✅ | ❌ | ❌ | ❌ |
| MCP-native для AI | ✅ | ❌ | ❌ | ❌ |
| Creator monetization | ✅ | ❌ | ❌ | ✅ (но платформа берёт большую долю) |
| On-chain referrals | ✅ | ❌ | ❌ | ❌ |
| Tamagotchi | ✅ | ❌ | ❌ | ❌ |
| Non-custodial | ✅ | ✅ | ✅ | ❌ |
| Telegram integration | ✅ | ❌ | ❌ | ❌ |

---

## Текущий статус (апрель 2026)

### Сделано ✅
- [x] Anchor программа: полный набор инструкций (create, deposit, withdraw, propose, vote, execute)
- [x] Strategy Vault on-chain: create/join/exit/evolve + автоматические реф-выплаты
- [x] ReferralAccount структура с двухуровневой цепочкой
- [x] SPL токенизация (init_token_mint)
- [x] SDK клиент + PDA хелперы
- [x] DApp: все страницы, wallet connect, mock режим
- [x] `/vaults` discovery page с фильтрами и sorting
- [x] `/vaults/create` wizard (5 шагов)
- [x] AI Agent UI: rules engine, strategy, log tabs
- [x] Governance proposals + voting (shares-weighted)
- [x] GovernanceSettings, BudgetGrantPanel
- [x] Leaderboard page
- [x] `/for-agents` MCP documentation page
- [x] Landing page
- [x] Документация: ARCHITECTURE, DEVELOPMENT, PROGRAM, GOVERNANCE, MOCK_MODE

### В работе 🔄
- [ ] **Devnet deploy** — самый критичный блокер
- [ ] **Jupiter реальный CPI** — execute_swap сейчас возвращает `msg!("Phase 2")`
- [ ] **apps/api** — backend: price oracle, PnL engine, agent cron
- [ ] **apps/potbot-mcp** — MCP server на базе solana-agent-kit
- [ ] **SDK StrategyVault методы** — createStrategyVault, joinStrategyVault, etc.

### Следующий шаг 📋
```
Апрель 17-20  → Devnet deploy + Jupiter executor
Апрель 21-24  → apps/api (price + PnL + agent cron)
Апрель 25-27  → apps/potbot-mcp + SDK update
Апрель 28-30  → Kamino yield + Metaplex NFT shares + Privy
Май 1-5       → E2E тесты devnet + mobile polish + Telegram bot
Май 6-8       → Demo video
Май 9-10      → Pitch prep + submission форма
Май 11        → 🚀 SUBMIT colosseum.com/frontier
```

---

## Почему Solana

1. **Скорость** — 400ms блоки, трейды исполняются мгновенно
2. **Стоимость** — $0.00001 за транзакцию. При 100 трейдах в месяц — $0.001
3. **Anchor** — лучший фреймворк для умных контрактов. Rust = безопасность
4. **Экосистема** — Jupiter, Kamino, Drift, Metaplex, MagicBlock — всё доступно через CPI или API
5. **AI-native** — solana-agent-kit, MCP серверы, x402 payments — Solana впереди всех по AI-инфраструктуре
6. **Хакатон** — Solana Frontier 2026 = идеальное место для запуска

---

## Архитектура — полный стек

```
┌─────────────────────────────────────────────────────────┐
│                    КЛИЕНТЫ                               │
│   Next.js DApp  │  Telegram Bot  │  AI Agents (MCP)     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  API GATEWAY (Hono.js)                   │
│            apps/api  —  port 3001                        │
│   /pots  /vaults  /analytics  /agent  /mcp              │
└──┬──────────┬──────────┬────────────┬────────────────────┘
   │          │          │            │
┌──▼──┐  ┌───▼───┐  ┌───▼───┐  ┌────▼─────────────────────┐
│Price│  │ PnL   │  │ Yield │  │     MCP Server            │
│Svc  │  │Engine │  │Aggreg │  │   (potbot-mcp)            │
└──┬──┘  └───┬───┘  └───┬───┘  └──────────────────────────┘
   │          │          │
┌──▼──────────▼──────────▼────────────────────────────────┐
│                 DATA LAYER                               │
│  PostgreSQL (Supabase)  │  Redis (5s price cache)       │
└─────────────────────────────────────────────────────────┘
   │
┌──▼──────────────────────────────────────────────────────┐
│              SOLANA + PROTOCOLS                          │
│  Anchor Program  │  Jupiter v6  │  Kamino  │  Drift      │
└─────────────────────────────────────────────────────────┘
```

---

*Дневник ведётся в процессе разработки. Каждый мердж — новая запись истории.*
*Последнее обновление: апрель 2026*
