# PotBot — On-chain Architecture & Privacy Model

> Канонический reference: что живёт on-chain, что off-chain, и почему именно так.
> Цель — максимизировать on-chain storage в рамках безопасности и перфоманса; baseline privacy для всех потов; maximum privacy как opt-in для приватных потов.

## Tier-модель — что где и почему

| Tier | Где | Что | Почему именно тут |
|---|---|---|---|
| **0 — Trust spine** | On-chain regular accounts | Custody (vault PDA), authority, governance level/quorum/risk-caps, allowed_mints, paused, defensive_only, member shares (Sprout+ via SPL mint), proposals + votes, `MemberDelegate`, Money Tree state (stage/HP/peak/is_dead), strategy triggers, treasury/fee_reserve | Если этим могут манипулировать off-chain — protocol сломан. Нет компромиссов. |
| **1 — Audit & evolution** | On-chain, но cheaper (Light Protocol Compressed Accounts / Anchor events) | Каждый swap/deposit/withdraw event, NAV snapshots, `proposal_description_hash`, `rules_uri_hash`, vote rationale string (≤200 chars), kill-switch invocations | Нужно для audit-trail и compromise-detection, но read-pattern — append-only, поэтому ZK Compression снижает rent в ~5000× |
| **2 — Commitments** | On-chain hash-only | Hash полного proposal description, hash strategy params (private mode), hash rules JSON, Merkle root of member set (private mode) | Доказывает «это та самая версия», без хранения тяжёлых данных on-chain |
| **3 — Off-chain (anchored)** | IPFS/Arweave + Postgres | Полный текст proposals/rationale, AI rules JSON, encrypted strategy blobs, leaderboard cache, chat, push, аналитические графы | Большие/изменчивые данные. Нельзя silently подменить — hash в Tier 2 защищает от подделки. |

**Правило отнесения:** если придётся доверять off-chain endpoint'у для безопасности средств — это Tier 0. Если только для UX — Tier 3.

---

## Концретный on-chain layout (что добавить к текущему)

### Что уже on-chain ✅
`PotAccount`, `MemberAccount` (Sprout+), `ProposalAccount`, `VoterRecord`, `MemberDelegate`, vault PDA, fee_reserve.

### Что добавить — Tier 0/1

```rust
// PotAccount additions
pub struct PotAccount {
    // ... existing fields ...
    pub privacy_mode: PrivacyMode,        // Public | AuditablePrivate | SealedPrivate
    pub member_set_root: [u8; 32],        // Merkle root, only used in private modes
    pub strategy_params_hash: [u8; 32],   // hash of encrypted strategy blob
    pub rules_uri_hash: [u8; 32],         // hash of off-chain AI rules JSON
    pub kill_switch_admin: Pubkey,        // separate from authority for safety
    pub last_health_check_slot: u64,
    pub max_drawdown_bps: u16,            // auto-pause if breached
    pub treasury_split_bps: TreasurySplit,// fee_reserve / yield / dev — on-chain config
}

// New: SwapEvent compressed account (Light Protocol)
pub struct SwapEvent {
    pub pot: Pubkey,
    pub proposal_id: Option<u64>,         // None for AdminDirect
    pub from_mint: Pubkey,
    pub to_mint: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub price_at_exec: u64,               // Pyth-verified, scaled
    pub slot: u64,
    pub mode: SwapMode,                   // Admin | Proposal | StrategyTrigger
    pub triggered_by: Option<Pubkey>,     // keeper, if StrategyTrigger
}

// New: NavSnapshot compressed account (per epoch — daily)
pub struct NavSnapshot {
    pub pot: Pubkey,
    pub epoch: u32,
    pub total_value_lamports: u64,
    pub holdings_hash: [u8; 32],          // hash of (mint, amount)[]
    pub slot: u64,
}
```

`SwapEvent` и `NavSnapshot` через **Light Protocol ZK Compression** — стоимость ~$0.000005 per write вместо ~$0.002. Сохраняет audit-trail без exponential rent burn.

### `ProposalAccount` — добавить
```rust
pub description_uri: String,              // ipfs:// or ar://
pub description_hash: [u8; 32],           // verifiable
pub rationale_hash: [u8; 32],             // hash of AI's reasoning
pub commit_phase_end: Option<i64>,        // SealedPrivate only
pub reveal_phase_end: Option<i64>,        // SealedPrivate only
```

---

## Три privacy-режима

