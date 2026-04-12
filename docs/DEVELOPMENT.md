# Development Guide

This guide gets you from zero to a running local DApp in under 10 minutes.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 10 | bundled with Node |
| Git | any | [git-scm.com](https://git-scm.com) |
| Rust + Cargo | stable | `curl https://sh.rustup.rs -sSf | sh` |
| Solana CLI | ≥ 1.18 | `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"` |
| Anchor CLI | 0.30.1 | `cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli` |

> **Just want to run the UI?** You only need Node.js + npm. Skip Rust/Solana/Anchor — the DApp works in demo mode without them.

---

## 1. Clone & Install

```bash
git clone https://github.com/YD811/potbot-v2.git
cd potbot-v2
npm install
```

## 2. Run the DApp

```bash
cd apps/web
npx next dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll see the landing page with **demo data already loaded** — 3 vaults, members, proposals. No wallet, no devnet needed.

---

## 3. Environment Variables (optional)

Copy the example file:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Edit `.env.local`:

```env
# Solana RPC (defaults to mainnet-beta public; use devnet for testing)
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Program IDs (update after anchor deploy)
NEXT_PUBLIC_POT_PROGRAM_ID=Hyi1PNxPMUqwdDukhB2a4fvcBxQHmbXy3CZ95mgyFHA3
```

---

## 4. Build Anchor Program (devnet deploy)

```bash
# Set Solana CLI to devnet
solana config set --url devnet

# Get a funded wallet (if you don't have one)
solana-keygen new --outfile ~/.config/solana/id.json
solana airdrop 2

# Build and deploy
cd packages/program
anchor build
anchor deploy --provider.cluster devnet
```

After deploy, copy the program ID from the output and update:

1. `packages/sdk/src/pda.ts` — `POT_PROGRAM_ID`
2. `packages/program/programs/pot_vault/src/lib.rs` — `declare_id!(...)`
3. `apps/web/.env.local` — `NEXT_PUBLIC_POT_PROGRAM_ID`

Rebuild the DApp:

```bash
cd apps/web
npx next dev
```

Now the UI will detect the live program and switch from mock to on-chain mode.

---

## 5. Available Scripts

From repo root:

```bash
npm run dev       # All apps in parallel (requires turbo)
npm run build     # Build all apps
npm run lint      # Lint all packages
```

From `apps/web`:

```bash
npx next dev      # Dev server on :3000
npx next build    # Production build
npx next start    # Serve production build
npx tsc --noEmit  # Type-check only
```

From `packages/program`:

```bash
anchor build      # Compile Rust program
anchor test       # Run program tests (localnet)
anchor deploy     # Deploy to configured cluster
```

---

## 6. Project Layout (web app)

```
apps/web/src/
├── app/
│   ├── layout.tsx          # Providers + Navbar
│   ├── page.tsx            # Home / dashboard
│   ├── create/page.tsx     # Create POT form
│   └── pots/[pubkey]/      # POT detail page (4 tabs)
├── components/
│   └── Navbar.tsx
├── hooks/
│   └── usePots.ts          # All data fetching + mutations
└── lib/
    ├── mock-store.ts       # Demo data store
    └── tamagotchi/stats.ts # XP + evolution
```

---

## 7. Troubleshooting

### `npm install` fails with `workspace:*`
This is a pnpm-only protocol. We use npm — should already be fixed in the repo. If you see it: edit `apps/web/package.json` and replace `"workspace:*"` with `"*"`.

### `Module not found: Can't resolve './client.js'`
SDK imports used `.js` extensions (ESM-style) which webpack doesn't resolve. Should be fixed. If it recurs, remove `.js` from imports in `packages/sdk/src/`.

### Wallet button not rendering
The `WalletMultiButton` requires dynamic import with `ssr: false`. Check `components/Navbar.tsx` — the import should be wrapped in `dynamic(..., { ssr: false })`.

### `anchor build` fails: `proc-macro` errors
Ensure Rust toolchain matches: `rustup update stable && rustup default stable`

### Program not detected (stays in mock mode)
The DApp calls `connection.getAccountInfo(programId)` and checks `executable: true`. If on devnet but showing mock data:
1. Verify `NEXT_PUBLIC_RPC_URL` points to devnet
2. Verify `NEXT_PUBLIC_POT_PROGRAM_ID` matches your deployed program
3. Check the program is actually deployed: `solana program show <ID> --url devnet`
