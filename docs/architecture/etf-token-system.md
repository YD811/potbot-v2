# PotBot — ETF-Like Community Token System

> **Concept**: every Pot is a mini-ETF. Members' shares are tokenised into an SPL token that can be traded, transferred and composed with DeFi. A Pot = on-chain index fund managed by a collective.

---

## 1. Problem and insight

Traditional crypto investment clubs:
- Live in Telegram, coordinate through chat
- No on-chain enforcement → the organiser can run off with the money
- No portable proof of ownership → shares cannot be transferred
- No composability with DeFi → dead capital

**Insight from the Mert / Creator ETF narrative:**
> "Every Telegram trader is essentially a portfolio manager. With a public on-chain track record, they can raise money like a real fund. PotBot gives them that infrastructure."

A Pot Token = an on-chain share of a group fund. Hold the token → hold a slice of the group's portfolio.

---

## 2. Architecture: two pot modes

```
VIRTUAL MODE ─────── tokenize() ──────────────► TOKENIZED MODE
(off-chain shares)                              (on-chain SPL token)
     │                                                   │
     ├─ Shares in PotAccount.member_shares[]            ├─ SPL mint per pot
     ├─ NAV computed by the program                     ├─ Deposit → mintTo member ATA
     ├─ No on-chain token                               ├─ Withdraw → burn + transfer
     └─ Good for getting started                        └─ Transferable, DeFi-composable
```

**Key invariant**: liquidity (SOL/tokens in the vault) **never moves** when transitioning between modes. Only the ownership layer changes.

---

## 3. NAV and share mechanics

### Share Price Formula
```
share_price = total_pot_value_lamports / total_shares
```

### Deposit (mint shares)
```
shares_to_mint = deposit_amount * total_shares / total_pot_value
```
On the first deposit: `share_price = 1.0`, `shares = lamports`.

### Withdraw (burn shares)
```
lamports_to_return = share_amount * total_pot_value / total_shares
```

### PnL Distribution
- Trade profit → NAV grows → share_price grows
- The number of shares **does not change** during trading
- Every share holder automatically receives proportional PnL

**Example:**
```
Initial: 3 members, 1000 shares each, NAV = 3 SOL, price = 0.003 SOL/share
Trade: +50% return → NAV = 4.5 SOL
New price = 4.5 / 3000 = 0.0015 SOL/share

Alice's value = 1000 * 0.0015 = 1.5 SOL (was 1.0 SOL) → +50% PnL ✓
```

---

## 4. On-Chain State Changes (Anchor)

### New `PotAccount` fields (already implemented)
```rust
pub enum PotMode { Virtual, Tokenized }

// Added to PotAccount:
pub mode: PotMode,                    // current mode (default: Virtual)
pub token_mint: Option<Pubkey>,       // SPL mint (Tokenized mode only)
pub nav_per_share_bps: u64,           // current NAV/share in bps (10000 = 1.0)
#[max_len(10)] pub token_ticker: String,
// Meteora yield:
pub meteora_vault: Option<Pubkey>,
pub meteora_lp_mint: Option<Pubkey>,
pub meteora_lp_balance: u64,
pub total_yield_earned: u64,
pub yield_reserve_pct_bps: u16,
```

### `ProposalType` extensions (already implemented)
```rust
TokenizePot { #[max_len(10)] ticker: String },
DepositToYield { meteora_vault: Pubkey, amount: u64 },
WithdrawFromYield { lp_amount: u64 },
```

---

## 5. Token Economics

### The Pot's token
- **Ticker**: set in the TokenizePot proposal (max 10 chars)
- **Total Supply**: equals `total_shares` at the moment of tokenisation
- **Decimals**: 6 (like USDC, for precision)
- **Mint Authority**: program PDA → only the program can mint/burn
- **Freeze Authority**: None (censorship-resistant)

### After tokenisation
| Action | Before | After |
|---|---|---|
| Deposit | `member.shares += X` | `mintTo(member_ata, X)` |
| Withdraw | `member.shares -= X` | `burn(member_ata, X)` → transfer lamports |
| Trade profit | `share_price` grows | `share_price` grows (same) |
| Transfer share | ❌ not possible | ✅ standard SPL transfer |

### Secondary market
After tokenisation the token automatically shows up in:
- Jupiter terminal (swap via any DEX)
- Birdeye / DexScreener (price chart)
- Any Solana wallet (Phantom, Backpack, etc.)

---

## 6. Creator ETF narrative

**Public pot page**: `potbot.fun/[pot-name]`

Displays:
- Performance chart (NAV over time)
- Current holdings (portfolio breakdown)
- Member count + total AUM
- Strategy description
- Token address + buy link (via Jupiter)

**Who can create a Creator ETF:**
- A KOL with a trading history → creates a pot → tokenises → followers buy the token
- A trading group → converts a Telegram DAO into a real on-chain fund
- DeFi degens → pooling capital for bigger position sizes

**Revenue for PotBot:**
- 0.1% of trading volume through the pot
- 10% of performance fee (above high water mark)
- 0.5% mint fee at tokenisation time
- SaaS: $29/month for Creator ETFs with analytics dashboard

---

## 7. Governance for tokenisation

Tokenisation is irreversible — it requires a governance vote:

```
Members vote on TokenizePot proposal
  gov_level = settings_change_level (default: supermajority 66%)
  quorum_bps = 5001 (50%+ must participate)

On approval:
  → execute_proposal() handles TokenizePot
  → pot.mode = Tokenized
  → pot.token_ticker = ticker
  → separate tokenize_pot instruction mints SPL tokens (Phase 2)
```

---

## 8. Frontend changes

### Pot detail page (`/pots/[pubkey]`)
- New badge: `VIRTUAL` | `TOKENIZED 🪙`
- Tokenized mode: "Buy on Jupiter" button → direct link
- Token address with copy button
- Price chart (Jupiter Price API by mint address)

### Overview tab
- NAV per share (SOL and USD)
- Share price chart (historical)
- "Tokenize this Pot" CTA (if Virtual + you have rights)

---

## 9. Roadmap

| Phase | What | When |
|---|---|---|
| 1 | Virtual shares (done) | ✅ |
| 2 | Governance vote TokenizePot (done) | ✅ |
| 3 | `execute_proposal` TokenizePot handler (done) | ✅ |
| 4 | `tokenize_pot` instruction — actual SPL mint CPI | April 2026 |
| 5 | Deposit/withdraw in Tokenized mode | May 2026 |
| 6 | Public Creator ETF pages `potbot.fun/[name]` | May 2026 |
| 7 | Secondary market integration (Jupiter) | Post-hackathon |
| 8 | Performance fee collection | Post-hackathon |
