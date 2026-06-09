---
name: potbot-deploy
description: >-
  Deploy and verify the PotBot pot_vault Anchor program from devnet to Solana mainnet.
  Use when the user says "deploy", "go to mainnet", "задеплой", "запусти в мейннет",
  "ship the program", needs to fund the executor wallet, verify a program ID, or run the
  end-to-end mainnet smoke test. The mainnet deploy is the funded Superteam grant milestone.
---

# PotBot — Deploy (devnet → mainnet)

Goal: get `pot_vault` live on Solana mainnet-beta and prove a full pot lifecycle works on-chain.
This is the grant milestone (50% paid on mainnet-live). Read `docs/operations/deploy.md` first.

## Pre-flight (must all be true before mainnet)
- [ ] `anchor build` clean, `anchor test` green on localnet/devnet.
- [ ] Security hardening landed or explicitly deferred (see skill `solana-security-review`).
- [ ] `declare_id!` in program matches the intended mainnet program keypair.
- [ ] SDK + IDL (`packages/sdk`) regenerated and matching the deployed program.
- [ ] Upgrade authority decided (a key you control; consider Squads v4 for the authority).
- [ ] Executor/keeper wallet exists and will be funded (this is the known blocker).
- [ ] No secrets/keypairs in git; mainnet keys stored securely (env / secrets manager).

## Funding math (plan SOL)
- Program account is rent-exempt; budget for program size + a buffer account for upgrades
  (README estimate: ~3.5 SOL deploy + ~1.5 SOL redeploys). Rent is largely refundable on close.
- Keep extra SOL for priority fees, PDA/mint rents, and keeper + agent-cron runs.

## Steps
```bash
# 0. Confirm program id / keypair
cd packages/program
anchor keys list                         # note the program id; ensure it matches declare_id!

# 1. Build for release
anchor build

# 2. Point Anchor + Solana CLI at mainnet
solana config set --url https://api.mainnet-beta.solana.com   # or your Helius mainnet RPC
# fund the deployer wallet (real SOL) and the executor/keeper wallet

# 3. Deploy
anchor deploy --provider.cluster mainnet
# if upgradeable, capture the program id + buffer; set upgrade authority intentionally

# 4. Verify
solana program show <PROGRAM_ID> --url mainnet-beta
# confirm on Solana Explorer (mainnet): program id, authority, executable=true
```

## Wire the app to mainnet
- Set `apps/web/.env.local`: `NEXT_PUBLIC_RPC_URL=<mainnet RPC>`, `NEXT_PUBLIC_PROGRAM_ID=<id>`.
- Set the same for `apps/api` and `apps/keeper` (RPC, program id, executor key via secret).
- `useIsProgramLive()` should now flip the DApp to on-chain mode.

## End-to-end mainnet smoke test (the proof for the milestone)
Run the full lifecycle with small real capital and capture tx links:
1. `create_pot` → vault PDA created (Explorer link).
2. `deposit` small SOL/USDC → shares minted (NAV correct).
3. `create_proposal` (a tiny swap) → proposal PDA.
4. `vote` to pass quorum/approval.
5. `execute_proposal` / `execute_swap` → Jupiter v6 CPI succeeds (this clears the blocker).
6. `withdraw` a fraction → shares burned, SOL returned.
Record: program id on Explorer, green tests, and demo tx signatures for the grant report.

## Flagship pot (milestone M2)
Create a public PotBot-owned vault with real capital; expose at `potbot.fun/vaults`.
Capture vault address + live TVL.

## Rollback / safety
- Keep the buffer + upgrade authority so you can patch fast.
- If a critical bug appears post-deploy, use the Sentinel/freeze path (if landed) and/or upgrade.
- Don't close the program account unless intentionally retiring it.

## Done = report
Output a short report: program id (Explorer link), test result, smoke-test tx links, flagship
vault address + TVL. That's what unlocks the second grant tranche.
