# `apps/api` — DEPRECATED

This Hono.js + Fly.io backend is **no longer the deploy target**. As of
2026-05-08 (PR landing alongside the IDL/drift cleanup) we serve everything
from Vercel:

- Public REST endpoints  →  `apps/web/src/app/api/*` (Next.js Route Handlers)
- Cron jobs              →  `apps/web/src/app/api/cron/*` + `vercel.json`
- Helius webhook indexer →  `apps/web/src/app/api/webhooks/helius/route.ts`

`api.potbot.fun` and `potbot-api.fly.dev` are not deployed. The Hono +
Fly.io stack has been replaced by Vercel Functions across the board:

| old (apps/api)                  | new (apps/web)                            |
| ------------------------------- | ----------------------------------------- |
| `routes/webhooks.ts` (Helius)   | `app/api/webhooks/helius/route.ts`        |
| `routes/agent.ts` (cron)        | `app/api/cron/agent-poll/route.ts`        |
| `routes/prices.ts`              | `app/api/prices/route.ts`                 |
| `services/jupiter-executor.ts`  | inlined where each route needs Jupiter    |

`apps/api/package.json` scripts are stubbed to `echo` no-ops so that
`turbo run build|lint|test|dev` from the repo root silently skips this
workspace. The source tree is kept as reference only — do not extend
it. Add new endpoints under `apps/web/src/app/api/`.
