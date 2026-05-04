# PotBot v2 - Premium Features

🔥 **Major Update**: PotBot v2 now includes premium monetization features inspired by pump.fun's fee model.

## 🚀 Core Architecture

### Dual-Mode Share System
- **Default**: Standard shares (free, fast, basic functionality)
- **Premium**: Tokenized SPL shares (0.1 SOL fee, tradeable on DEXs)

### Private Pots
- **Invite-only access** with 6-character alphanumeric codes
- **Same trading features** as public pots
- **Max 100 invites** per private pot

### Premium Features (Paid)
1. **Share Tokenization** - 0.1 SOL
2. **SNS Subdomain** - 0.25 SOL (yourpot.potbot.sol)
3. **Tamagotchi NFT** - 0.05 SOL (soulbound, evolving)

---

## 💰 Fee Structure & Treasury

| Feature | Fee | Description |
|---------|-----|-------------|
| Share Tokenization | 0.1 SOL | Convert shares to SPL tokens |
| SNS Subdomain | 0.25 SOL | Custom potbot.sol address |
| Tamagotchi NFT | 0.05 SOL | Soulbound evolving collectible |

**Treasury Address**: `2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o` *(PotBot v2 Official Treasury)*

> **📍 Treasury Info**: All premium-feature fees go to the official PotBot v2 treasury wallet to fund project development and the team.

---

## 🛠 New Instructions

### Premium Features

#### `tokenize_shares()`
```rust
pub fn tokenize_shares(ctx: Context<TokenizeShares>) -> Result<()>
```
- **Fee**: 0.1 SOL → `2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o`
- **Creates**: SPL token mint for pot shares
- **Enables**: DEX trading of pot shares
- **One-way conversion**: Cannot be reversed

#### `create_sns_domain(domain_name: String)`
```rust
pub fn create_sns_domain(ctx: Context<CreateSnsDomain>, domain_name: String) -> Result<()>
```
- **Fee**: 0.25 SOL → Treasury
- **Creates**: Custom subdomain (yourpot.potbot.sol)
- **Requirements**: 3-32 chars, alphanumeric + hyphens

#### `mint_tamagotchi_nft()`
```rust
pub fn mint_tamagotchi_nft(ctx: Context<MintTamagotchiNft>) -> Result<()>
```
- **Fee**: 0.05 SOL → Treasury
- **Creates**: Soulbound NFT (non-transferable)
- **Evolution**: 6 levels (0-5) with unique artwork
- **Updates**: Automatic on pot growth

### Private Pots

#### `create_private_pot(params: CreatePrivatePotParams)`
```rust
pub fn create_private_pot(ctx: Context<CreatePrivatePot>, params: CreatePrivatePotParams) -> Result<()>
```
- **Access**: Invite-code only
- **Features**: Same as public pots
- **Invite Code**: 6-character alphanumeric

#### `join_private_pot(invite_code: String)`
```rust
pub fn join_private_pot(ctx: Context<JoinPrivatePot>, invite_code: String) -> Result<()>
```
- **Verification**: Case-insensitive code matching
- **Limits**: Max 100 members per pot

---

## 🏗 New State Accounts

### `PrivatePotAccount`
```rust
pub struct PrivatePotAccount {
    pub pot: Pubkey,
    pub invite_code: String,        // 6 chars uppercase
    pub invited_members: Vec<Pubkey>, // Max 100
    pub max_invites: u16,
    pub created_at: i64,
    pub bump: u8,
}
```

### `SnsAccount`
```rust
pub struct SnsAccount {
    pub pot: Pubkey,
    pub domain_name: String,    // "mypot"
    pub full_domain: String,    // "mypot.potbot.sol"
    pub created_at: i64,
    pub bump: u8,
}
```

### `TamagotchiNftAccount`
```rust
pub struct TamagotchiNftAccount {
    pub pot: Pubkey,
    pub mint: Pubkey,           // NFT mint
    pub owner: Pubkey,          // Soulbound to this wallet
    pub level: u8,              // 0-5
    pub xp: u64,
    pub created_at: i64,
    pub last_evolved_at: i64,
    pub bump: u8,
}
```

