# PotBot v2 — Hackathon Task Tracker
> Solana Frontier 2026 | GitHub: YD811/potbot-v2

---

## 🔴 КРИТИЧНО — нужно для сабмита

- [ ] **Devnet deploy** — задеплоить pot_vault программу на devnet
  - `cd packages/program && anchor build && anchor deploy --provider.cluster devnet`
  - Скопировать Program ID в `packages/sdk/src/index.ts` и `.env.local`
  
- [ ] **E2E тест на devnet** — создать пот, задепозитить, создать пропозал, проголосовать, выполнить
  
- [ ] **Демо-видео** — 3-5 минут: создание пота, пропозал, голосование, исполнение свапа
  
- [ ] **Submission форма** — заполнить форму на сайте хакатона

---

## 🟡 ВАЖНО — делает проект сильнее

- [ ] **Настоящий Jupiter swap** — подключить Jupiter API v6 в `execute_swap` инструкцию
  - Endpoint: `https://quote-api.jup.ag/v6/quote` → `/swap`
  - Сейчас: мок-свап в execute_proposal.rs

- [ ] **SwapPanel доработка** — Token selector с live ценами, slippage настройка

- [ ] **Mobile UI** — проверить и починить mobile layout (особенно вкладки пота)

- [ ] **Withdraw механика** — проверить что withdraw работает на chain

- [ ] **Membership flow** — invite / join request / approve для публичных потов

---

## 🟢 УЛУЧШЕНИЯ — если есть время

- [ ] **Notifications** — уведомления в браузере когда AI агент делает пропозал

- [ ] **Portfolio view** — суммарный PnL всех позиций пота (уже есть PnLDashboard)

- [ ] **Token-gate** — проверять holdings при вступлении (BONK, JUP и т.д.)

- [ ] **Tamagotchi эволюция** — анимации при level up

- [ ] **Landing page** — обновить apps/landing с новыми фичами

- [ ] **Telegram bot** — интегрировать apps/bot с реальным ботом

- [ ] **Mainnet** — после хакатона

---

## ✅ ГОТОВО

- [x] Pot creation modal (public/private, yield, governance level)
- [x] Mock mode (6 seed pots, proposals, members)
- [x] Governance proposals + voting (shares-weighted)
- [x] GovernanceSettings (quorum %, approval %, risk profiles)
- [x] Budget grant proposal wizard
- [x] AI Agent rules engine + UI (strategy/rules/log)
- [x] Proposal PnL tracking + FOMO alert
- [x] Leaderboard page (public pots, sorting)
- [x] Navbar с leaderboard ссылкой
- [x] GitHub repo: YD811/potbot-v2

---

## 📅 Timeline

| Дата | Цель |
|------|------|
| Сейчас | Devnet deploy + E2E тест |
| +1 день | Демо-видео + Jupiter реальный |
| +2 дня | Mobile UI + polish |
| Дедлайн | Submission |