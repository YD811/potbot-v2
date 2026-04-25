# Personal AI Voters — Twitter / X thread + Mirror post

> Drafts for the public formalization of the primitive. Schedule before hackathon submission so the narrative lands ahead of judging.

---

## Twitter / X thread (12 tweets)

**1/**
On Solana, AI agents already trade and pay for things.
We added one more thing: they vote.

Personal AI Voters — the first on-chain primitive that lets a member of a group trading vault delegate their seat to an AI. With a public, revocable rules contract.

🧵

**2/**
Not "an AI watches your vault."
Not "an AI manages your fund."
Not "the DAO has an AI seat."

A primitive: in a shared trading vault, *you* delegate your share-weighted vote to a wallet that an AI controls. The AI signs `vote_as_delegate` on-chain.

**3/**
Three on-chain pieces make it work:

`MemberDelegate` PDA — keyed by `(pot, member)`. Carries the delegate pubkey + a public `rules_uri` (Arweave/IPFS).

`vote_as_delegate(approve)` — only the delegate signs.

`VoterRecord` — keyed by **member.wallet**, not signer. Double-voting impossible.

**4/**
Why does the keying matter?

If `VoterRecord` were keyed by signer, an AI delegate + the member could each vote and double the weight. Keyed by member.wallet, both paths land on the same record. First write wins. Hot or revoked, the math is honest.

**5/**
The `rules_uri` is the contract.

Member uploads JSON to `ar://...` (immutable). Registers it on-chain via `register_delegate(delegate, rules_uri)`. The hash is committed too. If someone serves different rules later, the chain proves it.

**6/**
This works because the program never reads the rules.

The rules describe how the AI behaves. They are for *humans* and other agents to audit. The protocol just records who delegated what to whom, with what public commitment.

The AI's behavior is the social layer's business, not the chain's.

**7/**
Revocation is one ix.

`revoke_delegate()` sets `revoked_at`. The PDA is preserved — full audit history, forever. AI misbehaves? Revoke takes effect on the very next block. No trustee, no committee, no waiting period.

**8/**
Live on devnet right now:

Program: `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`
Demo pot: `CFke4rJqmx1HyWQxNuZWGitFGDSE5rmf7fhr3zJ1dWjC`
Three real on-chain txs verifiable on Explorer (linked in the README).

**9/**
The MCP server is the AI surface:

`npm install -g @potbot/mcp`

18 tools. Three of them produce real on-chain transactions:
• `register_delegate`
• `revoke_delegate`
• `vote_on_proposal` → `vote_as_delegate`

First MCP server with real on-chain write effects. Not advice — transactions.

**10/**
Grounded reasoning is enforced by the prompt layer.

`vault_strategist` prompt refuses to recommend without first calling `get_market_analytics(token)` (CoinGecko + RSI + 30d realized vol + trend) and `get_social_sentiment(token)` (LunarCrush + Reddit + CryptoPanic + VADER).

No bluff, no excuses.

**11/**
This isn't just for one product.

`MemberDelegate` is a portable pattern. Any vault, fund, DAO, or co-op can adopt the (delegate, rules_uri, VoterRecord by member.wallet) shape. We're shipping it as `@potbot/mcp` and a Solana skill so you don't have to think about it.

**12/**
Built solo over 5 weeks for the @SolanaFrontier hackathon. Shipping the primitive, the dev surface, and a reference dApp at potbot.fun.

If you want to try it as an AI delegate yourself, point Claude Desktop at `@potbot/mcp` and ask it to vote.

GH: github.com/YD811/potbot-v2

---

## Mirror.xyz post — "Personal AI Voters: a primitive for AI participation in group capital"

### Lede (one paragraph)

In April 2026, AI agents on Solana trade tokens, pay each other for tools (x402, MCPay), and run governance workflows for DAOs (Realms MCP). What they cannot yet do, in any shipped product, is hold a *seat* in a group capital pool — vote on its decisions, with weight tied to a real human's stake, under a public behavioral contract. PotBot v2 ships that primitive: `MemberDelegate`. This post is the design rationale, the on-chain shape, and an honest description of what it does and does not solve.

### Sections

1. **Why "delegated voting in a group vault" was missing**
   - Squads = custody. Realms = governance over arbitrary instructions, vote with tokens. Drift = single-manager vault. AI hackathon winners = solo strategists.
   - The gap: a shared trading vault where each member's seat can be operated by a delegate, including an AI.
   - Why it's specifically interesting for AI: rules transparency + revocable + share-weighted = the social trust contract is on-chain, not in TOS.

2. **The on-chain shape**
   - `MemberDelegate` PDA: `[b"delegate", pot, member]`, fields: delegate pubkey, rules_uri (≤200 chars), scope_mask, registered_at, revoked_at, bump.
   - `vote_as_delegate(approve: bool)` — delegate signs.
   - `VoterRecord` keyed by `member.wallet` (not signer) — the keying choice that prevents double-voting.
   - Why we did *not* put the rules on-chain: cost, mutability, and the protocol doesn't need to read them. Off-chain immutability via Arweave + a hash commitment is sufficient.

3. **What changes for the member**
   - Upload rules JSON to `ar://`. Register the AI's wallet as your delegate. The AI now signs your votes until you revoke.
   - You can revoke in one ix. The PDA is preserved for audit. Old rules versions stay forever provable.

4. **What changes for the AI**
   - It signs real transactions, not advice.
   - It's bound to the rules_uri it was registered with — drift is detectable by anyone.
   - It can call MCP tools (`get_market_analytics`, `get_social_sentiment`) to ground reasoning before voting.

5. **What it does *not* solve**
   - It doesn't make the AI's strategy good. That's the rules author's job.
   - It doesn't replace governance — quorum, timelocks, risk caps still apply.
   - It doesn't give AIs custody. Custody stays in the vault PDA. The AI only votes.

6. **A portable pattern**
   - Any vault protocol can adopt the (MemberDelegate, vote_as_delegate, VoterRecord by member.wallet) pattern.
   - We've open-sourced it (MIT) and shipped it as a Sendai skill so other teams can integrate without reinventing.

7. **Live now (devnet)**
   - Program: `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`
   - Demo pot, npm package, MCP tools, devnet tx hashes.

8. **What's next**
   - Phase 1 (post-hackathon, Q2 2026): kill-switch admin separate from authority, hash commitments for rules/description/strategy, auto-pause on drawdown, Light Protocol compressed audit log.
   - Phase 2 (Q3 2026): Auditable-Private mode (PrivacyCash deposits + stealth member addresses).
   - Phase 3 (Q4 2026): Sealed-Private mode (commit-reveal voting, encrypted strategy, shielded balances).

### Closing line
> The interesting frontier in 2026 isn't AI-managed funds. It's AIs as auditable, revocable participants in human-governed capital pools. We shipped the smallest piece of that picture. The rest is yours to extend.

---

## Schedule

| Channel | When | Notes |
|---|---|---|
| Twitter thread | 2026-05-01 (T-10 days from submission) | Lead-in for judges who skim socials |
| Mirror post | 2026-05-02 | Citable in submission "Press" section |
| Cross-post to Superteam NL Discord | 2026-05-03 | Grant context |
| Reshare during demo video drop | 2026-05-08 | Bundle traffic |
