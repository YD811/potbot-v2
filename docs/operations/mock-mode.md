# Demo / Mock Mode

PotBot's DApp can run fully without an on-chain program deployment. This is critical for:
- **Hackathon demos** — show the product before devnet deploy
- **UI development** — iterate on the interface without signing transactions
- **Testing** — deterministic data, no RPC rate limits

---

## How Auto-Detection Works

Every time the app loads, `useIsProgramLive()` checks the Solana connection:

```typescript
// apps/web/src/hooks/usePots.ts
function useIsProgramLive() {
  const { connection } = useConnection()
  return useQuery({
    queryKey: ['program-live'],
    queryFn: async () => {
      const info = await connection.getAccountInfo(POT_PROGRAM_ID)
      return info?.executable === true
    },
    staleTime: 30_000,  // re-check every 30s
  })
}
```

- **Program deployed + executable** → all hooks use Anchor on-chain calls
- **Program not found / not executable** → all hooks use the Zustand mock store

This switching is **transparent to the UI** — components just call `usePots()`, `useMembers()`, etc. and get the same data shape regardless of which backend is active.

---

## Seed Data

The mock store ships with 3 realistic POTs:

### 💎 Diamond Hands DAO
- Balance: **42.5 SOL** · 5 members · 12 trades
- Strategy: Aggressive
- Governance: L2 Majority (trades), L3 Supermajority (withdrawals)
- Tamagotchi: 🦅 Eagle (XP ~3200)
- 2 proposals: one executed swap, one active swap vote in progress

### 🎰 Degen Squad
- Balance: **8.2 SOL** · 3 members · 47 trades
- Strategy: Aggressive
- Governance: L1 Advisory
- Tamagotchi: 🐤 Baby (XP ~680)

### 🏦 Safe Stack
- Balance: **125.0 SOL** · 8 members · 3 trades
- Strategy: Conservative
- Governance: L4 Consensus
- Tamagotchi: 🐉 Dragon (XP ~12000)

---

## Mock Store API

Located at `apps/web/src/lib/mock-store.ts`. Uses Zustand.

```typescript
import { useMockStore } from '@/lib/mock-store'

const store = useMockStore.getState()

// Read
store.pots          // MockPot[]
store.getMembers(potPubkey)    // MockMember[]
store.getProposals(potPubkey)  // MockProposal[]

// Write
store.createPot(args)          // adds to pots[]
store.deposit(potPubkey, walletAddress, amountSol)  // updates shares
store.withdraw(potPubkey, walletAddress, shares)     // burns shares
store.createProposal(potPubkey, walletAddress, action, description)
store.vote(potPubkey, proposalId, walletAddress, inFavor)  // auto-resolves at >50%
store.executeProposal(potPubkey, proposalId)
```

All write operations:
1. Update Zustand state synchronously
2. Trigger React Query cache invalidation
3. UI re-renders with new data

---

## Switching to On-Chain Mode

When you deploy to devnet:

1. Set `NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com`
2. Set `NEXT_PUBLIC_POT_PROGRAM_ID=<your deployed program ID>`
3. Restart `npx next dev`

`useIsProgramLive()` will return `true` on next poll (within 30s) and all hooks switch to on-chain mode. Mock data disappears and real on-chain data loads instead.

---

## Limitations of Mock Mode

| Feature | Mock Mode | On-Chain Mode |
|---|---|---|
| Create POT | ✅ In-memory | ✅ On-chain PDA |
| Deposit / Withdraw | ✅ Simulated shares | ✅ Real SOL transfer |
| Governance vote | ✅ Auto-resolves | ✅ Share-weighted tx |
| Execute swap | ❌ No-op | ✅ Jupiter CPI |
| Wallet required | ❌ No | ✅ Yes |
| Persistent data | ❌ Lost on refresh | ✅ On-chain forever |
| Multiple users | ❌ Single session | ✅ Any wallet |
