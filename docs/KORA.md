# Kora Integration — Gasless Transactions in PotBot

> Kora is a paymaster/relayer built by the Solana Foundation.
> It lets users pay transaction fees with any SPL token — or have fees sponsored entirely by the protocol.
>
> Docs: https://launch.solana.com/docs/kora

---

## Why PotBot Uses Kora

Without Kora, every POT member needs SOL to:
- Vote on governance proposals
- Accept/reject duel challenges
- Place side bets on duels
- Propose swaps from Telegram

This is a major friction point. A group member who only holds USDC can't participate.

With Kora, PotBot sponsors the most frequent, lowest-value interactions — making the UX seamless.

---

## What Gets Sponsored

| Action | User pays | Notes |
|--------|-----------|-------|
| Governance vote | **Free** | Protocol sponsors |
| Duel accept/reject | **Free** | Protocol sponsors |
| Side bet placement | **Free** | Protocol sponsors (biggest UX win) |
| Swap proposal creation | **USDC** | User pays in USDC, not SOL |
| POT creation | SOL | One-time, users expect this |
| Fund deposit | SOL | Value transfer, users expect this |

---

## Architecture

```
User → Web/Bot transaction
         │
         ▼
   PotBot Frontend builds tx
         │
         ▼
   SDK: kora.sponsorTransaction(tx, userPubkey)
         │
         ▼
   Kora Node (kora.potbot.fun)
     1. Validates tx meets policy
     2. Injects fee payment instruction
     3. Co-signs as fee payer
     4. Returns signed tx
         │
         ▼
   connection.sendRawTransaction(signedTx)
         │
         ▼
   Solana Network
```

---

## SDK Usage

### Basic (protocol-sponsored)

```typescript
import { createKoraClient } from '@potbot/sdk'

const kora = createKoraClient({
  koraEndpoint: process.env.KORA_URL!,
  feeTokenMint: null,  // null = protocol sponsors entirely
})

// Build your transaction normally
const tx = await buildGovernanceVoteTx(...)

// Wrap with Kora
const gasless = await kora.sponsorTransaction(tx, wallet.publicKey)

// Send
await connection.sendRawTransaction(
  Buffer.from(gasless.signedTransaction, 'base64')
)
```

### With fee token (user pays in USDC)

```typescript
import { createKoraClient, FEE_TOKENS } from '@potbot/sdk'

const kora = createKoraClient({
  koraEndpoint: process.env.KORA_URL!,
  feeTokenMint: FEE_TOKENS.USDC,
})
```

### Estimate fee before showing to user

```typescript
const estimate = await kora.estimateFee(tx, connection)
if (estimate) {
  console.log(`Fee: ${estimate.feeTokenAmount} USDC`)
}
```

### Graceful fallback

```typescript
const gaslessBuilder = createGaslessBuilder(
  process.env.KORA_URL ? createKoraClient({ koraEndpoint: process.env.KORA_URL }) : null
)

if (gaslessBuilder.isAvailable) {
  const signedTx = await gaslessBuilder.buildGasless(tx, wallet.publicKey)
  await connection.sendRawTransaction(Buffer.from(signedTx, 'base64'))
} else {
  // Fall back to normal wallet signing
  await wallet.sendTransaction(tx, connection)
}
```

---

## React Hook (Web DApp)

Create `apps/web/src/hooks/useKora.ts`:

```typescript
import { useMemo } from 'react'
import { createKoraClient, createGaslessBuilder } from '@potbot/sdk'

export function useKora() {
  const builder = useMemo(() => {
    const endpoint = process.env.NEXT_PUBLIC_KORA_URL
    if (!endpoint) return createGaslessBuilder(null)

    const client = createKoraClient({ koraEndpoint: endpoint })
    return createGaslessBuilder(client)
  }, [])

  return builder
}
```

Usage in component:

```typescript
const kora = useKora()
const { publicKey, sendRawTransaction } = useWallet()
const { connection } = useConnection()

const handleVote = async (proposalId: string, vote: boolean) => {
  const tx = await buildVoteTx(proposalId, vote, publicKey!)

  if (kora.isAvailable) {
    const signed = await kora.buildGasless(tx, publicKey!)
    await connection.sendRawTransaction(Buffer.from(signed, 'base64'))
  } else {
    await sendTransaction(tx, connection)
  }
}
```

---

## Bot Integration (Telegram)

For Telegram, Kora is especially powerful — users clicking `/swap` or placing a side bet via a bot message should never be blocked by needing SOL.

In `apps/bot/src/lib/kora.ts`:

```typescript
import { createKoraClient, GASLESS_POLICY } from '@potbot/sdk'

export const koraClient = process.env.KORA_URL
  ? createKoraClient({ koraEndpoint: process.env.KORA_URL })
  : null

export async function sendGasless(
  tx: Transaction,
  userPubkey: PublicKey,
  connection: Connection,
) {
  if (!koraClient) {
    throw new Error('KORA_URL not set — cannot send gasless transaction')
  }
  const result = await koraClient.sponsorTransaction(tx, userPubkey)
  return connection.sendRawTransaction(
    Buffer.from(result.signedTransaction, 'base64')
  )
}
```

---

## Running a Kora Node

For production, run your own Kora node:

```bash
# Install
cargo install kora-cli

# Configure (kora.toml)
[server]
port = 8080

[signer]
type = "local"
keypair_path = "./fee-payer-keypair.json"

[validation]
allowed_programs = [
  "PotVLT111111111111111111111111111111111111",
  "PotDUL11111111111111111111111111111111111111",
]
max_transaction_fee_lamports = 10000

[fee_token]
mint = ""  # empty = sponsor entirely

# Run
kora-cli start --config kora.toml
```

For development, use the public Kora testnet endpoint or the QuickNode hosted Kora service.

---

## Policy Configuration

Kora nodes enforce a policy before co-signing. PotBot's policy allows:
- Instructions from `pot_vault` or `pot_duel` program IDs only
- No native SOL transfers to arbitrary accounts
- Max fee per transaction: 10,000 lamports (~$0.001)
- Rate limit: 100 sponsored txs per wallet per hour

This prevents abuse while keeping governance and duels gasless.

---

## Costs

At current Solana fee levels (~5000 lamports per tx):
- 1000 governance votes/day = ~0.005 SOL/day = ~$0.75/day
- 500 side bets/day = ~0.0025 SOL/day = ~$0.375/day

Protocol revenue from 10bps on $10K daily swap volume = ~$10/day.
**Gasless costs are covered 10x over by protocol fees.**
