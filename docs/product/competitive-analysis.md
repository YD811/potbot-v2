# PotBot — Competitive Analysis, Partnerships & Integrations

Last updated: June 2026. Lives at `docs/product/competitive-analysis.md`. Sources at the end.

PotBot sits at the intersection of four categories. Nobody owns the full stack PotBot targets:
**non-custodial group vaults + on-chain governance + bounded AI + a creator economy + consumer onboarding.**
Our job is to be the friendly, social, group-native layer on top of mature Solana DeFi.

---

## 1. The landscape (four buckets)

**A. Vault / asset-management infrastructure** — Morpho, Midas, Symmetry
**B. Treasury / multisig** — Squads
**C. Liquidity / yield infra (integration targets, not competitors)** — Meteora, Kamino, Drift, Jupiter
**D. Trading terminals / copy-trading (closest to "trade together" mindshare)** — Axiom, Trojan, Photon, GMGN, BullX, BonkBot

---

## 2. Competitor teardown

### Morpho (vault infra, EVM-first, $10B+ TVL)
- **Strengths:** clean two-layer design (immutable primitive + curator vaults), role separation
  (Owner/Curator/Allocator/Sentinel), timelocks, caps; huge TVL; Coinbase distribution; institutional trust.
- **Weaknesses:** individual/institutional depositors, not social groups; not Solana-native; not consumer-friendly; no onboarding layer.
- **Steal:** role model + timelocks + caps; "infrastructure fixed, strategy plural"; curators-as-a-business with public track records.

### Midas (tokenized funds / LYTs, raised $50M / €43M)
- **Strengths:** share-price token model (deposit → mToken, NAV appreciates); composable across DeFi; instant redemptions; compliance-grade products; built ON Morpho (composability stacking).
- **Weaknesses:** institutional issuance, not groups/retail; permissioned; no governance/social layer.
- **Steal:** make POT shares a real, composable SPL token; "investor rights + transparency + controls" framing for institutional pots; redemption/liquidity thinking.

### Symmetry (Solana, on-chain index/basket vaults)
- **Strengths:** native Solana tokenized baskets; create/invest in community portfolios; automated rebalancing via Dutch auctions + oracle bands; composable basket tokens.
- **Weaknesses:** index/portfolio framing, not group governance or social; limited consumer onboarding; modest mindshare.
- **Steal:** basket tokenization + rebalance mechanics could power PotBot multi-asset pots; possible **integration** rather than head-to-head.

### Squads (Solana multisig/treasury, securing $10B+, raised $18M)
- **Strengths:** the Solana standard for multisig; time locks, spending limits, roles, sub-accounts; formally verified; trusted by teams; moving into stablecoin business accounts (Altitude).
- **Weaknesses:** approvals/custody control, not group trading, shares, performance, yield, or onboarding non-crypto members; built for teams/treasuries, not communities/retail.
- **Steal / partner:** you already use Squads v4 for high-value pots — lean into it as the "institutional security path." Not a competitor for your core social use case.

### Trading terminals & copy-trading (Axiom, Trojan, Photon, GMGN, BullX, BonkBot)
- **Strengths:** massive volume and mindshare for "trade like a pro / mirror good wallets"; fast execution, sniping, MEV protection, real-time discovery; great single-player UX.
- **Weaknesses:** custodial or key-holding; single-player; opaque; no shared ownership or governance; trust issues (e.g. the 2026 Axiom insider front-running scandal — a gift for our non-custodial narrative).
- **Steal / counter:** their discovery + copy-trading UX is excellent; PotBot's answer is "copy-trade *together*, non-custodially, with a vote." Use their trust failures as our positioning.

### Yield/LP products (DeFi Carrot, Perena, Yield's yoSOL, etc.)
- Adjacent yield primitives; mostly **integration candidates** for idle-capital routing, not competitors.

---

## 3. Positioning takeaways
- **Own the gap:** social + non-custodial + group governance + bounded AI + onboarding. Each
  competitor does 1–2 of these; none do all.
