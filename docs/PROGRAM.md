# Solana Program Reference — `pot_vault`

Program ID (placeholder, update after deploy):
```
Hyi1PNxPMUqwdDukhB2a4fvcBxQHmbXy3CZ95mgyFHA3
```

---

## Account Types

### `PotAccount`

Stores the full configuration and stats of a vault.

| Field | Type | Description |
|---|---|---|
| `authority` | `Pubkey` | Creator / owner |
| `name` | `String` (max 32) | Unique name per authority |
| `emoji` | `String` (max 4) | Display emoji |
| `vault` | `Pubkey` | SOL vault PDA |
| `total_shares` | `u64` | Sum of all member shares |
| `member_count` | `u8` | Number of active members |
| `trade_count` | `u64` | Total executed trades |
| `proposal_count` | `u64` | Total proposals ever created |
| `tamagotchi_level` | `u8` | Current evolution stage (0-5) |
| `config` | `PotConfig` | Immutable config set at creation |
| `governance` | `GovernanceConfig` | Governance thresholds |
| `created_at` | `i64` | Unix timestamp |
| `bump` | `u8` | PDA bump seed |

### `MemberAccount`

One per (POT × wallet) pair.

| Field | Type | Description |
|---|---|---|
| `pot` | `Pubkey` | Parent POT |
| `wallet` | `Pubkey` | Member's wallet |
| `shares` | `u64` | Current share balance |
| `deposit_total` | `u64` | Lifetime SOL deposited (lamports) |
| `withdraw_total` | `u64` | Lifetime SOL withdrawn (lamports) |
| `joined_at` | `i64` | Unix timestamp |
| `bump` | `u8` | PDA bump seed |

### `ProposalAccount`

One per governance proposal.

| Field | Type | Description |
|---|---|---|
| `pot` | `Pubkey` | Parent POT |
| `proposer` | `Pubkey` | Member who created it |
| `proposal_id` | `u64` | Sequential ID per POT |
| `action` | `ProposalAction` | What to execute if passed |
| `description` | `String` | Human-readable description |
| `yes_votes` | `u64` | Share-weighted yes votes |
| `no_votes` | `u64` | Share-weighted no votes |
| `status` | `ProposalStatus` | Active / Passed / Rejected / Executed |
| `created_at` | `i64` | Unix timestamp |
| `expires_at` | `i64` | Auto-reject deadline |
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

// SOL vault (holds funds)
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
```

All helpers are exported from `@potbot/sdk`:
```typescript
import { getPotAddress, getVaultAddress, getMemberAddress, getProposalAddress } from '@potbot/sdk'
```

---

## Instructions

### `create_pot`

Initializes a new vault with its config and governance settings.

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

---

### `deposit`

Deposit SOL and receive shares. 1 SOL = 1000 shares.

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

---

### `withdraw`

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

### `create_proposal`

Submit a governance proposal. Requires member with > 0 shares.

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
    Custom { data: Vec<u8> },
}
```

---

### `vote`

Cast a share-weighted vote on an active proposal.

**Args:**
```rust
pub struct VoteArgs {
    pub in_favor: bool,
}
```

Votes are weighted by `member.shares`. If `yes_votes / total_shares >= threshold`, the proposal automatically moves to `Passed`.

**Quorum thresholds by governance level:**

| Level | Name | Threshold |
|---|---|---|
| 0 | Autocracy | Authority decides directly |
| 1 | Advisory | 25% can veto |
| 2 | Majority | > 50% yes |
| 3 | Supermajority | > 66% yes |
| 4 | Consensus | 100% yes |

---

### `execute_proposal`

Execute a `Passed` proposal. For `ExecuteSwap`, this performs a Jupiter CPI.

**Accounts (swap):**
- `[signer]` executor (any)
- `[writable]` pot
- `[writable]` vault
- `[writable]` proposal
- `[]` jupiter_program
- ... (Jupiter route accounts)

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
