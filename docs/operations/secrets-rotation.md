# Secrets Rotation — pre-release working keys

> Living doc. Last updated 2026-04-26.
>
> This file lists secrets that were used during pre-release development and **must be rotated** before, during, or immediately after public release. Each row has a date the secret was first introduced, a date it should be rotated by, and the rotation procedure.

## Why this exists

During the Solana Frontier 2026 push, the team (currently solo: YD) shared some secrets through chat / terminal sessions to wire up dependencies fast. That's a reasonable pre-release tradeoff, but those secrets must not survive into public release. This doc tracks the cleanup commitment so it doesn't get forgotten.

## Active rotation queue

| Secret | Where used | Introduced | Rotate by | Procedure |
|---|---|---|---|---|
| **Supabase `service_role` key** | `apps/keeper/.env` → `SUPABASE_SERVICE_KEY` | 2026-04-26 (pasted in chat) | **2026-05-11** (hackathon release) | Supabase dashboard → Settings → API → Reset `service_role` JWT. Update `.env`. Verify keeper boots: `curl localhost:8787/health`. |
| **Supabase `anon` key** | `apps/web/.env.local` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 2026-04-26 (pasted in chat) | **2026-05-11** | Same dashboard → Reset `anon` JWT. Update `.env.local`. Test web: visit `/leaderboard`, confirm Supabase queries succeed. |
| **npm Automation token** (`npm_NdI0Dl...niqC`, redacted suffix) | `~/.npmrc` + GitHub Actions secret `NPM_TOKEN` | ~2026-04-25 | **2026-05-11** | npm.com → Account → Access Tokens → Revoke old. Generate new Automation token (auto-bypasses 2FA). Update `~/.npmrc` AND GitHub Actions `NPM_TOKEN` secret. Trigger a no-op tag (`mcp-v0.6.1` patch) to verify publish works. |
| **GitHub PAT** (if any was pasted) | local git credential | varies | **2026-05-11** | GitHub → Settings → Developer settings → Tokens (fine-grained) → Revoke old, generate new. Replace via `gh auth login`. |

## Procedure — common steps after rotating any of the above

1. Update local `.env` / config files with the new value.
2. Update Render dashboard env vars (if the hosted MCP / keeper / web is on Render).
3. Update GitHub Actions secrets (`gh secret set NAME --body=- < file`).
4. Restart any running keeper / MCP HTTP service.
5. Confirm an end-to-end smoke check passes (cron job runs, web page loads, MCP tool responds).
6. Once verified, **redact the relevant chat transcript / session log** so the old secret doesn't survive in plaintext:
   ```bash
   # Claude Code session logs (contain the chat transcripts)
   ls /Users/yegordo/.claude/projects/-Users-yegordo-potbot-v2/*.jsonl
   # Inspect, redact secrets in-place if any pre-release keys appear, or delete the file entirely if the session is no longer needed for context.
   ```
7. Mark the row above as ✅ rotated and move it to "History".

## History (rotated)

*(none yet — populate as rotations happen)*

## Reminder schedule

- A Claude memory entry has been written: `project_supabase_keys_rotate_after_release.md`. Future Claude sessions will surface this on the first session after release date 2026-05-11.
- Optional: schedule a one-shot cron via `/loop` or CronCreate to remind on 2026-05-12 morning.

## Hardening for next pre-release

After rotation:
- Adopt **1Password CLI** or **dotenvx** for secret distribution. Stop pasting raw keys in chat.
- For CI: store all secrets in GitHub Actions secrets, never inline.
- For local dev: `direnv` + `.envrc` (gitignored) per app.
- For shared deploys (Render / Fly): dashboard env vars only, with rotation reminders set in the platform.