- **Lead with trust:** 2026 was full of custodial/agent failures (Axiom insiders, $40M+ vault
  drains). "Funds in a program, AI proposes but never holds keys" is a sharp, timely wedge.
- **Don't compete on raw execution** with Axiom/Trojan — compete on *together + safe + transparent*.
- **Use the giants as validation:** Morpho ($10B), Midas ($50M), Squads ($18M) prove the category is funded.

---

## 4. Feature comparison (quick matrix)
| Capability | Copy-trade bots | Squads | Symmetry | Morpho/Midas | PotBot |
|---|---|---|---|---|---|
| Non-custodial | partial | yes | yes | yes | **yes** |
| Group governance (on-chain, share-weighted) | no | approvals | no | no | **yes** |
| Bounded AI (propose, not execute) | no (or opaque) | no | no | no | **yes** |
| DeFi yield built-in | no | no | partial | yes | **yes** |
| Creator economy / fees | partial | no | partial | curators | **yes** |
| Composable shares (SPL/NAV) | no | no | yes | yes | **planned/yes** |
| Consumer onboarding (email + fiat) | some | no | no | no | **yes** |

---

## 5. Who to partner with / integrate (prioritized)

**Tier 1 — integrate now (core value, low risk, mature):**
- **Jupiter** — swaps/routing (already used). Deepen: Limit Orders, DCA.
- **Kamino** — idle-capital yield (lending, vaults). High user value.
- **Privy** — email/embedded wallets (the onboarding hero flow).
- **MoonPay** — fiat on-ramp at join. Converts newcomers.
- **Squads v4** — institutional security path for high-value pots (already integrated).

**Tier 2 — integrate next (depth + differentiation):**
- **Pyth / Switchboard** — robust price oracles for caps/PnL (you list Pyth already).
- **Meteora** — LP/vault yield + liquidity for pot shares.
- **Symmetry** — basket/rebalance engine for multi-asset pots (integrate vs rebuild).
- **Metaplex Core** — NFT strategy shares / Money Tree collectibles.
- **Solana native Subscriptions & Allowances** — premium tier billing (post-deploy).

**Tier 3 — distribution & ecosystem partnerships (growth):**
- **Superteam NL / Colosseum** — grants, accelerator, credibility (already engaged).
- **Wallets (Phantom, Backpack)** — Blinks distribution + featured placement.
- **KOLs / trading communities** — seed Strategy Vaults with audiences (creator flywheel).
- **Helius** — RPC + webhooks (already used); co-marketing potential.

---

## 6. Threats & how we defend
- **A terminal (Axiom/Trojan) adds "group mode."** Defense: true non-custody + on-chain governance is
  hard to bolt on; our onboarding + creator economy compound. Move fast on the social moat.
- **Squads moves down-market to communities.** Defense: we're trading + yield + AI + onboarding, not
  just approvals; partner where possible.
- **Yet another vault protocol.** Defense: group/social + consumer onboarding is the differentiator;
  shares composability keeps us in the broader DeFi graph.

---

## 7. Action items
1. Lock Tier-1 integrations into the live product (Jupiter+, Kamino, Privy, MoonPay, Squads path).
2. Pick 2 partnership outreaches now: a wallet (Blinks distribution) + a KOL (seed a Strategy Vault).
3. Decide build-vs-integrate for multi-asset (lean: integrate Symmetry-style rebalancing).
4. Put the trust narrative (vs Axiom-style scandals) front and center in product + content.

---

## Sources
- Morpho: docs.morpho.org (Vault V2, Curator); hypernative.io. Midas: docs.midas.app; morpho.org/stories/midas; CoinMarketcap (raise).
- Symmetry: symmetry.fi; solanacompass.com/projects/symmetry. Meteora: solanacompass.com/projects/meteora.
- Squads: squads.xyz; solanacompass.com/projects/squads; crypto.news (Altitude $18M raise).
- Copy-trading/terminals: walletmaster.tools; trojan.com/blog; programminginsider.com (Axiom scandal coverage).
- Solana ecosystem & market: solana.com/news; DefiLlama.
```
