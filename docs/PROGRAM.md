# Solana Program Reference — `pot_vault`

Program ID (devnet, placeholder — update after mainnet deploy):
```
Hyi1PNxPMUqwdDukhB2a4fvcBxQHmbXy3CZ95mgyFHA3
```

> This file documents **`packages/program/programs/pot_vault`** — the core Anchor program that owns every POT vault. A companion program `pot_duel` covers 1v1 duel vaults (not fully documented here yet; unlocks at Bloom+). See [OVERVIEW.md](OVERVIEW.md) for the full product context.

---

## Account Types

### `PotAccount`

Stores the full configuration, stats and Money Tree state of a vault.

| Field | Type | Description |
|---|---|---|
| `authority` | `Pubkey` | Creator / owner |
| `name` | `String` (max 32) | Unique name per authority |
| `emoji` | `String` (max 4) | Display emoji |
| `vault` | `Pubkey` | SOL vault PDA (program-owned; always on-chain) |
| `share_mint` | `Option<Pubkey>` | SPL mint for on-chain shares. `None` at Seedling, `Some(mint)` from Sprout+ (see [OVERVIEW § Off-Chain → On-Chain Shares Strategy](OVERVIEW.md#off-chain--on-chain-shares-strategy)) |
| `total_shares` | `u64` | Sum of all member shares (off-chain or on-chain depending on stage) |
| `member_count` | `u32` | Number of active members |
| `trade_count` | `u64` | Total executed trades |
| `proposal_count` | `u64` | Total proposals ever created |
| `tamagotchi_level` | `u8` | Current Money Tree stage (0–5). Kept historical name for ABI stability — semantically this is the "Money Tree stage". |
| `season` | `u8` | Money Tree season (0 = Season 1 Plants). Future seasons may reuse stage indexes with different art/copy. |
| `health_hp` | `u8` | Money Tree health (0–100). Updated by `update_tamagotchi`. At 0 the pot is considered dead (see `is_dead`). |
| `peak_balance` | `u64` | Highest vault balance ever reached (lamports). Used to compute drawdown and health. |
| `is_dead` | `bool` | True if the tree has died (balance went to 0 or dust). Blocks all proposals except `resurrect_pot`. |
| `config` | `PotConfig` | Immutable config set at creation |
| `governance` | `GovernanceConfig` | Governance thresholds (levels + optional risk caps) |
| `created_at` | `i64` | Unix timestamp |
| `bump` | `u8` | PDA bump seed |

### `MemberAccount`

One per (POT × wallet) pair.

| Field | Type | Description |
|---|---|---|
| `pot` | `Pubkey` | Parent POT |
| `wallet` | `Pubkey` | Member's wallet |
| `shares` | `u64` | Current share balance (authoritative at on-chain stages; mirrored from backend at Seedling) |
| `deposit_total` | `u64` | Lifetime SOL deposited (lamports) |
| `withdraw_total` | `u64` | Lifetime SOL withdrawn (lamports) |
| `voter_delegate` | `Option<Pubkey>` | Optional personal AI voter wallet allowed to vote on this member's behalf in this pot |
| `joined_at` | `i64` | Unix timestamp |
| `bump` | `u8` | PDA bump seed |

### `ProposalAccount`

One per governance proposal.

| Field | Type | Description |
|---|---|---|
| `pot` | `Pubkey` | Parent POT |
| `proposer` | `Pubkey` | Member who created it (or AI agent wallet on behalf of a rule) |
| `proposal_id` | `u64` | Sequential ID per POT |
| `action` | `ProposalAction` | What to execute if passed |
| `description` | `String` | Human-readable description |
| `yes_votes` | `u64` | Share-weighted yes votes |
| `no_votes` | `u64` | Share-weighted no votes |
| `status` | `ProposalStatus` | Active / Passed / Rejected / Executed |
| `risk_class` | `u8` | 0 = normal, 1 = defensive-only (set automatically when pot is in low-HP risk mode) |
| `created_at` | `i64` | Unix timestamp |
| `expires_at` | `i64` | Auto-reject deadline |
| `bump` | `u8` | PDA bump seed |

### `VoterDelegationAccount` (new)

Records a member's decision to let an AI agent wallet vote on their behalf in a specific pot. One per (POT × member × delegate) triple.

| Field | Type | Description |
|---|---|---|
| `pot` | `Pubkey` | Parent POT — delegation is always per-pot, never global |
| `member` | `Pubkey` | The human member's wallet |
| `delegate` | `Pubkey` | The AI agent's wallet authorised to cast votes |
| `rules_uri` | `String` (max 200) | URI (IPFS / Arweave / https) to the human-readable rule set the AI follows |
| `revocable_after` | `i64` | Earliest Unix timestamp at which the delegation can be revoked (usually `0` — immediately revocable) |
| `created_at` | `i64` | Unix timestamp |
| `bump` | `u8` | PDA bump seed |

---

## PDA Derivation

```typescript
import { PublicKey } from '@solana/web3.js'
const PROGRAM_ID = new PublicKey('Hyi1PNxPMUqwdDukhB2a4fvcBxQHmbXy3CZ95mgyFHA3')

// POT config account
const [potPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)],
  PROGRAM_ID
)

// SOL vault (holds funds — always on-chain from pot creation)
const [vaultPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('vault'), potPDA.toBuffer()],
  PROGRAM_ID
)

// Member record
const [memberPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('member'), potPDA.toBuffer(), wallet.toBuffer()],
  PROGRAM_ID
)

// Proposal
const idBuf = Buffer.alloc(8)
idBuf.writeBigUInt64LE(BigInt(proposalId))
const [proposalPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('proposal'), potPDA.toBuffer(), idBuf],
  PROGRAM_ID
)

// Voter delegation (new)
const [voterPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('voter'), potPDA.toBuffer(), memberWallet.toBuffer()],
  PROGRAM_ID
)
```

All helpers are exported from `@potbot/sdk`:
```typescript
import {
  getPotAddress,
  getVaultAddress,
  getMemberAddress,
  getProposalAddress,
  getVoterDelegationAddress, // new
} from '@potbot/sdk'
```

---

## Instructions

Implemented today: `create_pot`, `deposit`, `withdraw`, `create_proposal`, `vote`, `execute_proposal`. Everything else is either partially implemented or planned for Q2–Q3 2026 (see [OVERVIEW § Roadmap](OVERVIEW.md#roadmap--current-status)). This file documents the **target spec**; the code lags behind.

### `create_pot` — ✅ implemented

Initializes a new vault with its config and governance settings. The vault PDA is created and funded with rent-exempt lamports on the same transaction — **the vault is on-chain from the very first instruction**, even before the first deposit.

**Accounts:**
- `[signer, writable]` authority
- `[writable]` pot — PDA `["pot", authority, name]`
- `[writable]` vault — PDA `["vault", pot]`
- `[]` system_program

**Args:**
```rust
pub struct CreatePotArgs {
    pub name: String,           // max 32 chars
    pub emoji: String,          // max 4 chars
    pub is_public: bool,
    pub min_deposit: u64,       // lamports
    pub lockup_days: u16,
    pub yield_strategy: YieldStrategy,
    pub trade_governance: u8,   // 0-4
    pub withdraw_governance: u8,
}
```

At creation: `tamagotchi_level = 0` (Seedling), `season = 0` (Plants), `health_hp = 100`, `peak_balance = 0`, `is_dead = false`, `share_mint = None`.

---

### `deposit` — ✅ implemented

Deposit SOL and receive shares. 1 SOL = 1000 shares at initial deposit; subsequent deposits priced at current NAV.

**Accounts:**
- `[signer, writable]` member_wallet
- `[writable]` pot
- `[writable]` vault
- `[writable]` member — PDA `["member", pot, wallet]` (init if new)
- `[]` system_program

**Args:**
```rust
pub struct DepositArgs {
    pub amount: u64,  // lamports
}
```

**Share calculation:**
```
if total_shares == 0:
    new_shares = amount * 1000 / LAMPORTS_PER_SOL
else:
    new_shares = amount * total_shares / vault_balance
```

Side effects: updates `peak_balance`, recomputes `health_hp` via the crank-style inline update, resets `is_dead = false` if it was true (for resurrection path).

---

### `withdraw` — ✅ implemented

Burn shares and receive proportional SOL.

**Accounts:**
- `[signer, writable]` member_wallet
- `[writable]` pot
- `[writable]` vault
- `[writable]` member
- `[]` system_program

**Args:**
```rust
pub struct WithdrawArgs {
    pub shares: u64,
}
```

**SOL calculation:**
```
sol_out = shares * vault_balance / total_shares
```

---

### `create_proposal` — ✅ implemented

Submit a governance proposal. Requires member with > 0 shares. Rejected automatically when `pot.is_dead == true` except for the `Resurrect` action (see below).

**Args:**
```rust
pub struct CreateProposalArgs {
    pub action: ProposalAction,
    pub description: String,
}

pub enum ProposalAction {
    ExecuteSwap {
        token_in: Pubkey,
        token_out: Pubkey,
        amount_in: u64,
        min_amount_out: u64,
    },
    UpdateGovernance {
        trade_level: u8,
        withdraw_level: u8,
    },
    UpdateStrategy {
        strategy: YieldStrategy,
    },
    BudgetGrant {            // new (partial)
        recipient: Pubkey,
        amount: u64,
        purpose: String,
    },
    Custom { data: Vec<u8> },
}
```

---

### `vote` — ✅ implemented (delegation WIP)

Cast a share-weighted vote on an active proposal. Can be called by the member directly OR by the member's registered `voter_delegate` wallet (see `delegate_vote`).

**Args:**
```rust
pub struct VoteArgs {
    pub in_favor: bool,
    pub reason: Option<String>, // emitted in event log when vote comes from a delegate
}
```

Votes are weighted by `member.shares`. If `yes_votes / total_shares >= threshold`, the proposal automatically moves to `Passed`.

**Quorum thresholds by governance level (code semantics):**

| Level | Name | Threshold |
|---|---|---|
| 0 | Autocracy | Authority decides directly |
| 1 | Advisory | 25% can veto |
| 2 | Majority | > 50% yes |
| 3 | Supermajority | > 66% yes |
| 4 | Consensus | 100% yes |

Risk caps and timelocks live in `GovernanceConfig` and stack on top of the level (see [GOVERNANCE.md](GOVERNANCE.md)).

---

### `delegate_vote` — 🟡 planned Q3 2026

Register a personal AI voter wallet for a specific pot. Creates a `VoterDelegationAccount` PDA. Nothing automatically starts voting — the delegate wallet must still sign each vote transaction; this instruction only records **permission**.

**Accounts:**
- `[signer, writable]` member_wallet — must own a `MemberAccount` in the pot
- `[writable]` member — PDA `["member", pot, wallet]`
- `[writable]` voter — PDA `["voter", pot, member]` (init)
- `[]` pot
- `[]` system_program

**Args:**
```rust
pub struct DelegateVoteArgs {
    pub delegate: Pubkey,
    pub rules_uri: String,       // max 200 chars — IPFS/Arweave/https
    pub revocable_after: i64,    // 0 = immediately revocable
}
```

Side effects: sets `member.voter_delegate = Some(delegate)`.

---

### `revoke_delegation` — 🟡 planned Q3 2026

Revoke a personal AI voter. Only the member who registered the delegate can call this (unless `revocable_after` has not yet passed — in that case the instruction errors with `DelegationLocked`).

**Accounts:**
- `[signer, writable]` member_wallet
- `[writable]` member
- `[writable, close=member_wallet]` voter — PDA closed, rent returned to member
- `[]` pot

---

### `init_share_mint` — 🟡 planned Q2 2026

Graduate shares from off-chain accounting to an on-chain SPL mint. Only callable once per pot, only when the pot reaches Sprout (stage 1+). Sets `pot.share_mint = Some(mint)`. Existing off-chain balances are migrated by the backend in parallel and reconciled via an on-chain event.

**Accounts:**
- `[signer, writable]` authority (or member with sufficient shares — TBD)
- `[writable]` pot
- `[writable]` share_mint — new keypair, initialised to `pot` authority
- `[]` token_program
- `[]` rent
- `[]` system_program

---

### `execute_proposal` — ✅ implemented (swap CPI WIP)

Execute a `Passed` proposal. For `ExecuteSwap`, this performs a Jupiter CPI from the vault PDA. Blocked when `pot.is_dead == true`.

**Accounts (swap):**
- `[signer]` executor (any member; permissionless)
- `[writable]` pot
- `[writable]` vault
- `[writable]` proposal
- `[]` jupiter_program
- ... (Jupiter route accounts)

Side effects: increments `trade_count`, updates `peak_balance` if post-swap valuation is higher, recomputes `health_hp`.

---

### `update_tamagotchi` — 🟡 planned Q2 2026

Permissionless crank that re-evaluates:
- `tamagotchi_level` — bumps stage if AUM/member/trade thresholds crossed
- `health_hp` — `clamp(0, 100, 100 * vault_balance / peak_balance)`
- `is_dead` — set to true if `health_hp` reaches 0
- `peak_balance` — ratcheted up when current balance exceeds previous peak

On death (`is_dead = true`), emits `PotDied` event. If the pot had minted NFT Strategy Shares (Full Bloom+), the crank also invokes `pot_duel::burn_strategy_nfts` CPI.

**Accounts:**
- `[signer]` cranker (any)
- `[writable]` pot
- `[]` vault
- `[]` clock

---

### `resurrect_pot` — 🟡 planned Q2 2026

Bring a dead pot back. Resets stage to Seedling, clears `is_dead`, preserves membership and historical stats (but the leaderboard will show a "resurrected" flag). Requires a fresh deposit above the minimum resurrection threshold.

**Accounts:**
- `[signer, writable]` member_wallet (must be a pre-death member)
- `[writable]` pot
- `[writable]` vault
- `[writable]` member

**Args:**
```rust
pub struct ResurrectArgs {
    pub seed_deposit: u64,   // lamports; must be >= pot.config.resurrect_minimum
}
```

Side effects: `tamagotchi_level = 0`, `health_hp = 100`, `peak_balance = seed_deposit`, `is_dead = false`. Previous `trade_count` and `proposal_count` are preserved for historical transparency. If the pot had NFT Strategy Shares minted before death, new NFT metadata is regenerated (new seed) — the on-chain share balance is preserved.

---

### Strategy Vault instructions

Implemented in a sibling sub-module `strategy_vault/` inside `pot_vault`. Full spec in [OVERVIEW § Strategy Vaults](OVERVIEW.md#strategy-vaults--creator-economy) and [ETF_TOKEN_SYSTEM.md](ETF_TOKEN_SYSTEM.md).

- `create_strategy_vault` — ✅ implemented
- `join_strategy_vault` — ✅ implemented (with on-chain 2-level referral)
- `exit_strategy_vault` — ✅ implemented (with performance fee on profit)
- `evolve_tamagotchi` — 🟡 planned (same crank semantics as `update_tamagotchi` but evaluates Strategy-specific thresholds)

---

## Error Codes

| Code | Name | Description |
|---|---|---|
| 6000 | `NameTooLong` | POT name exceeds 32 chars |
| 6001 | `EmojiTooLong` | Emoji exceeds 4 chars |
| 6002 | `BelowMinDeposit` | Deposit below config minimum |
| 6003 | `NotAMember` | Wallet has no member account |
| 6004 | `InsufficientShares` | Withdraw amount > member shares |
| 6005 | `ProposalNotActive` | Proposal already closed |
| 6006 | `ProposalNotPassed` | Execute called on non-passed proposal |
| 6007 | `AlreadyVoted` | Member voted twice |
| 6008 | `Unauthorized` | Signer is not authority |
| 6009 | `LockupActive` | Withdrawal before lockup expiry |
| 6010 | `QuorumNotReached` | Execute before quorum |
| 6011 | `InvalidGovernanceLevel` | Level must be 0-4 |
| 6012 | `VaultEmpty` | No funds to withdraw |
| 6013 | `SlippageExceeded` | Swap output below min_amount_out |
| 6014 | `ProposalExpired` | Proposal past expiry |
| 6015 | `MemberAlreadyExists` | Re-init member account |
| 6016 | `PotDead` | Operation blocked — Money Tree has died; call `resurrect_pot` first |
| 6017 | `DelegationLocked` | `revoke_delegation` before `revocable_after` |
| 6018 | `DelegateNotRegistered` | Vote signed by a wallet that is not the member's registered delegate |
| 6019 | `ShareMintAlreadyInit` | `init_share_mint` called twice on the same pot |
| 6020 | `StageTooLowForMint` | `init_share_mint` on a Seedling pot |
| 6021 | `ResurrectBelowMinimum` | `resurrect_pot` seed deposit below `pot.config.resurrect_minimum` |
| 6022 | `PotNotDead` | `resurrect_pot` on a live pot |
| 6023 | `DefensiveOnly` | Proposal rejected — pot is in low-HP risk mode; only defensive actions (withdraw / stable-convert) allowed |