---

## 🎨 Tamagotchi Evolution

| Level | XP Threshold | Emoji | Name |
|-------|--------------|-------|----- |
| 0 | 0 | 🥚 | Egg |
| 1 | 100 | 🐣 | Hatchling |
| 2 | 500 | 🐥 | Sprout |
| 3 | 2,000 | 🐤 | Grower |
| 4 | 8,000 | 🦆 | Master |
| 5 | 25,000 | 👑 | Legend |

**XP Calculation**:
- Volume XP: (total_volume_sol * 10) capped at 5000
- Member XP: member_count * 50
- Trade XP: trade_count * 20

**NFT Metadata**: `https://api.potbot.fun/metadata/tamagotchi/{pot}/{level}`

---

## 🔧 SDK Usage

### TypeScript SDK

```typescript
import { PotSDK } from '@potbot/sdk';

const sdk = new PotSDK({ connection, wallet });

// Create private pot
const privateTx = await sdk.buildCreatePrivatePotTx({
  name: "Elite Traders",
  emoji: "🚀",
  inviteCode: "ELITE1",
  isPublic: false,
  minDeposit: 0.1 * LAMPORTS_PER_SOL,
  yieldStrategy: "Conservative"
});

// Join private pot
const joinTx = await sdk.buildJoinPrivatePotTx(potPubkey, "ELITE1");

// Tokenize shares
const tokenizeTx = await sdk.buildTokenizeSharesTx(potPubkey);

// Create SNS domain
const snsTx = await sdk.buildCreateSnsdomainTx(potPubkey, "mypot");

// Mint Tamagotchi NFT
const nftTx = await sdk.buildMintTamagotchiNftTx(potPubkey);
```

### PDA Helpers

```typescript
import { 
  getPrivatePotAddress,
  getSnsAddress, 
  getTamagotchiNftAddress,
  getTokenMintAddress,
  getTamagotchiMintAddress 
} from '@potbot/sdk';

const [privatePot] = getPrivatePotAddress(potPubkey);
const [snsAccount] = getSnsAddress(potPubkey);
const [tamagotchiNft] = getTamagotchiNftAddress(potPubkey);
```

---

## 🎯 Deployment

### Quick Deploy
```bash
# Deploy all premium features to devnet
./scripts/deploy-premium.sh
```

### Program Updates
1. New instructions added to `lib.rs`
2. Metaplex Token Metadata dependency
3. Fee collection to official treasury
4. PDA derivations for premium features

### Frontend Integration
1. Premium feature UI components
2. Modal dialogs for fee payments
3. Private pot creation form
4. Portfolio view updates

### API Backend
1. Tamagotchi metadata endpoint
2. SNS domain resolution
3. Premium feature status tracking

---

## 🔐 Security & Compliance

- **Soulbound NFTs**: Non-transferable, bound to pot owner
- **Invite Verification**: On-chain code validation
- **Fee Collection**: Direct treasury transfers
- **One-way Tokenization**: Cannot reverse share conversion
- **Access Control**: Private pot membership verification

---

## 📈 Monetization Strategy

PotBot v2 implements a **sustainable revenue model**:

1. **Core functionality remains free**
2. **Premium features generate revenue**
3. **Fees follow pump.fun pricing (optimized)**
4. **Value-add justifies costs**

**Projected Revenue**: 25-50 SOL/month from premium features at scale

**Fee Breakdown**:
- Tokenization: 0.1 SOL (moderate usage expected)
- SNS domains: 0.25 SOL (high value, accessible price)
- NFTs: 0.05 SOL (mass adoption potential)

---

## 🚧 Next Steps

1. **Deploy to devnet** for testing ✅
2. **UI integration** with wallet connections
3. **API backend** deployment (Railway/Fly.io)
4. **Demo video** showcasing premium features
5. **Hackathon submission** prep

---

**🏆 Ready for Solana Frontier Hackathon - May 11, 2026**

**💎 Treasury `2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o` is ready to receive fees.**"