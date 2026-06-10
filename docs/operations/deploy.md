# Deploy — devnet → mainnet runbook (pot_vault)

Operational procedure for deploying the PotBot `pot_vault` program to Solana mainnet-beta and
verifying it end to end. This is the funded grant milestone. Path in repo: `docs/operations/deploy.md`.

Companion skills: `potbot-deploy` (this procedure), `solana-security-review` (gate before deploy),
`potbot-anchor` (program change rules).

> ⚠️ Real funds. Go slow. Verify each step before the next. Never commit keypairs.

---

## 0. Prerequisites

- Rust + Solana CLI + Anchor 0.30.1 installed; `solana --version`, `anchor --version` match the repo.
- A funded **deployer** wallet (real SOL) you control.
- A separate **executor/keeper** wallet (this funding is the known blocker for Jupiter CPI).
- Decision on **upgrade authority** (a key you control; recommended: a Squads v4 multisig).
- A reliable **mainnet RPC** (e.g. Helius paid tier) — public RPC will rate-limit the deploy.
- Security review passed (no Critical/High open). See `solana-security-review`.

Budget (approx, SOL price varies): ~3.5 SOL program rent + ~1.5 SOL for redeploys/buffer + extra for
priority fees, PDA/mint rents, and keeper/agent runs. Program rent is largely refundable on close.

---

## 1. Pre-flight checklist (all must be true)

- [ ] `anchor build` clean.
- [ ] `anchor test` green (localnet/devnet), including security tests (sentinel, timelock, caps).
- [ ] `declare_id!` in `pot_vault` matches the intended mainnet program keypair.
- [ ] `packages/sdk` IDL + PDAs regenerated and matching the program.
- [ ] No secrets in git; mainnet/executor keys in a secrets manager or local env only.
- [ ] Upgrade authority chosen and documented.
- [ ] `apps/web` mock mode still works (so demos/judges aren't broken during cutover).

---

## 2. Verify program keypair / id

```bash
cd packages/program
anchor keys list
# Ensure the printed pot_vault id == declare_id! in src/lib.rs and Anchor.toml [programs.mainnet].
# If you need a fresh mainnet program keypair, generate it, update declare_id! + Anchor.toml, rebuild.
```

If `declare_id!` changed, `anchor build` again and regenerate the IDL/SDK.

---

## 3. Build for release

```bash
anchor build
# Artifacts: target/deploy/pot_vault.so + target/idl/pot_vault.json
ls -la target/deploy/pot_vault.so
```

---

## 4. Point the toolchain at mainnet

```bash
# Use your paid RPC
solana config set --url https://mainnet.helius-rpc.com/?api-key=<KEY>
solana config set --keypair /secure/path/deployer.json
solana address                 # deployer pubkey
solana balance                 # confirm enough SOL for deploy + buffer

# Fund the executor/keeper wallet too (clears the Jupiter CPI blocker)
solana transfer <EXECUTOR_PUBKEY> <amount> --allow-unfunded-recipient
```

Make sure `Anchor.toml` has a mainnet section, e.g.:
```toml
[provider]
cluster = "mainnet"
wallet  = "/secure/path/deployer.json"

[programs.mainnet]
pot_vault = "<PROGRAM_ID>"
```

---

## 5. Deploy

```bash
anchor deploy --provider.cluster mainnet
# Capture: program id, and (if upgradeable) the buffer + program data account.
```

Set upgrade authority intentionally (skip `--final` unless you truly want it immutable):
```bash
solana program show <PROGRAM_ID> --url mainnet-beta
# To move authority to a Squads multisig later:
# solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <MULTISIG>
```

---

## 6. Verify on-chain

```bash
solana program show <PROGRAM_ID> --url mainnet-beta
# Confirm: Executable: true, correct Authority, ProgramData present.
```
Open Solana Explorer (mainnet) and confirm the program id, authority, and recent deploy tx.

---

## 7. Wire the apps to mainnet

`apps/web/.env.local`:
```
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta   # REQUIRED — defaults to devnet; drives explorer
                                          # links, cluster labels and health checks
NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<KEY>
NEXT_PUBLIC_PROGRAM_ID=<PROGRAM_ID>
```

`apps/keeper` reads DIFFERENT env names (with devnet fallbacks — if you skip
these, the keeper silently keeps polling devnet while mainnet looks wired):
```
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<KEY>
POTBOT_PROGRAM_ID=<PROGRAM_ID>
```
Set the equivalent vars for `apps/api`, and the executor key as a secret
(never in git). `useIsProgramLive()` should now flip the DApp to on-chain mode.

Restart api + keeper; confirm the agent cron / crank point at mainnet.

---

## 8. End-to-end mainnet smoke test (the milestone proof)

Use small real capital and capture every tx signature.

1. `create_pot` → vault PDA created. ✔ Explorer link.
2. `deposit` small SOL/USDC → shares minted; NAV correct.
3. `create_proposal` (tiny swap, e.g. 0.01 SOL → USDC) → proposal PDA.
4. `vote` to pass quorum + approval.
5. `execute_proposal` / `execute_swap` → Jupiter v6 CPI succeeds. ✔ (this clears the blocker)
6. `withdraw` a fraction → shares burned, value returned.

Also verify a security path: freeze the pot (sentinel) and confirm execution is blocked; unfreeze.

---

## 9. Flagship pot (milestone M2)

Create a public PotBot-owned pot with real capital; surface it at `potbot.fun/vaults` (read-only
card for visitors). Record vault address + live TVL.

---

## 10. Post-deploy

- Add Helius webhooks for mainnet pot events.
- Smoke-test Blinks (`/api/actions/<pot>/{deposit,vote}`) render in Phantom/Backpack/X on mainnet.
- Tag a release; ensure CI is green.
- Keep the buffer + upgrade authority for fast patching.

---

## 11. Rollback / incident

- Critical bug in funds path → use Sentinel `freeze_pot` (if landed) to halt execution, then
  `anchor upgrade` with a fix.
- Don't close the program account unless retiring it (rent refund goes to authority).
- Keep an incident note + tx links for the postmortem.

---

## 12. Grant report (paste into Superteam update)

- Program id + Explorer link (mainnet).
- Test suite result (green).
- Smoke-test tx signatures (create/deposit/propose/vote/execute_swap/withdraw).
- Flagship pot address + current TVL.
- One line: "PotBot program is live on Solana mainnet, full lifecycle verified on-chain."