| Режим | Members visible | Balances visible | Votes visible | Strategy params visible | When to use |
|---|---|---|---|---|---|
| **Public** (default) | ✅ pubkeys + shares | ✅ vault balance + holdings | ✅ instant on submission | ✅ | Public clubs, leaderboard pots, marketing |
| **Auditable-Private** | ❌ stealth addrs / shielded deposit via PrivacyCash | ✅ aggregate vault still public | ✅ instant но pubkey стелсовый | ✅ | Family offices, group of friends with privacy preference |
| **Sealed-Private** | ❌ Merkle-set, only root on-chain | ⚠️ shielded balances via Light Protocol or PrivacyCash | 🔒 commit→reveal с timeout | 🔒 encrypted blob, hash on-chain, members share viewing key off-chain | DAOs trading sensitive theses, large funds wanting alpha not to leak |

### Auditable-Private — конкретика
- Deposits идут через **PrivacyCash** (или Elusiv-style shielded pool) → vault PDA. Связь "wallet X внёс N SOL" не отслеживается on-chain.
- Член регистрируется через ZK-proof что "я в whitelist (Merkle membership)" — pubkey, который видит chain, не связан с реальным владельцем.
- Все остальное (vault balance, swaps, proposals) public — это и есть "auditable": извне видно что pot делает, не видно кто в нём.

### Sealed-Private — конкретика
- **Commit-reveal voting:** Phase 1 — submit `H(vote || nonce)`. Phase 2 (после `commit_phase_end`) — reveal `(vote, nonce)`. Tally только после `reveal_phase_end`. Защищает от vote-following whales.
- **Strategy params encrypted:** AES-256 blob с symmetric key. Key shared членам через NaCl box зашифрованный их публичными ключами (в `MemberAccount.encrypted_viewing_key`). On-chain хранится только hash → нельзя silently подменить.
- **Shielded balances:** внутренний учёт через ZK Compressed accounts либо Light Protocol confidential transfer. Trade-off: при swap execute mints всё равно leak (т.к. Jupiter CPI требует pubkey). Mера защиты — batch-route через time-delayed mixer pool, чтобы корреляция «член → swap» размазалась.

---

## Performance plan

| Проблема | Решение |
|---|---|
| Rent burn от audit log (1000+ swaps в год на pot) | **Light Protocol ZK Compression** — `SwapEvent`, `NavSnapshot`, `VoterRecord` для большого pot'а в private mode |
| Iteration over 10K members в одной tx | Никогда. Member shares хранятся per-account, агрегаты (`total_shares`) обновляются дельтой |
| Leaderboard read над всеми pot'ами | Helius webhook → Postgres indexer. UI читает индексер, не RPC. On-chain — source of truth для проверки. |
| Jupiter swap tx > 1232 bytes (account list) | **Address Lookup Tables (ALT)** per pot для часто используемых mints |
| Compute budget на vote + delegate-check + tally update | Текущие ix < 60K CU, запас большой. Не проблема пока. |
| Time-to-finality для UX | Optimistic UI: показываем "pending" сразу после `confirmed`, на `finalized` подтверждаем. 400-600ms perceived. |
| Cold reads vault holdings | Dune SIM `/svm/balances` уже даёт cached aggregate, RPC fallback |

---

## Off-chain — что и где, с on-chain anchor

| Off-chain data | Где живёт | On-chain anchor |
|---|---|---|
| AI rules JSON (delegate behavior) | IPFS/Arweave | `MemberDelegate.rules_uri` + `rules_uri_hash` |
| Proposal description (long text) | IPFS | `ProposalAccount.description_uri` + `description_hash` |
| AI rationale per vote | Arweave (immutable) | `VoterRecord.rationale_hash` |
| Encrypted strategy params (private pot) | IPFS encrypted blob | `PotAccount.strategy_params_hash` |
| Member roster (private pot) | Off-chain Merkle tree, served via API | `PotAccount.member_set_root` |
| Chat / messages | Postgres + Redis | None — UX only |
| Historical NAV graph | Postgres timeseries (computed from on-chain `NavSnapshot`) | Источник — on-chain snapshots |
| Push notifications | Workers + Web Push | None |
| Leaderboard cache | Postgres (Helius webhook fed) | Источник — `getProgramAccounts` |
| User profile / display name | Postgres | None — purely cosmetic |

Принцип: если пользователь скажет «я не верю вашему серверу» — он должен иметь возможность из on-chain anchor'а **верифицировать** что off-chain blob аутентичный.

---

## Threat model — что какой tier защищает

