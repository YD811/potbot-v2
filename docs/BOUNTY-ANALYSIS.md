# PotBot v2 — Bounty Analysis: Contra + Kora
### Solana Frontier 2026 Hackathon

> **TL;DR:**  
> Kora = газ без SOL для наших юзеров → **средняя сложность, HIGH impact, делаем**.  
> Contra = enterprise payment channels → **высокая сложность, нишевый fit, рассматриваем если есть время**.

---

## 📊 Сводная таблица

| | **Kora** | **Contra** |
|---|---|---|
| **Что это** | Gasless транзакции — юзер платит в USDC/BONK, не SOL | Payment channels с instant finality + privacy + compliance |
| **GitHub** | [solana-foundation/kora](https://github.com/solana-foundation/kora) | [solana-foundation/contra](https://github.com/solana-foundation/contra) |
| **Аудит** | ✅ Полный аудит (Runtime Verification) | ⚠️ НЕ аудирован, под активной разработкой |
| **SDK** | `@solana/kora` TypeScript пакет | Rust + TypeScript клиент, Docker-инфра |
| **Сложность интеграции** | 🟡 Средняя (3–5 дней) | 🔴 Высокая (7–14 дней + DevOps) |
| **Fit с PotBot** | ⭐⭐⭐⭐⭐ Прямой | ⭐⭐⭐ Косвенный |
| **Рекомендация** | ✅ Делаем | ⏳ Если есть время |

---

## 🟢 Kora — Gasless Transactions

### Что такое Kora

Kora — это signing infrastructure от Solana Foundation. Она делает одну вещь, но делает её отлично: **пользователь не держит SOL, а транзакции всё равно проходят**. Kora берёт на себя роль fee payer, а пользователь компенсирует сеть в любом токене — USDC, BONK, токен приложения.

```
Без Kora: user → (нужен SOL для gas) → транзакция
С Kora:   user → (подписывает в USDC/BONK) → Kora fee payer → транзакция
```

### Почему это ИДЕАЛЬНО для PotBot

Сейчас у нас есть критическая UX-проблема: **члены группового вота должны держать SOL для gas**. Это барьер для onboarding:
- Юзер хочет вступить в pot и задепозитить USDC — но у него нет SOL
- Юзер хочет проголосовать — нужен SOL
- Новый мембер получает инвайт — первым делом надо «купить немного SOL для газа»

С Kora весь этот барьер исчезает. **Vault сам спонсирует gas** (из общего баланса SOL) или члены платят из своей доли USDC.

### Что уже есть в PotBot ✅

| Компонент | Статус |
|-----------|--------|
| Anchor program (`pot_vault`) | ✅ Готов |
| Transaction building в SDK | ✅ Есть (`packages/sdk/src/client.ts`) |
| Jupiter swap execution | ✅ Интегрирован |
| Proposal → execute flow | ✅ Mock + on-chain hooks |
| TypeScript окружение | ✅ Next.js + Node |

### Что нужно реализовать

#### Шаг 1 — Установить Kora SDK
```bash
npm install @solana/kora --workspace=apps/web
npm install @solana/kora --workspace=packages/sdk
```

#### Шаг 2 — Создать `apps/web/src/lib/kora.ts`
```typescript
import { KoraClient } from '@solana/kora'

const KORA_RPC = process.env.NEXT_PUBLIC_KORA_RPC ?? 'https://kora.potbot.app'

export const koraClient = new KoraClient({ rpcUrl: KORA_RPC })

/**
 * Оборачивает любую транзакцию через Kora fee payer.
 * Юзер подписывает, Kora платит gas — vault компенсирует из баланса SOL.
 */
export async function signWithKora(transaction: Transaction): Promise<Transaction> {
  return koraClient.signTransaction({ transaction })
}

/**
 * Gasless deposit: юзер депозитит USDC без SOL в кошельке.
 * Flow: buildDepositTx → signWithKora → send
 */
export async function gaslessDeposit(
  potPubkey: string,
  amountUsdc: number,
  userWallet: PublicKey
): Promise<string> {
  const tx = await buildDepositTransaction(potPubkey, amountUsdc, userWallet)
  const signedTx = await signWithKora(tx)
  return sendTransaction(signedTx)
}

/**
 * Gasless vote: голосовать без SOL в кошельке
 */
export async function gaslessVote(
  proposalPubkey: string,
  approve: boolean,
  voterWallet: PublicKey
): Promise<string> {
  const tx = await buildVoteTransaction(proposalPubkey, approve, voterWallet)
  const signedTx = await signWithKora(tx)
  return sendTransaction(signedTx)
}
```

#### Шаг 3 — Деплой Kora Node (для хакатона — Railway/Docker)
```bash
cargo install kora-cli

# .env для ноды
KORA_SIGNER=<vault_fee_payer_keypair>
KORA_RPC_URL=https://api.mainnet-beta.solana.com
KORA_ALLOWED_TOKENS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v,DezXAZ8z7...  # USDC, BONK
KORA_MAX_FEE_LAMPORTS=5000
```

#### Шаг 4 — UI Badge "Gasless ⚡"
Показываем в CreatePotModal и deposit flow:
```tsx
<span className="text-[10px] bg-[#9945FF]/20 text-[#9945FF] px-1.5 rounded-full">
  ⚡ Gasless · Powered by Kora
</span>
```

### Нарратив для судей

> *"Joining a PotBot vault requires zero SOL. Members pay gas in USDC — Kora handles the rest. This removes the #1 onboarding barrier for group trading vaults."*

### Сложность: СРЕДНЯЯ 🟡

- **Дней**: 3–5
- **Основная работа**: обернуть transaction build в Kora flow, задеплоить ноду
- **Риски**: нужен SOL в fee payer кошельке (vault берёт из баланса); лимиты на токены

---

## 🔴 Contra — Enterprise Payment Channels

### Что такое Contra

Contra — это payment channel система, похожая на Lightning Network но для Solana. Позволяет делать **тысячи instant транзакций** внутри channel, которые затем settle на-chain батчами каждые 100ms. Добавляет:

- **Privacy**: Token-2022 confidential transfers внутри channel
- **Compliance**: JWT-based role access, audit logging, AML
- **Gasless**: синтезированные fee payer accounts внутри channel

Архитектура включает 5-шаговый pipeline (Dedup → SigVerify → Sequencer → Executor → Settler) и требует PostgreSQL + Redis бэкенд.

### Как это может работать в PotBot

**Вариант A: "PotBot Private Channel"**
Создаём Contra channel для каждого private vault. Все internal транзакции (депозиты/трейды между членами) идут через channel — они приватны, instant, и settle на-chain атомарно:

```
Members ─→ Contra Channel ─→ batch settle ─→ Solana Mainnet
           (private, instant)    (100ms)
```

**Вариант B: Inter-vault Settlements**
Когда два vault'а делают сделку между собой (например, pot duel), Contra обеспечивает instant settlement без ожидания блока.

**Вариант C: High-frequency AI Trades**
AI agent делает 100+ micro-swaps в день — каждый проходит через Contra channel с instant finality вместо ожидания 400ms finality Solana.

### Что уже есть в PotBot ✅

| Компонент | Статус |
|-----------|--------|
| Privacy narrative (Umbra) | ✅ Задокументирован |
| pot_duel program | ✅ Есть базовая структура |
| AI agent с high-freq actions | ✅ Polling каждые 60s |
| Batch proposal execution | ✅ executeProposal в mock-store |

### Что нужно реализовать

**Это значительно больше работы:**

1. **DevOps**: Docker Compose с Contra node + PostgreSQL + Redis
2. **Channel создание**: per-vault channel с Escrow Program (`GokvZqD2...`)
3. **SDK интеграция**: Rust client для channel operations
4. **Channel withdraw**: Withdrawal Program (`J231K9...`) для вывода из channel
5. **Indexer**: мониторинг on-chain deposits/withdrawals

```typescript
// Будущий apps/web/src/lib/contra.ts (концептуально)
export async function createVaultChannel(vaultPubkey: string) {
  // Деплоим Contra channel для vault
  // Escrow Program escrows vault tokens
  // Члены получают channel accounts
}

export async function channelTransfer(
  from: string, to: string, amount: number, token: string
) {
  // Instant, private internal transfer
  // Settles в batch каждые 100ms
}
```

### Предупреждения ⚠️

1. **НЕ аудирован** — "This code has not been audited and is under active development. Use at your own risk."
2. **Сложная инфра** — нужны PostgreSQL + Redis + Contra node + Indexer
3. **Под активной разработкой** — API может меняться
4. **Для хакатона** — высокий риск не успеть до дедлайна

### Нарратив для судей (если сделаем)

> *"High-stakes PotBot vaults use Contra channels: thousands of internal settlements per second with confidential transfers. Members see instant portfolio updates; the blockchain settles atomically."*

### Сложность: ВЫСОКАЯ 🔴

- **Дней**: 7–14 + DevOps время
- **Основная работа**: инфра, channel создание/управление, тесты
- **Риски**: неаудированный код, breaking changes, нет mainnet production use

---

## 🎯 Стратегия: что и в каком порядке делать

### Приоритет 1: Kora (делаем однозначно)

```
День 1:  npm install @solana/kora, создать apps/web/src/lib/kora.ts
День 2:  Задеплоить Kora node на Railway/Docker
День 3:  Обернуть deposit + vote transactions через Kora
День 4:  UI badge "Gasless ⚡", обновить CreatePotModal
День 5:  Тест полного flow + документация
```

**Deliverable**: "Deposit into a pot with zero SOL — pay gas in USDC via Kora"

### Приоритет 2: Contra (делаем если есть неделя после Kora)

```
День 1-2: Поднять Docker infrastructure (Postgres + Redis + Contra node)
День 3-4: Создать channel для demo vault (Diamond Hands DAO)
День 5-6: Показать channel transfers в UI (не on-chain, через channel)
День 7:   Settlement demo + нарратив
```

**Deliverable**: "Private vault mode: internal transfers via Contra channel, settles every 100ms"

---

## 💰 Целевые призы (обновлённая таблица)

| Sponsor | Prize | Статус | Реализовано |
|---------|-------|--------|-------------|
| Jupiter | $10,000 | 🟡 Почти | Swap V2 + Trigger + DCA + DX Report ✅ |
| Encrypt/Ika | $10,000 | 📋 Plan | FHE governance (концепт) |
| Dune SIM | $5,000 | ✅ Готово | leaderboard/page.tsx + dune-sim.ts |
| Umbra | $5,000 | ✅ Готово | umbra.ts + CreatePotModal Privacy step |
| SNS | $5,000 | ✅ Готово | sns.ts + pot header + leaderboard |
| **Kora** | **~$5K** | 🔨 Строим | gasless deposit + vote |
| **Contra** | **~$5–10K** | ⏳ Если время | channel для private vault |
| **Итого цель** | **$45–50K** | | |

---

## 🔧 Техническая совместимость

### Kora + PotBot: идеальная пара

```
Наш стек:          Kora требует:         Конфликт?
──────────         ─────────────         ─────────
TypeScript ✅  →  @solana/kora npm    →  Нет
Solana txs  ✅  →  Transaction object →  Нет
Any wallet  ✅  →  User signature    →  Нет
Anchor prog ✅  →  Any program ix    →  Нет
```

**Вывод**: Kora — это буквально wrapper над нашими existing transactions. Нулевые breaking changes.

### Contra + PotBot: требует инфру

```
Наш стек:          Contra требует:       Нужно добавить:
──────────         ───────────────       ───────────────
Next.js     ✅  →  TypeScript client  →  Contra SDK
Anchor prog ✅  →  Escrow Program    →  Channel creation
—           ❌  →  PostgreSQL         →  Docker/Railway
—           ❌  →  Redis              →  Docker/Railway
—           ❌  →  Contra node        →  Docker + config
—           ❌  →  Indexer            →  Background service
```

**Вывод**: Contra требует инфраструктурной работы, не просто SDK вызовов.

---

## 📝 Нарратив для подачи (обе интеграции)

> **"PotBot — это полный стек group trading на Solana. Юзеры вступают без SOL (Kora), торгуют на лучшей цене (Jupiter), видят реальную аналитику (Dune SIM), хранят приватность (Umbra), и находят vault по имени (SNS). High-stakes vaults используют Contra channels для instant internal settlement. Это не демо — это production-ready инфраструктура для group capital coordination."**

---

*Документ версии: Solana Frontier 2026 — апрель 2026*  
*Составлен: PotBot team (YD811)*
