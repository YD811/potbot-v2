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

## Статус
- Mock режим: ✅ полностью работает (6 seed-потов)
- Leaderboard: ✅ /leaderboard
- AI Agent: ✅ rules engine + UI panel
- Governance: ✅ quorum/approval/risk настройки
- Budget Grants: ✅ 3-step wizard
- Proposal PnL FOMO: ✅ Jupiter Price API
- On-chain (devnet): ⬜ нужно задеплоить