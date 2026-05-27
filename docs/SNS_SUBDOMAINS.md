# .potbot.sol Subdomain Sales

## Overview

PotBot owns the `potbot.sol` Solana Name Service domain. We sell subdomains
(`<name>.potbot.sol`) to users as human-readable on-chain identities. Each
subdomain resolves to the buyer's wallet address.

## Architecture

```
Client                    Server (/api/sns)              On-chain (SNS)
  |                           |                              |
  |-- GET /check?name=alice ->|                              |
  |                           |-- getDomainKeySync() ------->|
  |                           |<- NameRegistryState.retrieve |
  |<- { available, pricing } -|                              |
  |                           |                              |
  |-- POST /claim ----------->|                              |
  |   { label, buyer, SOL }   |-- buildClaimTransaction() -->|
  |                           |   [pay → treasury]           |
  |                           |   [createSubdomain owner=buyer]
  |                           |   partialSign(parentOwner)   |
  |<- { transaction (base64)} |                              |
  |                           |                              |
  |-- signAndSend(tx) ------->|                              |
  |   (buyer signs as         |                         [tx lands]
  |    feePayer + submits)     |                              |
```

### Key design decisions

1. **Buyer is fee payer** — the buyer covers Solana rent for the subdomain
   account. PotBot's marginal cost is ~$0, achieving ~100% margin on the
   pricing tiers.

2. **Parent owner partial-signs server-side** — `createSubdomain` requires
   the parent domain owner's signature. The server holds
   `POTBOT_SNS_OWNER_SECRET` (a dedicated key that only owns `potbot.sol`
   with near-zero SOL balance) and partial-signs the transaction. The buyer
   then counter-signs and submits.

3. **Price enforcement is server-side** — the payment instruction is baked
   into the transaction by the server, so the buyer cannot skip it.

4. **Mainnet only** — SNS only exists on Solana mainnet. The feature uses
   its own RPC endpoint (`POTBOT_SNS_RPC_URL`) independent of the app's
   devnet default.

## Pricing (Aggressive Tiers)

| Label length | SOL   | USDC  |
|-------------|-------|-------|
| 1 char      | 2     | 200   |
| 2 chars     | 1     | 100   |
| 3 chars     | 0.5   | 50    |
| 4 chars     | 0.15  | 15    |
| 5+ chars    | 0.05  | 5     |

The 5+ tier is the only one that's env-overridable (`POTBOT_SNS_PRICE_SOL`,
`POTBOT_SNS_PRICE_USDC`). Premium tiers (1-4 chars) are hardcoded.

## Environment Variables

| Variable                | Required | Description                                       |
|------------------------|----------|---------------------------------------------------|
| `POTBOT_SNS_OWNER_SECRET` | Yes (claim) | Secret key of potbot.sol owner (base58 or JSON array) |
| `POTBOT_SNS_TREASURY`    | No       | Payment recipient (defaults to owner pubkey)       |
| `POTBOT_SNS_RPC_URL`     | Yes      | Mainnet RPC endpoint                              |
| `POTBOT_SNS_PRICE_SOL`   | No       | Override standard tier SOL price (default: 0.05)  |
| `POTBOT_SNS_PRICE_USDC`  | No       | Override standard tier USDC price (default: 5)    |
| `POTBOT_SNS_USDC_MINT`   | No       | USDC mint address (default: mainnet USDC)         |

## API Routes

- `GET /api/sns/check?name=<label>` — availability + tiered price
- `POST /api/sns/claim` — build partially-signed claim transaction
- `GET /api/sns/owned?owner=<pubkey>` — list owned .potbot.sol names
- `POST /api/sns/bind` — Phase 2 stub (501 until enabled)

## Phase 2: Pot Binding (not yet implemented)

Names currently resolve to the buyer's wallet. In Phase 2, names will be
bindable to specific pots via SNS records:

- Write a `SOL` record pointing to the vault PDA
- Write a custom `pot` record with the pot pubkey
- Owner-signed (NOT ownership transfer to PDA)

The seam is already in the code:
- `potPubkey` flows through the claim request
- `/api/sns/bind` exists as a gated stub
- `OwnedName.boundPot` field is defined

Binding will ship once pots are live on mainnet.

## Files

```
src/lib/sns.ts              — shared constants, types, validation (client+server)
src/lib/sns-server.ts       — on-chain logic, tx building (server-only)
src/app/api/sns/check/      — availability check endpoint
src/app/api/sns/claim/      — claim transaction builder endpoint
src/app/api/sns/owned/      — list owned names endpoint
src/app/api/sns/bind/       — Phase 2 stub
src/hooks/useClaimWallet.ts — wallet seam (adapter + Privy)
src/components/sns/         — ClaimWidget, MyNames, PotSnsUpsell
src/app/name/page.tsx       — /name landing page
```
