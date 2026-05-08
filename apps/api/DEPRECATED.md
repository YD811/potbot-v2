# `apps/api` — DEPRECATED

This Hono.js + Fly.io backend is **no longer the deploy target**. As of
2026-05-08 (PR landing alongside the IDL/drift cleanup) we serve everything
from Vercel:

- Public REST endpoints  →  `apps/web/src/app/api/*` (Next.js Route Handlers)
- Cron jobs              →  `apps/web/src/app/api/cron/*` + `vercel.json`
- Helius webhook indexer →  to be ported to `apps/web/src/app/api/webhooks/helius/route.ts` (TODO)

`api.potbot.fun` and `potbot-api.fly.dev` are not currently deployed. The
code in this directory is kept only as a reference for the `HeliusProcessor`
/ `JupiterExecutor` services that still need to be ported to Vercel
serverless equivalents.

Do not extend this directory. Add new endpoints under `apps/web/src/app/api/`.
