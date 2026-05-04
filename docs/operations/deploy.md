# Devnet Deploy Guide

Step-by-step guide to deploying `pot_vault` to Solana devnet and connecting the DApp to it.

---

## Prerequisites

```bash
# Install Rust
curl https://sh.rustup.rs -sSf | sh
source ~/.cargo/env

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="~/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor CLI 0.30.1
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli

# Verify
solana --version    # >= 1.18
anchor --version    # 0.30.1
```

---

## Step 1: Create a Deploy Wallet

```bash
# Generate a new keypair (or use existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Set cluster to devnet
solana config set --url devnet

# Get 2 SOL airdrop (needed for deploy)
solana airdrop 2
solana balance   # should show ~2 SOL
```

---

## Step 2: Build the Program

```bash
cd packages/program
anchor build
```

This compiles the Rust program and generates:
- `target/deploy/pot_vault.so` — the compiled program
- `target/idl/pot_vault.json` — auto-generated IDL (more accurate than hand-crafted)

---

## Step 3: Get the Program ID

```bash
anchor keys list
# Output: pot_vault: <PROGRAM_ID>
```

Or:
```bash
solana-keygen pubkey target/deploy/pot_vault-keypair.json
```

---

## Step 4: Update Program IDs

Replace the placeholder ID in **3 places**:

**1. `packages/program/programs/pot_vault/src/lib.rs`**
```rust
declare_id!("<YOUR_PROGRAM_ID>");
```

**2. `packages/program/Anchor.toml`**
```toml
[programs.devnet]
pot_vault = "<YOUR_PROGRAM_ID>"
```

**3. `packages/sdk/src/pda.ts`**
```typescript
export const POT_PROGRAM_ID = new PublicKey('<YOUR_PROGRAM_ID>')
```

**4. `apps/web/.env.local`** (create from example)
```bash
cp apps/web/.env.local.example apps/web/.env.local
# Edit:
NEXT_PUBLIC_POT_PROGRAM_ID=<YOUR_PROGRAM_ID>
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

---

## Step 5: Rebuild and Deploy

```bash
cd packages/program

# Rebuild with updated program ID
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show <YOUR_PROGRAM_ID> --url devnet
# Should show: Executable: Yes
```

---

## Step 6: Start the DApp

```bash
cd apps/web
npx next dev
```

Open `http://localhost:3000`. The DApp will automatically detect the deployed program (within 60 seconds) and switch from mock mode to on-chain mode.

You can verify in the browser console:
```
Program live: true
```

---

## Step 7: Test the Full Flow

1. **Connect Phantom** (set to Devnet in Phantom settings)
2. **Airdrop SOL** to your wallet: `solana airdrop 1 <YOUR_WALLET>`
3. **Create a POT** — click "+Create POT", fill form, sign tx
4. **Deposit SOL** — open the POT, click Deposit, sign tx
5. **Create a proposal** — go to Swap tab, propose a token swap
6. **Vote** — go to Governance tab, vote YES
7. **Execute** — if passed, click Execute

---

## Troubleshooting

### `Error: Signature verification failed`
Your wallet keypair doesn't match the program keypair. Use the correct keypair file.

### `insufficient funds`
Airdrop more SOL: `solana airdrop 2`

### `Error: Account does not exist`
Program not deployed yet, or wrong program ID in env.

### Program stays in mock mode after deploy
1. Check `NEXT_PUBLIC_POT_PROGRAM_ID` in `.env.local`
2. Check `NEXT_PUBLIC_RPC_URL` points to devnet
3. Restart `npx next dev`
4. Wait up to 60 seconds for `useIsProgramLive` to re-check

---

## Program Upgrade

To upgrade an already-deployed program:

```bash
anchor upgrade target/deploy/pot_vault.so --provider.cluster devnet --program-id <YOUR_PROGRAM_ID>
```

Note: Upgrades require the upgrade authority keypair (the one that did the original deploy).

---

## Mainnet Deploy (after hackathon)

```bash
solana config set --url mainnet-beta
solana balance   # Need ~3-5 SOL for program rent
anchor deploy --provider.cluster mainnet
```

Update `.env.local`:
```env
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
# Or use a paid RPC: Helius, QuickNode, Triton
```
