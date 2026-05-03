# chore/codebase-map — onboarding map for parallel agents

## PROVENANCE

Брифинг синтезирован orchestrator-агентом из `CLAUDE.md` —
оригинальный prompt-блок не пришёл. Сверь scope с владельцем.
Неоднозначности → QUESTIONS внизу.

## РОЛЬ ВЕТКИ

Эта ветка — **источник контекста** для всех остальных параллельных
веток (`feat/swap-proposals`, `feat/leaderboard`, `feat/ai-tamagotchi`,
`chore/devnet-deploy`). Артефакты этой ветки (3 markdown файла) другие
агенты будут мёрджить себе перед стартом.

> Сделай эти три файла **первыми**, до любых code changes —
> остальные ветки уже стартовали и ждут их.

## SCOPE

Произвести три документа в `docs/`:

### 1. `docs/MAP.md` — карта репо

- Дерево `apps/`, `packages/`, `programs/`, `scripts/`, `docs/` —
  топ-2 уровня + краткое описание каждой папки в одну строку.
- Для каждого пакета: что он делает, на чём написан, кто его
  потребитель.
- Граф зависимостей `apps/web → @potbot/sdk → packages/program (IDL)`.
- Важные конфиги: `Anchor.toml`, `package.json` workspaces,
  `tsconfig.base.json` paths.

### 2. `docs/TODO.md` — backlog

- Сгруппированный по приоритету (хакатон 11 мая → mainnet → пост-launch)
- Для каждого пункта: ссылка на `CLAUDE.md`/issue/PR где он упомянут
- Помечать «🔴 blocker», «🟡 in-progress», «🟢 nice-to-have»
- Reflect 5 параллельных веток: статус каждой в отдельной строке

### 3. `docs/STATUS.md` — текущий снимок

- Версии: Anchor, Solana toolchain, Node, TypeScript
- Devnet program ID + last deploy slot/время (если можно достать)
- Открытые PR на момент записи (числа + статус)
- Зелёные / красные CI workflows
- Что демонстрируется в demo video (см. CLAUDE.md May 6–8)

## ИСХОДНИКИ ДЛЯ СБОРКИ

- `CLAUDE.md` — первичный источник
- `docs/OVERVIEW.md`, `docs/ARCHITECTURE.md`,
  `docs/ARCHITECTURE_ONCHAIN.md` — детали по модели
- `docs/PROGRAM_PHASE1.md` — план следующих изменений в программе
- `docs/HACKATHON_SUBMISSION.md`, `HACKATHON_SUBMISSION.md` (root)
- `TASKS.md` (root) — текущий tracker
- `package.json`, `apps/*/package.json`, `packages/*/package.json`
- `.github/workflows/*.yml`

## ACCEPTANCE

- [ ] Три файла созданы в `docs/`
- [ ] Каждый ≤ 300 строк, читается за < 5 мин
- [ ] Ссылки на пути в репо рабочие (relative)
- [ ] Закоммичено и запушено в `chore/codebase-map`
- [ ] В commit message указан хэш `CLAUDE.md` на момент сборки
      (`git rev-parse HEAD:CLAUDE.md`) — чтобы потом можно было
      понять, не устарела ли карта

## OUT OF SCOPE

- Не пиши код
- Не редактируй existing docs (кроме случая, когда там явная ошибка
  и поправка укладывается в один-два сntence)
- Не делай auto-generated dependency graph через npm tools — пиши руками,
  компактнее и точнее

## RULES (поверх .claude-squad-shared)

- Markdown, plain — без mermaid/diagrams (рендерит не везде)
- Без эмодзи, кроме иконок stage из CLAUDE.md (🌱🌿🌳🌺🌸🌴, 🟢🟡🟠🔴☠️)
  и priority меток (🔴🟡🟢)
- Conventional commit: `docs: add codebase map / todo / status`
- Один commit на все три файла, не размазывай

## QUESTIONS

- [ ] Должен ли `STATUS.md` авто-обновляться (через GitHub Action)
      или это разовый snapshot? По умолчанию — snapshot.
- [ ] Кто owner `TODO.md` — этот файл будет жить вечно или
      переедет в Linear/GitHub Projects после хакатона?

## RESULTS

- `docs/MAP.md` — _____ строк
- `docs/TODO.md` — _____ строк
- `docs/STATUS.md` — _____ строк
- `CLAUDE.md` hash на момент сборки: _____
