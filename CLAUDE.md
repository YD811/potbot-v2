# PotBot v2 — Project Memory

> Этот файл нужно положить в корень проекта `potbot-v2/CLAUDE.md`.
> Claude будет читать его автоматически в каждой сессии.

## Проект
**PotBot v2** — групповые торговые вoлты на Solana  
**GitHub**: YD811/potbot-v2  
**Хакатон**: Solana Frontier 2026  
**Владелец**: Yehor (YD811, eeegordolinskiy@gmail.com)

## Стек
- Solana + Anchor 0.30 (Rust smart contracts)
- Next.js 14 App Router + TypeScript + Tailwind
- TanStack Query v5, Zustand (mock mode)
- Jupiter API v6 (swaps), Jupiter Price API v2 (prices)
- @solana/wallet-adapter

## Ключевые команды
```bash
npm run dev          # запуск web (apps/web/, порт 3000)
anchor build         # компиляция контрактов (packages/program/)
anchor deploy --provider.cluster devnet   # деплой на девнет
solana airdrop 2 --url devnet             # SOL на девнет
```

## Архитектура
- `apps/web/src/lib/mock-store.ts` — Zustand стор (demo-режим без кошелька)
- `apps/web/src/hooks/usePots.ts` — автопереключение mock ↔ on-chain
- `apps/web/src/lib/ai-agent.ts` — rules engine для AI-агента
- `packages/program/programs/pot_vault/` — основной Anchor-контракт

## Дизайн
- Dark background: `#0D1117`, Card: `#111827`, Border: `#1A2332`
- Solana Green: `#14F195`, Solana Purple: `#9945FF`
- CSS-классы: `card`, `btn-primary`, `btn-secondary`, `input`

## Как пушить на GitHub
- owner: "YD811", repo: "potbot-v2", branch: "main"
- Через `mcp__github__push_files` или `git push origin main`

## Protocol-integration skills (Sendai)
**Marketplace**: `sendaifun/skills` — AI-native best-practices для 45+ Solana-протоколов.
Install via Claude Code: `/plugin marketplace add sendaifun/skills` then
`/plugin install <name>` per protocol.

Claude must consult these skills when touching the relevant code paths — they
capture SDK/endpoint best practices that drift out of date in tutorials.

| Skill | Plug in when editing |
|------|---------------------|
| `jupiter` | `apps/web/src/lib/jupiter-*.ts`, `apps/web/src/components/JupiterSwapPanel.tsx`, `packages/program/programs/pot_vault/src/instructions/execute_swap.rs` |
| `pyth`    | `apps/web/src/lib/pyth.ts`, keeper oracle path, proposal_swap price-feed guard |
| `meteora` | DLMM/DAMM yield strategies (`yield_strategy`, unwind path) |
| `kamino`  | Lending-based yield strategies, CPI into Kamino reserves |
| `helius`  | RPC config, webhook pipelines, priority fees |
| `squads`  | Pot authority multisig (task #15, mainnet prereq) |
| `phantom-connect` | Wallet connection flow in `apps/web` |
| `metaplex` | Tamagotchi NFT mint + metadata (`mint_tamagotchi_nft`) |
| `raydium` | If we add Raydium routing fallback alongside Jupiter |
| `solana-kit` + `solana-kit-migration` | Reference for eventual web3.js v1 → @solana/kit migration |
| `coingecko` | Price data fallbacks outside Jupiter Price API |
| `orca` | Whirlpools concentrated-liquidity if we add it |
| `pumpfun` | Only if we integrate pump.fun launches (not current scope) |

Local copies live in `POTBOT_OPUS/.claude/skills/sendai/` so Claude can read the
SKILL.md files directly even without the marketplace installed.

## solana.new journey skills (superstack)
Installed via `curl -fsSL https://www.solana.new/setup.sh | bash` into
`~/.claude/skills/` and `~/.codex/skills/`. 33 interactive skills that walk
through idea → build → launch. Trigger via slash-command in Claude Code.

**Most relevant to PotBot right now (hackathon deadline 2026-05-11):**

| Slash command | When to use |
|---------------|-------------|
| `/submit-to-hackathon` | Prepare Solana Frontier / Colosseum entry — project description, demo video plan, judging-criteria mapping |
| `/create-pitch-deck`   | Investor-grade deck for Superteam NL grant + hackathon |
| `/deploy-to-mainnet`   | Phase-5 mainnet cut checklist (audit, Squads, Helius) |
| `/apply-grant`         | Superteam NL grant application |
| `/marketing-video`     | Demo video script + shot list (< 3 min, judges) |
| `/video-craft`         | Produce the demo video (editing guidance) |
| `/roast-my-product`    | Brutal critique of the current dApp to surface holes before judges do |
| `/product-review`      | Full product review — UX, technical, positioning |
| `/review-and-iterate`  | Post-critique iteration loop |
| `/debug-program`       | Anchor program debugging (Phase 5 catches, account shape drift) |
| `/build-defi-protocol` | Reference patterns when adding yield strategies / new primitives |
| `/frontend-design-guidelines` | UI polish pass before submission |
| `/design-taste`        | Design-quality check |
| `/number-formatting`   | Numbers/currency formatting consistency (common judge gripe) |
| `/page-load-animations`| Perceived-performance polish |
| `/cso`                 | Chief Security Officer review — vulnerability pass before mainnet |

**Not relevant for PotBot now** (idea/scaffold already done):
`/find-next-crypto-idea`, `/validate-idea`, `/scaffold-project`, `/launch-token`,
`/build-mobile`, `/build-data-pipeline`.

Full catalog lives at https://github.com/sendaifun/solana-new.
Ecosystem data under `~/.claude/skills/data/` (colosseum, defi, ideas,
solana-knowledge, specs) — Claude can read those directly for grounded context.

## Статус
- Mock режим: ✅ полностью работает (6 seed-потов)
- Leaderboard: ✅ /leaderboard
- AI Agent: ✅ rules engine + UI panel
- Governance: ✅ quorum/approval/risk настройки
- Budget Grants: ✅ 3-step wizard
- Proposal PnL FOMO: ✅ Jupiter Price API
- On-chain (devnet): ⬜ нужно задеплоить