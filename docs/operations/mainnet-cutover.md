# Mainnet cutover — end-to-end checklist

Target: real product users can test on mainnet. Deadline: 2026-05-11
(Solana Frontier). Everything below assumes you're on your Mac, not in
this chat session.

## 0. Prerequisites

```bash
# Toolchain (one-time)
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"          # solana CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked    # anchor version mgr
avm install 0.30.1 && avm use 0.30.1
npm install -g @sqds/cli@latest                                         # Squads CLI
```

Fund your deployer: **≥ 5 SOL on mainnet** (target `solana address`).

Get a Helius API key: https://helius.xyz (free tier works for devnet,
paid for mainnet keeper).

## 1. Devnet smoke test (do this first, always)

```bash
cd packages/program
bash deploy.sh                           # re-deploys to devnet
cd ../..
anchor test --provider.cluster devnet    # full integration tests must pass
```

If tests fail — fix before touching mainnet.

## 2. Squads multisig — pot authority

See `docs/integrations/squads-multisig-setup.md`. Run the 3-of-5 setup, record the
Squads vault PDA. You'll use it as pot `authority` going forward.

## 3. Deploy program to mainnet

```bash
cd packages/program
solana-keygen new -o target/deploy/pot_vault-mainnet.json --no-bip39-passphrase

# Back up the secret OFFLINE now. If lost, program upgrade is gone forever.
solana-keygen pubkey target/deploy/pot_vault-mainnet.json
# → copy this pubkey into Anchor.toml [programs.mainnet] AND declare_id! in lib.rs

export HELIUS_MAINNET_RPC="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
bash deploy-mainnet.sh
```

The script prompts twice. After it finishes:

- `apps/web/.env.mainnet.local` is written automatically.
- `packages/sdk/src/idl/pot_vault.ts` is re-synced with mainnet `address`.

## 4. Hand off program-upgrade authority to Squads

```bash
solana program set-upgrade-authority \
  <MAINNET_PROGRAM_ID> \
  --new-upgrade-authority <SQUADS_VAULT_PDA> \
  --url $HELIUS_MAINNET_RPC
```

## 5. Register `potbot.sol` parent domain (one-time)

If you don't own it yet:

```bash
# via Bonfida UI (easier): https://www.sns.id
#   search "potbot" → register for ~0.2 SOL/year

# or via CLI:
solana-tokens register potbot.sol  # (conceptual; use Bonfida UI)
```

This wallet becomes the **owner of all pot subdomains**. Keep it in a
warm wallet accessible for subdomain registration on pot creation.

## 6. Commit + push the mainnet config

```bash
git add Anchor.toml programs/pot_vault/src/lib.rs
git add ../../packages/sdk/src/idl/pot_vault.ts
git commit -m "chore: mainnet program deploy (<MAINNET_PROGRAM_ID>)"
git push origin main
```

## 7. Flip Vercel env to mainnet

Dashboard → https://vercel.com/y-dao/potbot-v2/settings/environment-variables

Update (Production only):

```
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_PROGRAM_ID=<MAINNET_PROGRAM_ID>
NEXT_PUBLIC_HELIUS_API_KEY=YOUR_KEY
```

Redeploy — either trigger manually or wait for next push. `potbot.fun`
will be live on mainnet.

## 8. Seed 5 real pots

```bash
export HELIUS_MAINNET_RPC="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
export CREATOR_KEYPAIR="$HOME/.config/solana/id.json"

# Dry-run first (prints what WOULD happen)
pnpm tsx scripts/seed-mainnet-pots.ts

# Real execution
CONFIRM_MAINNET=yes pnpm tsx scripts/seed-mainnet-pots.ts
```

Five production-quality pots go on-chain (`Amsterdam Alpha Circle`,
`Y-DAO Treasury`, `Weekend Degen Pot`, `Stablecoin Savers`,
`Tamagotchi Grove`). Total cost: ~1.5 SOL (rent + seed deposits).

## 9. Register SNS subdomains for seed pots

For each seed pot, register a subdomain:

```typescript
// apps/web/src/lib/sns.ts exports buildRegisterPotSubdomainIxs
// Needs potbot.sol owner wallet (step 5) + pot vault PDA.
// Bundle into a single tx for atomic "create pot + claim name"
```

A helper script will live at `scripts/claim-subdomains-for-seeds.ts` —
run after seed script. Not bundled automatically because not every pot
needs a subdomain (optional feature).

## 10. Smoke test — as a real user

```
1. Open https://potbot.fun on your phone (not your dev machine).
2. Connect Phantom → switch to mainnet-beta.
3. Airdrop mainnet? Nope — send 0.05 SOL from your main wallet.
4. Browse /vaults — should see 5 real pots with DEMO badge removed.
5. Click into one → deposit 0.01 SOL → share token mints to your wallet.
6. Propose a swap (SOL → USDC 0.005) → vote → execute.
7. Check Solscan: https://solscan.io/account/<MAINNET_PROGRAM_ID>
8. Check Supabase: `SELECT * FROM swap_proposal_meta` — new row.
```

Any failure in this path = NOT READY. Fix before inviting testers.

## 11. Open beta

```
- Post on @PotBot_sol: "PotBot v1 is live on mainnet. 5 seed pots
  waiting. Don't YOLO — this is beta."
- DM 10 hand-picked testers (Y-DAO Amsterdam, Superteam NL, beta waitlist)
- Monitor keeper logs + Solscan for 24h.
```

## 12. Hackathon submission

After 24-48h of stable mainnet → populate `docs/hackathon/submission.md`
with real pot links, update demo video (`/marketing-video`), submit to
Solana Frontier and the SNS Identity track before May 11.

## Rollback plan

If mainnet bugs: the Squads vault (step 2) can pause the program via
`emergency_pause()`, which halts all proposals + swaps until a fix is
deployed through Squads. Users can still withdraw — withdrawals aren't
gated by pause.

## What you cannot rollback

- SNS subdomain registration (one-way; can transfer but not unregister).
- Program deploys without version control — always use Squads upgrade path.
- Real user SOL in real pots — treat mainnet like production, not a toy.