| Угроза | Защита |
|---|---|
| Backend drains pot | Невозможно — authority = vault PDA, signs только программа по правилам |
| Backend silently changes governance quorum | Невозможно — Tier 0 на chain, никто кроме authority не пишет |
| Backend подменяет AI rules | Tier 2: `rules_uri_hash` зафиксирован on-chain, любое изменение → разрыв ссылки, видно сразу |
| Backend подделывает proposal description | Tier 2: `description_hash` |
| Frontend lies про proposal status | Невозможно — UI читает с RPC напрямую, backend out of trust path для core flows |
| Backend goes dark | Pot продолжает работать через любой Solana RPC + raw ix-builders из MCP. Backend = UX layer, не required path. |
| Single member выводит whale → манипуляция votes | Quorum + timelock + commit-reveal в private mode |
| AI делает rogue proposal | Risk caps on-chain (`max_swap_pct`, `max_budget_grant_pct`), defensive_only mode, `revoke_delegate` one ix away |
| Public pot → MEV/sandwich на swap | Use Jupiter с slippage on-chain enforce + Helius priority fee + private mempool (Jito) |
| Whale sees другие votes и copy-trades | Sealed-Private mode commit-reveal |
| Competitors видят strategy и копируют | Sealed-Private mode encrypted strategy blob |
| Регулятор видит кто в pot | Auditable-Private mode shielded deposits |

---

## Phasing — последовательность реализации

| Phase | Что | Когда | Risk |
|---|---|---|---|
| **0 — Hackathon (now)** | Все Tier 0 уже on-chain. Anchor events для Tier 1. Public mode only. | ✅ done | low |
| **1 — Q2 2026** | `init_share_mint` (member shares в SPL), Tier 1 на Light Protocol Compressed Accounts (`SwapEvent`, `NavSnapshot`), `description_hash`/`rules_uri_hash` коммиты, `max_drawdown_bps` auto-pause | post-hackathon | low — additive |
| **2 — Q3 2026** | Auditable-Private mode: PrivacyCash integration для deposits, Merkle membership proofs, stealth addresses в `MemberAccount` | Q3 | medium — нужен audit ZK circuits |
| **3 — Q4 2026** | Sealed-Private mode: commit-reveal voting, encrypted strategy params, shielded balances через Light Protocol confidential transfer | Q4 | high — UX complexity, key management |
| **4 — 2027** | Cross-pot composability (один член, много pots, единый view), DAO meta-governance, Squads v4 как `kill_switch_admin` для всех Sealed pots | 2027 | medium |

---

## PotBot-specifics — почему это правильная архитектура именно для бизнеса

1. **Money Tree state — целиком on-chain**, уже есть. Не выносить в off-chain никогда — это часть game theory, ставить под угрозу = убить core mechanic.
2. **Referral / Money Tree splits** — сделать **on-chain config struct** в `PotAccount` (`treasury_split_bps`), не magic numbers в backend. Иначе невозможно доказать пользователям что split fair.
3. **Health check как separate ix** — keeper crank `update_health()` пишет on-chain `health_hp` и `last_health_check_slot`. Если slot устарел > N — UI показывает «stale, kicking keeper». Это и safety и UX.
4. **AI rules versioning:** `rules_uri` = `ar://<arweave-tx>` (immutable). Member хочет обновить → новый ar tx → `register_delegate` ещё раз с новым URI. Старая версия forever audit-able. Дифференциатор vs competitors которые позволяют silently mutating rules.
5. **Kill switch отдельный от authority** — `kill_switch_admin` (operational wallet или Squads на mainnet). Может pause pot но **не drain**. Страховка от «AI delegate gone wrong» — пользователи доверяют операционной паузе, не доверяя custody.
6. **Private pots = premium tier** — Auditable-Private и Sealed-Private это monetization hook. Public pots free, private — subscription или per-pot one-time fee. Tech debt окупается revenue.

---

## Migration safety

При любом on-chain layout change через upgrade:
- **Append-only к `PotAccount`** — никогда не reorder/remove fields. Borsh decoders в MCP/SDK декодируют **prefix**, поэтому новые поля не ломают старые клиенты.
- **Discriminator-stable** — `sha256("account:PotAccount")[..8]` не меняется, существующие PDAs читаются без миграции.
- **Default-on-init** для новых полей через `init_if_needed`-style migration ix (`migrate_pot_v2`) который apply'ится при первом write после upgrade.
- Все breaking changes — через **новый аккаунт-тип** (`PotAccountV2`) и dual-read в SDK на время grace window'а.
