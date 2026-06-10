# Mainnet Readiness — pot_vault

*Status as of 2026-06-10. Companion to `docs/operations/deploy.md` (runbook) and
`docs/operations/POTBOT_DEPLOY_PROMPT.md` (the deploy session). Update this file as items close.*

**Bottom line: deploy is blocked ONLY by wallet funding (~5 SOL) and three 10-minute owner decisions (program keypair, upgrade authority, RPC key). Everything code-side is done.**

---

## Pre-flight checklist (from deploy.md §1)

| # | Item | Status | Owner / next action |
|---|---|---|---|
| 1 | `anchor build` clean | ✅ DONE | `anchor build --no-idl` clean on rustc 1.86; 1 known stack warning in `mint_tamagotchi_nft` (pre-existing, improved 6288→4848 bytes, cosmetic premium feature — split instruction post-launch) |
| 2 | `anchor test` green incl. security tests | ✅ DONE | 14 passing on localnet: sentinel/freeze, risk-param timelock, caps, double-execute, recipient enforcement, NAV/redeem, PDA snapshot (PR #69) |
| 3 | Security review — no Critical/High open | ✅ DONE | Adversarial pass on `solana-security-review` checklist: 0 Critical; 1 High + 2 Medium found and fixed in PR #69; formal third-party audit planned post-launch |
| 4 | `declare_id!` matches mainnet program keypair | ❌ TODO | **YD**: `solana-keygen new -o target/deploy/pot_vault-mainnet.json` → update `declare_id!` + `Anchor.toml [programs.mainnet]` → rebuild (deploy-mainnet.sh auto-syncs). 10 min, do in deploy session |
| 5 | SDK IDL + PDAs regenerated and matching | ✅ DONE | IDL refreshed via `packages/program/scripts/patch_idl.py` (anchor 0.30.1 IDL gen is broken on modern toolchains — see script header); synced to `packages/sdk` + `apps/web`. Re-run after the `declare_id` change (address field) |
| 6 | No secrets/keypairs in git | ✅ DONE | Env values scrubbed in `6385864`; `.env*` gitignored; verify once more in deploy session (`git log -S` spot check) |
| 7 | Upgrade authority chosen and documented | ❌ TODO | **YD decision**: recommended Squads v4 multisig (even 1-of-1 initially — upgradeable to real multisig later); alternative: cold keypair. Document choice here |
| 8 | Mock mode still works (demos/judges) | ✅ DONE | All pages 200 without wallet; mock store untouched by hardening; verified on PR #70 |
| 9 | Reliable mainnet RPC | ❌ TODO | **YD**: Helius paid tier (~$50/mo per economics model); put key in env, never in git |
| 10 | Deployer wallet funded | ❌ **THE blocker** | **YD**: ~3.5 SOL program rent + ~1.5 SOL buffer/priority fees |
| 11 | Executor/keeper wallet funded | ❌ **THE blocker** | **YD**: generate dedicated hot wallet (minimal scope, rotate-able), fund ~0.5 SOL — clears the Jupiter CPI gate |

## Post-merge prerequisites (before the deploy session)

- [ ] Merge PR #68 (ops package), PR #69 (security hardening), PR #70 (product/UX); main green.
- [ ] **Devnet re-deploy + pot recreation**: PotAccount layout grew in PR #69 — existing devnet pots are unreadable. `anchor deploy --provider.cluster devnet`, recreate seed/demo pots.
- [ ] Re-run `npm run build` + `anchor test` on merged main (CI covers this).

## Launch-day security tasks

- [ ] **Rotate Supabase keys** (service_role + anon) — they were exposed in a chat on 2026-04-26; rotation was deliberately deferred to release. Do it the same hour as launch.
- [ ] Set a **sentinel** on the flagship pot (separate key from authority) and configure `risk_param_timelock_secs` ≥ 24h + spending caps — eat our own dogfood, it's also the marketing story.
- [ ] Verify program on Explorer; pin program ID in README + site footer.

## Cost estimate

~3.5 SOL program rent (largely refundable on close) + ~1.5 SOL redeploy/priority-fee buffer + ~0.5 SOL executor + dust for PDA/mint rents ≈ **5–5.5 SOL total**.

## Deploy session

When wallets are funded: open a fresh Claude Code session with `docs/operations/POTBOT_DEPLOY_PROMPT.md` and follow `deploy.md` step by step. Items 4, 7, 9 above are resolved inside that session; this file is the entry gate.
