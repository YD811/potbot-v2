# PotBot v2 — Project Memory

> Этот файл лежит в корне `potbot-v2/CLAUDE.md`.
> Claude читает его автоматически в каждой сессии.

## Проект
**PotBot v2** — **инфраструктура для группового управления капиталом на Solana**. От клуба друзей с $500 до institutional family office — один протокол, разные параметры governance.
**GitHub**: YD811/potbot-v2
**Лендинг**: [potbot.fun](https://potbot.fun)
**Хакатон**: Solana Frontier 2026
**Владелец**: Yehor (YD811, eeegordolinskiy@gmail.com)

> Полная документация — [docs/OVERVIEW.md](docs/OVERVIEW.md). Начинать любую новую работу над репо с её чтения.

## Стек
- Solana + Anchor 0.30 (Rust smart contracts — `packages/program/`)
- Next.js 14 App Router + TypeScript + Tailwind (`apps/web/`)
- Hono.js + Node.js + PostgreSQL + Redis (`apps/api/`)
- TanStack Query v5, Zustand (mock mode для UI без кошелька)
- Jupiter API v6 (swaps), Jupiter Price API v2 (prices)
- @solana/wallet-adapter · Privy (embedded wallets)
- MCP server на solana-agent-kit (`apps/potbot-mcp/`)

## Ключевые команды
```bash
npm run dev          # запуск web (apps/web/, порт 3000)
anchor build         # компиляция контрактов (packages/program/)
anchor deploy --provider.cluster devnet   # деплой на девнет
solana airdrop 2 --url devnet             # SOL на девнет
```

## Архитектура

### Фронтенд (`apps/web/`)
- `src/lib/mock-store.ts` — Zustand стор (demo-режим без кошелька, 6 seed-потов)
- `src/hooks/usePots.ts` — автопереключение mock ↔ on-chain по наличию задеплоенной программы
- `src/lib/ai-agent.ts` — rules engine для AI-агента (price/time/balance/pnl triggers)
- `src/hooks/useAIAgent.ts` — 60-сек cron, оценивает правила, создаёт proposals
- `src/app/pots/[pubkey]/page.tsx` — главная страница пота (7+ табов: overview, shares, positions, strategy, governance, agent, members)
- `src/components/AIAgentPanel.tsx` — UI агента (strategy/rules/log)
- `src/components/GovernanceSettings.tsx` — quorum / approval / risk caps

### Бэкенд (`apps/api/`)
- Hono.js REST — `/price`, `/pots`, `/vaults`, `/analytics`, `/agent`, `/voter`
- Cron: `agent-cron.ts` (60s), `price-poller.ts` (5s), `crank.ts` (fees, evolution, NFT burns)

### Контракты (`packages/program/`)
- `programs/pot_vault/` — основная программа (vault, governance, strategy, referral, Money Tree)
- `programs/pot_duel/` — 1v1 duel vaults (разблокируется на Bloom+)
- `src/state/pot.rs` — `PotAccount` (включая `health_hp`, `peak_balance`, `is_dead`, `season`)
- `src/state/proposal.rs` — `ProposalAccount` (с `risk_class` для defensive-only режима)
- `src/state/voter.rs` — `VoterDelegationAccount` (новое, для Personal AI Voters)
- `src/instructions/` — все инструкции

## Ключевые концепции — единственный источник правды

### On-chain custody vs off-chain accounting
**Ваулт всегда on-chain** (PDA на Solana, создаётся в `create_pot`).
**Только учёт шейров** живёт off-chain на Seedling-стадии — это compromise для экономии SPL-rent и для гибкости при будущем токен-лаунче пота. На Sprout+ шейры мигрируют в on-chain SPL mint через `init_share_mint` инструкцию.
⚠️ Никогда не формулируй это как "custodial" или "pending on-chain". Custody ВСЕГДА on-chain.

### Money Tree (Season 1: Plants)
Шесть стадий с порогами AUM/members/trades: Seedling → Sprout → Bud → Bloom → Full Bloom → Mature Tree. У каждого пота есть Health (0–100 HP), вычисляется как `clamp(0, 100, 100 * current_balance / peak_balance)`. На 0 HP пот "умирает" — trading locked, NFT Strategy Shares сгорают, нужен `resurrect_pot` + свежий депозит (стадия сбрасывается в Seedling).

### Personal AI Voters
Уникальная фича — каждый член может зарегистрировать AI-агент wallet как своего делегата голосования. Делегация per-pot, revocable on-chain, каждый голос подписывается on-chain с reason string. Правила живут в `rules_uri` (IPFS/Arweave/https); on-chain программа им доверяет, misbehaving AI видно по логам и быстро revoke'ается.

### Governance
L0 Autocracy · L1 Advisory (25% veto) · L2 Majority (>50%) · L3 Supermajority (>66%) · L4 Consensus (100%). Сверху накладываются опциональные риск-капы: `max_swap_pct`, `max_budget_grant_pct`, `require_admin_cosign`, `timelock_seconds`. При низком HP пот автоматически уходит в defensive-only mode на уровне программы.

## Дизайн
- Dark background: `#0D1117`, Card: `#111827`, Border: `#1A2332`
- Solana Green: `#14F195`, Solana Purple: `#9945FF`, Muted: `#6B7280`
- CSS-классы: `card`, `btn-primary`, `btn-secondary`, `input`, `glow-green`
- Money Tree emoji: 🌱 🌿 🌳 🌺 🌸 🌴 (стадии 0–5)
- Health indicator: 🟢 🟡 🟠 🔴 ☠️

## Как пушить на GitHub (из Cowork sandbox)
- Прямого `git push` из sandbox нет (нет GitHub credentials)
- **Правильный способ**: использовать GitHub REST API через fine-grained PAT (`Contents: Read and write` на `YD811/potbot-v2`)
- Делать один коммит через Git Data API: create blobs → create tree (с `base_tree`) → create commit → PATCH `git/refs/heads/main`
- Токен передаётся пользователем разово в чат, sandbox не хранит его между сессиями

## PotBot v1 vs v2
**Это два независимых продукта.**
- v1 — Telegram-native group trading bot, репо `YD811/potbot_test` (приватный), custodial-style
- v2 — Solana DApp + MCP server, этот репо, non-custodial on-chain vault
- Пот в v1 ≠ пот в v2. State не шарят. Миграция данных запланирована на Q4 2026.
- `apps/bot/` в v2 — это **будущий v2 Telegram-фронтенд**, использующий `@potbot/sdk` (v2 SDK), не v1.

## Protocol-integration skills (Sendai)
**Marketplace**: `sendaifun/skills` — AI-native best-practices для 45+ Solana-протоколов.
Install via Claude Code: `/plugin marketplace add sendaifun/skills` then
`/plugin install <name>` per protocol.

Claude должен консультироваться с этими skills при работе с релевантными кодовыми путями — они содержат актуальные SDK/endpoint best practices, которые устаревают в туториалах.

| Skill | Плагин when editing |
|------|---------------------|
| `jupiter` | `apps/web/src/lib/jupiter-*.ts`, `JupiterSwapPanel.tsx`, `execute_swap.rs` |
| `pyth`    | `apps/web/src/lib/pyth.ts`, oracle keeper, proposal_swap price-feed guard |
| `meteora` | DLMM/DAMM yield strategies (`yield_strategy`, unwind path) |
| `kamino`  | Lending-based yield strategies, CPI into Kamino reserves |
| `helius`  | RPC config, webhook pipelines, priority fees |
| `squads`  | Pot authority multisig (task #15, Mature Tree / mainnet prereq) |
| `phantom-connect` | Wallet connection flow в `apps/web` |
| `metaplex` | NFT Strategy Shares — минт + metadata (Full Bloom+) |
| `raydium` | Fallback роутинг наряду с Jupiter |
| `solana-kit` + `solana-kit-migration` | Рефер для web3.js v1 → @solana/kit миграции |
| `coingecko` | Price data fallback за пределами Jupiter Price API |
| `orca` | Whirlpools CL — если добавим |
| `pumpfun` | Только если интегрируем pump.fun лаунчи (не в текущем скопе) |

Локальные копии в `POTBOT_OPUS/.claude/skills/sendai/` — Claude может читать SKILL.md напрямую даже без установленного marketplace.

## solana.new journey skills (superstack)
Installed via `curl -fsSL https://www.solana.new/setup.sh | bash` → `~/.claude/skills/` и `~/.codex/skills/`. 33 интерактивных skills от idea до launch. Триггер — slash-command в Claude Code.

**Приоритетные для PotBot прямо сейчас (дедлайн хакатона 2026-05-11):**

| Slash | Когда |
|---|---|
| `/submit-to-hackathon` | Подготовка заявки Solana Frontier / Colosseum |
| `/create-pitch-deck` | Investor-grade дек для Superteam NL grant + хакатона |
| `/deploy-to-mainnet` | Phase-5 mainnet чеклист (audit, Squads, Helius) |
| `/apply-grant` | Superteam NL grant заявка |
| `/marketing-video` | Demo video script + shot list (< 3 мин, для судей) |
| `/video-craft` | Продакшн демо-видео |
| `/roast-my-product` | Жёсткая критика текущего DApp |
| `/product-review` | Полный product review — UX, tech, positioning |
| `/review-and-iterate` | Post-critique iteration loop |
| `/debug-program` | Anchor program debugging (Phase 5 catches) |
| `/build-defi-protocol` | Паттерны при добавлении yield strategies |
| `/frontend-design-guidelines` | UI-полировка перед submission |
| `/design-taste` | Design-quality check |
| `/number-formatting` | Форматирование чисел (common judge gripe) |
| `/page-load-animations` | Perceived-performance polish |
| `/cso` | Security review перед mainnet |

**Не релевантно сейчас** (idea/scaffold готовы): `/find-next-crypto-idea`, `/validate-idea`, `/scaffold-project`, `/launch-token`, `/build-mobile`, `/build-data-pipeline`.

Full catalog — https://github.com/sendaifun/solana-new.
Ecosystem data в `~/.claude/skills/data/` (colosseum, defi, ideas, solana-knowledge, specs).

## Статус (апрель 2026)
- ✅ Mock режим полностью работает (6 seed-потов)
- ✅ Leaderboard `/leaderboard` с live аналитикой
- ✅ AI Agent rules engine + UI
- ✅ Governance quorum/approval/risk
- ✅ Budget Grants 3-step wizard
- ✅ Jupiter Price API для PnL FOMO
- ✅ MCP server (`apps/potbot-mcp`) — 15+ tools
- ✅ Backend API (`apps/api`) — price oracle, PnL, agent cron
- ✅ Devnet deploy (программа жива)
- ✅ Pitch deck (11 slides)
- 🔴 **Blocker**: Jupiter swap CPI нужен executor wallet
- 🟡 Personal AI Voters — спека готова, имплементация Q3 2026
- 🟡 Money Tree Health + death mechanics — схема в контракте, UI в работе
- 🟡 Off-chain → on-chain share graduation (`init_share_mint`) — Q2 2026
- - 📅 Demo video — May 6–8
- 📅 Hackathon submission — May 11, 2026

## Изменения CI/CD (апрель 25, 2026)

- ✅ CI исправлен: заменён `actions-rs/toolchain@v1` → `dtolnay/rust-toolchain@stable`
- - ✅ Добавлен шаг `solana-keygen new` для создания dummy keypair (фикс Invalid Base58, Issue #17)
  - - ✅ Добавлен Cargo cache для ускорения anchor build
    - - ✅ Добавлен `api-typecheck` job (проверка TypeScript в apps/api)
      - - ✅ Добавлен `security-audit` job (npm audit --audit-level=high)
        - - ✅ anchor-build: `continue-on-error: true` до стабилизации devnet deploy
          - - ✅ Node.js downgraded с 24 → 20 LTS для стабильности
           
            - ## Ключевые файлы (обновлено апрель 2026)
           
            - - `.github/workflows/ci.yml` — исправлен CI пайплайн (5 jobs)
              - - `docs/MCP.md` — новый полный гайд по MCP серверу + x402
                - - `README.md` — добавлен раздел "For Judges", статус таблица, tech stack
                  - - `TASKS.md` — полный трекер задач до May 11
                   
                    - ## Следующий приоритет (для Claude в следующей сессии)
                   
                    - 1. **Executor wallet** — задеплоить apps/api на Fly.io, добавить EXECUTOR_KEYPAIR в env
                      2. 2. **E2E devnet тест** — прогнать `scripts/e2e-devnet.ts` после executor deploy
                         3. 3. **Branch protection** — включить в Settings → Branches (require PR + passing CI)
                            4. 4. **Merge PR #18, #21, #27** — смёрджить открытые PRы с on-chain execute path
                               5. 5. **Demo video** — May 6–8, сценарий: create_pot → AI proposal → vote → real swap
- 🟢 Demo video — May 6–8
- 📅 Hackathon submission — 2026-05-11
