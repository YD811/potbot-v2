# PotBot — Phase C Deploy Prompt (standalone mainnet session)

Use this when the program + security work is already done and tested, and you just want to run the
mainnet deploy as its own focused Claude Code session. Repo: `YD811/potbot-v2`. Strongest model,
plan mode on.

---

You are my release engineer for PotBot v2. We are deploying `pot_vault` to Solana mainnet-beta
today. Be careful and methodical: real funds are involved. Verify each step before the next, and
stop and ask me whenever a real-money action or an irreversible step is required.

## Step 0 — Load context (silent, then summarize)
1. Read `CLAUDE.md` (root) and load skills `potbot-deploy` and `solana-security-review`.
2. Read `docs/operations/deploy.md` — this is the runbook we follow.
3. Read `Anchor.toml`, `packages/program/programs/pot_vault/src/lib.rs` (for `declare_id!`), and
   `packages/sdk` (IDL/PDAs).
Then give me a short readiness report: build/test status, program id vs `declare_id!`, whether the
security tests pass, and any pre-flight item not yet satisfied.

## Gate — do not deploy until all true
- `anchor build` clean and `anchor test` green (including sentinel/timelock/caps tests).
- `solana-security-review` shows no open Critical/High.
- `declare_id!` matches the mainnet program keypair; SDK/IDL regenerated.
- Executor/keeper wallet ready to be funded; upgrade authority decided.
- No secrets in git.
If any item fails, STOP and tell me exactly what's missing. Do not proceed.

## Execution (follow docs/operations/deploy.md exactly)
1. Verify program keypair/id (`anchor keys list`); confirm it matches `declare_id!` + `Anchor.toml`.
2. `anchor build` (release).
3. Configure toolchain for mainnet (paid RPC + deployer keypair). Show me the deployer balance and
   the deploy cost estimate, and PAUSE for my go-ahead before spending real SOL.
4. `anchor deploy --provider.cluster mainnet`. Capture program id + buffer + program-data account.
5. Verify: `solana program show <id>` + Explorer (executable, authority correct).
6. Wire `.env` for `apps/web`, `apps/api`, `apps/keeper` (RPC + PROGRAM_ID; executor key as secret).
7. Run the end-to-end mainnet smoke test with SMALL real capital, capturing every tx signature:
   create_pot → deposit → create_proposal (tiny swap) → vote → execute_swap (Jupiter v6 CPI) →
   withdraw. Then verify a freeze blocks execution (sentinel) and unfreeze.
8. Create the flagship public pot; record vault address + TVL.

## Hard rules
- PAUSE before any real-SOL spend and before changing upgrade authority; wait for my explicit "go".
- Never print or commit private keys. Use env/secrets only.
- If a step fails, stop, show the exact error + the failing command, and propose a fix. Don't retry
  blindly or paper over failures.
- Keep the buffer + upgrade authority so we can patch fast.

## Done = report
Produce a grant-ready report I can paste into the Superteam update:
- Program id + mainnet Explorer link
- Test suite result
- Smoke-test tx signatures (each step)
- Flagship pot address + TVL
- One-liner: "PotBot is live on Solana mainnet; full lifecycle verified on-chain."

Start with Step 0 and the readiness report. Do not deploy or spend anything yet.
