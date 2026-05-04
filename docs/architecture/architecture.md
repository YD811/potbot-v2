# PotBot v2 — Architecture

## Overview

PotBot is a **group trading vault platform** on Solana. Members pool SOL, govern collective trades via on-chain proposals, and earn yield together. A Tamagotchi mascot evolves with the vault's performance.

The system is designed in three layers:

```
┌──────────────────────────────────────────────┐
│              Users / Members                  │
└────────────────┬─────────────────────────────┘
                 │ browser / Telegram
┌────────────────▼─────────────────────────────┐
│          Application Layer                    │
│  Next.js DApp (app.potbot.fun)               │
│  Telegram Bot (grammy)                        │
│  Landing Page (potbot.fun)                   │
└────────────────┬─────────────────────────────┘
                 │ Anchor SDK / @solana/web3.js
┌────────────────▼─────────────────────────────┐
│          Solana Programs (On-chain)           │
│  pot_vault  — vaults, governance, yield       │
│  pot_duel   — group vs group competitions    │
└────────────────┬─────────────────────────────┘
                 │ CPIs
┌────────────────▼─────────────────────────────┐
│          External Protocols                   │
│  Jupiter v6 (swaps) · Pyth (prices)          │
│  Kamino / Marginfi / Drift (yield)           │
│  SNS (Solana Name Service)                   │
└──────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Program-Derived Addresses (PDAs) for all state

Every vault, member record, and proposal is a PDA — not a user-owned account. This means:
- No rent payer attacks (program controls all state)
- Deterministic addresses from public inputs
- Easy off-chain derivation for indexing

Seed scheme:
```
vault PDA   = ["pot",    authority.key, name_bytes]
vault SOL   = ["vault",  pot_pda.key]
member PDA  = ["member", pot_pda.key, wallet.key]
proposal    = ["proposal", pot_pda.key, proposal_id_le64]
```

### 2. Share-based ownership (not token-based at v1)

Shares are stored as `u64` in the `MemberAccount`. 1 SOL deposit = 1000 shares.
Withdrawals are proportional: `sol_out = shares / total_shares * vault_balance`.

This avoids SPL mint complexity for v1 while remaining upgradeable. A future `mint_community_tokens` instruction will issue SPL tokens at 1:1 with shares.

### 3. Auto-execution at quorum

When a vote tips past the required threshold (configurable per governance level), the program auto-executes the proposal. No separate `crank` tx needed for simple actions. Complex actions (Jupiter CPI swaps) require an explicit `execute_proposal` call after quorum.

### 4. Mock/Demo mode for frictionless testing

The DApp auto-detects whether the on-chain program is deployed by checking if the program account is executable. If not, it falls back to a Zustand in-memory store with realistic seed data. This means the UI is always usable — even before devnet deploy.

See [MOCK_MODE.md](MOCK_MODE.md) for details.

---

## Data Flow: Creating a POT

```
User fills form (name, emoji, governance config)
    │
    ▼
create/page.tsx calls usePots().createPot()
    │
    ├─── Program live? ──Yes──▶ build Anchor tx → sign → send → confirm
    │                                  │
    │                         pot_vault::create_pot()
    │                         ├── derive pot PDA
    │                         ├── derive vault PDA
    │                         ├── init PotAccount with config
    │                         └── emit CreatePotEvent
    │
    └──── No ───────────────▶ mockStore.createPot() → Zustand state update
    │
    ▼
React Query cache invalidated → UI re-renders with new POT
```

## Data Flow: Governance Vote

```
Member clicks "Vote Yes" on proposal
    │
    ▼
usePots().vote(potPubkey, proposalId, true)
    │
    ▼
pot_vault::vote()
    ├── verify member account owns shares
    ├── add yes_votes += member.shares
    ├── check quorum: yes_votes / total_shares > threshold?
    │   └── Yes → proposal.status = Passed
    │              auto-execute if action = Governance
    └── emit VoteEvent
    │
    ▼
Proposal status updated → UI shows green bar + "Passed"
```

---

## Frontend Architecture

```
apps/web/src/
├── app/
│   ├── layout.tsx          # Root layout: AppProviders + Navbar
│   ├── page.tsx            # Dashboard (hero or POT grid)
│   ├── create/page.tsx     # Create new POT form
│   ├── pots/[pubkey]/      # POT detail: 4-tab interface
│   └── providers.tsx       # Wallet + QueryClient providers
├── components/
│   └── Navbar.tsx          # Navigation bar
├── hooks/
│   └── usePots.ts          # Core data hook (on-chain + mock)
└── lib/
    ├── mock-store.ts       # Zustand demo store
    └── tamagotchi/
        └── stats.ts        # XP calculation & evolution logic
```

### State Management

| Concern | Tool | Why |
|---|---|---|
| Server/chain data | TanStack Query | Caching, background refetch, invalidation |
| Mock/demo state | Zustand | Simple in-memory store, no boilerplate |
| Wallet state | Solana wallet-adapter | Industry standard |
| Form state | React `useState` | Lightweight, no form library needed |

---

## Tamagotchi XP System

XP is calculated off-chain from on-chain stats and displayed in the UI. It will be persisted on-chain via the `update_tamagotchi` instruction (permissionless crank).

```
totalXP = volumeXP + memberXP + winXP + yieldXP + ageXP

where:
  volumeXP  = min(tradeVolumeSol * 10, 5000)    # capped at 5000
  memberXP  = memberCount * 50
  winXP     = winRate * 30
  yieldXP   = annualYieldPct * 100
  ageXP     = daysAlive * 5

Evolution stages:
  Egg    🥚  [0, 100)
  Chick  🐣  [100, 500)
  Baby   🐤  [500, 2000)
  Eagle  🦅  [2000, 8000)
  Dragon 🐉  [8000, 25000)
  Legend 👑  [25000, ∞)
```

---

## Security Considerations

- **Re-entrancy**: Not possible in Solana's account model (no recursive CPIs in v1)
- **Signer checks**: Every instruction verifies `authority` or `member.wallet` is a signer
- **PDA ownership**: All accounts are `init`-ed with `seeds` — cannot be spoofed
- **Slippage on swaps**: Proposal includes `min_out_amount`; CPI reverts if unmet
- **Governance bypass**: `execute_proposal` checks `status == Passed` on-chain

---

## Future: POT Duels

A separate `pot_duel` program (planned Week 2) introduces:
- Two vaults stake a % of their SOL into an escrow PDA
- Both vaults trade freely for N hours
- A Pyth oracle CPI determines final P&L
- Winner's vault gets the escrow; Tamagotchi HP is updated
- Spectators place side bets via `place_side_bet` instruction
