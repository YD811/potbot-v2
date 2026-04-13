# PotBot — ETF-Like Community Token System

> **Концепция**: Каждый Пот — это мини-ETF. Шейры членов токенизируются в SPL-токен, который торгуется, передаётся и компонуется с DeFi. Pot = on-chain индексный фонд под управлением коллектива.

---

## 1. Проблема и инсайт

Традиционные групповые инвест-клубы в крипто:
- Существуют в Telegram, координация через чат
- Нет on-chain enforcement → организатор может уйти с деньгами
- Нет портативного proof of ownership → шейры не передаются
- Нет composability с DeFi → мёртвый капитал

**Инсайт от Mert / Creator ETF нарратив:**
> "Каждый Telegram-трейдер — это по сути портфельный менеджер. Если у него есть публичный трек-рекорд на цепи, он может привлекать деньги как настоящий фонд. PotBot даёт ему эту инфраструктуру."

Pot Token = on-chain акция группового фонда. Держишь токен → держишь долю в портфеле группы.

---

## 2. Архитектура: два режима пота

```
VIRTUAL MODE ─────── tokenize() ──────────────► TOKENIZED MODE
(off-chain shares)                              (on-chain SPL token)
     │                                                   │
     ├─ Shares в PotAccount.member_shares[]             ├─ SPL mint на каждый пот
     ├─ NAV рассчитывается программой                   ├─ Deposit → mintTo member ATA
     ├─ Нет on-chain токена                             ├─ Withdraw → burn + transfer
     └─ Хорошо для старта                               └─ Transferable, DeFi-composable
```

**Ключевой инвариант**: ликвидность (SOL/токены в vault) **никогда не двигается** при переходе между режимами. Меняется только слой ownership.

---

## 3. Механика NAV и шейров

### Share Price Formula
```
share_price = total_pot_value_lamports / total_shares
```

### Deposit (mint shares)
```
shares_to_mint = deposit_amount * total_shares / total_pot_value
```
При первом депозите: `share_price = 1.0`, shares = lamports.

### Withdraw (burn shares)
```
lamports_to_return = share_amount * total_pot_value / total_shares
```

### PnL Distribution
- Прибыль от трейда → NAV растёт → share_price растёт
- Количество шейров **не меняется** при торговле
- Каждый держатель шейров автоматически получает пропорциональный PnL

**Пример:**
```
Initial: 3 members, 1000 shares each, NAV = 3 SOL, price = 0.003 SOL/share
Trade: +50% return → NAV = 4.5 SOL
New price = 4.5 / 3000 = 0.0015 SOL/share

Alice's value = 1000 * 0.0015 = 1.5 SOL (was 1.0 SOL) → +50% PnL ✓
```

---

## 4. On-Chain State Changes (Anchor)

### PotAccount новые поля (уже реализовано)
```rust
pub enum PotMode { Virtual, Tokenized }

// Добавлено в PotAccount:
pub mode: PotMode,                    // текущий режим (default: Virtual)
pub token_mint: Option<Pubkey>,       // SPL mint (только в Tokenized режиме)
pub nav_per_share_bps: u64,           // текущий NAV/share в bps (10000 = 1.0)
#[max_len(10)] pub token_ticker: String,
// Meteora yield:
pub meteora_vault: Option<Pubkey>,
pub meteora_lp_mint: Option<Pubkey>,
pub meteora_lp_balance: u64,
pub total_yield_earned: u64,
pub yield_reserve_pct_bps: u16,
```

### ProposalType расширения (уже реализовано)
```rust
TokenizePot { #[max_len(10)] ticker: String },
DepositToYield { meteora_vault: Pubkey, amount: u64 },
WithdrawFromYield { lp_amount: u64 },
```

---

## 5. Token Economics

### Токен Пота
- **Ticker**: задаётся при создании TokenizePot proposal (max 10 chars)
- **Total Supply**: = total_shares на момент токенизации
- **Decimals**: 6 (как USDC, для точности)
- **Mint Authority**: PDA программы → только программа может минтить/бёрнить
- **Freeze Authority**: None (censorship-resistant)

### После токенизации
| Действие | До | После |
|----------|-----|-------|
| Deposit | member.shares += X | mintTo(member_ata, X) |
| Withdraw | member.shares -= X | burn(member_ata, X) → transfer lamports |
| Trade profit | share_price растёт | share_price растёт (то же) |
| Transfer share | ❌ нельзя | ✅ standard SPL transfer |

### Вторичный рынок
После токенизации токен автоматически появляется в:
- Jupiter terminal (swap через любой DEX)
- Birdeye / DexScreener (price chart)
- Любой Solana wallet (Phantom, Backpack, etc.)

---

## 6. Creator ETF Нарратив

**Публичная страница пота**: `potbot.fun/[pot-name]`

Показывает:
- Performance chart (NAV over time)
- Current holdings (portfolio breakdown)
- Member count + total AUM
- Strategy description
- Token address + buy link (через Jupiter)

**Кто может создать Creator ETF:**
- KOL с торговой историей → создаёт пот → токенизирует → followers покупают токен
- Trading group → превращает Telegram-DAO в реальный on-chain фонд
- DeFi degens → pooling capital for bigger position sizes

**Revenue для PotBot:**
- 0.1% от объёма торгов через пот
- 10% от performance fee (выше high water mark)
- 0.5% mint fee при токенизации
- SaaS: $29/мес для Creator ETF с analytics dashboard

---

## 7. Governance для токенизации

Токенизация — необратимое действие, требует governance vote:

```
Members vote on TokenizePot proposal
  gov_level = settings_change_level (default: supermajority 66%)
  quorum_bps = 5001 (50%+ must participate)
  
On approval:
  → execute_proposal() handles TokenizePot
  → pot.mode = Tokenized
  → pot.token_ticker = ticker
  → separate tokenize_pot instruction mints SPL tokens (Phase 2)
```

---

## 8. Frontend изменения

### Pot detail page (`/pots/[pubkey]`)
- Новый badge: `VIRTUAL` | `TOKENIZED 🪙`
- В TOKENIZED режиме: кнопка "Buy on Jupiter" → прямая ссылка
- Token address с copy button
- Price chart (Jupiter Price API по mint адресу)

### Overview tab
- NAV per share (в SOL и USD)
- Share price chart (исторический)
- "Tokenize this Pot" CTA (если Virtual + имеешь права)

---

## 9. Roadmap

| Фаза | Что | Когда |
|------|-----|-------|
| 1 | Virtual shares (done) | ✅ |
| 2 | Governance vote TokenizePot (done) | ✅ |
| 3 | execute_proposal TokenizePot handler (done) | ✅ |
| 4 | tokenize_pot instruction — actual SPL mint CPI | Апрель 2026 |
| 5 | Deposit/withdraw in Tokenized mode | Май 2026 |
| 6 | Public Creator ETF pages potbot.fun/[name] | Май 2026 |
| 7 | Secondary market integration (Jupiter) | Post-hackathon |
| 8 | Performance fee collection | Post-hackathon |
