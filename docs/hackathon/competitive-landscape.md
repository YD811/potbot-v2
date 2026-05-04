# PotBot — Competitive Landscape & Positioning

> Snapshot date: 2026-04-25.
> Source: Colosseum Copilot dataset (5,400+ Solana hackathon projects, 6 hackathons of winners), live web research (Solana ecosystem reports Feb/Mar 2026, Solana Compass, project sites), local hackathon-winners.md dataset.

---

## TL;DR

As of April 2026, **no shipped product** combines:
1. shared trading vault (group capital, on-chain custody, programmable execution)
2. share-weighted governance with risk caps + timelocks
3. per-member AI delegation with public, immutable rules URI

PotBot is the first to ship all three, and the `MemberDelegate` PDA + `vote_as_delegate` instruction is the on-chain primitive that makes (3) possible without trusting the agent for custody.

---

## Direct competitors and adjacent products

### Squads v4 — multisig leader, $10B+ secured
**Where they overlap:** custody + threshold approval. Used by Pyth, Drift, Orca, Mango for treasury and program upgrade authority.
**Where PotBot diverges:**
- Squads = signature threshold (e.g. 3-of-5).
- PotBot = share-weighted votes scaled by `MemberAccount.shares`, governance levels (Autocracy / Advisory / Majority / Supermajority / Consensus), risk caps (`max_swap_pct`, `max_budget_grant_pct`), per-seat AI delegation.
- PotBot pots can use Squads as `kill_switch_admin` on mainnet (Phase 1+ roadmap).
**Threat level:** low. Different shape.

### Realms (+ Realms MCP, Q1 2026)
**Where they overlap:** AI agents acting in governance via MCP. Realms shipped agent-managed governance workflows in Q1 2026.
**Where PotBot diverges:**
- Realms = generic DAO governance over arbitrary instructions.
- PotBot = vault-native governance over a specific instruction set (`Swap`, `BudgetGrant`, `MemberChange`, `SettingsChange`) with integrated Jupiter v6 CPI, Pyth oracle guard, on-chain risk caps.
- Realms members typically vote with governance tokens; PotBot members vote with shares directly mapped to vault NAV.
**Threat level:** medium — they share narrative ground on "AI-governed groups." Differentiator must be loud: vault-first, not DAO-first.

### Drift Vaults
**Where they overlap:** vault delegation to an AI agent via solana-agent-kit.
**Where PotBot diverges:**
- Drift = depositor → single manager (1:1 trust model).
- PotBot = N members → group governance → each seat optionally delegated to its own AI (N:M model).
- Drift Vault depositors don't co-govern; PotBot members do.
**Threat level:** low — different ownership model.

### AI hackathon winners (Jan 2025): Hive, Cleopetra, Plutus
**What they did:** single-AI DeFi strategists. Hive ($60K — DeFi agent network), Cleopetra ($15K — LP optimization), Plutus ($15K — DeFi strategy).
**Where PotBot diverges:** PotBot's AI is a **delegated participant in a group** with public rules. Theirs is a sole strategist for the depositor.
**Threat level:** low — different narrative ("the AI runs your fund" vs "you delegate your seat to an AI").

### Symmetry, Sanctum baskets, Saber pools
**What they do:** passive index-style baskets, no active governance.
**Threat level:** none — different category.

### Institutional 2026 launches: R3 Corda Solana, State Street + Galaxy SWEEP
**What they do:** tokenized RWA vaults for institutional capital.
**Threat level:** none — orthogonal segment.

---

## Match against Colosseum winning patterns (2023–2026)

| Pattern | Source | PotBot status | Action taken |
|---|---|---|---|
| **#1 — Grand Champions ($50K) are infrastructure, not consumer apps** | TapeDrive, Ore, Reflect, Underdog, Unruggable, FluxBot | ⚠️ Was framed as a dApp. **We ship a primitive (`MemberDelegate`) + a developer surface (`@potbot/mcp` on npm).** | Repositioned `docs/hackathon/submission.md` one-liner around the two infrastructure pieces; dApp = reference client. |
| **#2 — Novel primitives beat incremental improvement** | Ephemeral NFTs, hedge stablecoins, PoW on Solana, MCPay | ✅ Personal AI Voters is genuinely novel — no other live product has it | Lead with this in submission + Sendai skill. |
| **#5 — AI x crypto wins when AI is the user, not the feature** (newest pattern, Cypherpunk + Breakout 2025) | MCPay, Latinum, FluxBot | ✅ Three MCP tools produce real on-chain transactions signed by the AI delegate | Make the on-chain effect the demo's climax. |
| **#6 — Working demo non-negotiable (judging weight: 30%)** | All winners | ✅ Real devnet txs verifiable on Explorer, scripted 90-sec video | High priority for May 6-8 shoot. |
| **#3 — Developer tooling punches above its weight** | Seer, Txtx, Wysdom, FluxRPC | 🟡 `@potbot/mcp` qualifies as dev tooling | `for-agents` page on potbot.fun + Sendai skill PR. |
| **#4 — DePIN wins every hackathon** | SvachSakthi, Shaga, Blockmesh | n/a — not our category | Skip. |

---

## Track distribution of past winners

| Track | # winners | PotBot relevance |
|---|---|---|
| DeFi | 9 | ✅ primary track |
| Infrastructure | 7 | ✅ secondary track (MCP server + on-chain primitive) |
| AI x Crypto | 3 (growing) | ✅ tertiary track |
| Developer Tooling | 4 | 🟡 partial fit (MCP server for AI builders) |
| DePIN, Gaming, Consumer/Social, Payments, Security/Privacy, NFT, DAO | various | n/a |

Submission strategy: **lead DeFi**, **co-submit Infrastructure + AI Agents** to maximize judge surface area without diluting narrative.

---

## Crowdedness assessment per track

| Track | Crowdedness | PotBot's wedge |
|---|---|---|
| DeFi | crowded → saturated | "Group vault" is a sub-niche with few entries |
| Infrastructure | moderate | First MCP server with real on-chain writes is a clean claim |
| AI x Crypto | hot but narrow primitives | Personal AI Voters is novel-shaped |
| DAO governance | moderate (Realms dominant) | Vault-native sub-segment underserved |

---

## Defensibility (moat) analysis

### What PotBot can defend
1. **Personal AI Voters as a primitive.** First-mover on `MemberDelegate` PDA + `vote_as_delegate` ix design. Other products will copy the *idea*, but the on-chain pattern (VoterRecord keyed by member.wallet not signer) is a non-trivial design choice that prevents double-voting.
2. **MCP-native distribution.** `@potbot/mcp` shipped to npm; once Sendai-marketplace skill lands, distribution compounds.
3. **Money Tree as retention loop.** Stage progression + Health mechanics is content/game-design, harder to clone than a contract.
4. **Reference client UX (potbot.fun).** Polish + flow is non-trivial to replicate; brand and community accumulate.

### What PotBot **cannot** defend
1. The MCP server pattern itself (open standard).
2. Group vault structure as concept (Squads/Realms can ship adjacent features).
3. Anchor program code (open source, MIT).

### Implication
Lean into the primitive and the developer surface. Make the brand and community a moat over time. Don't try to defend code.

---

## Threats to monitor

| Threat | Source | Mitigation |
|---|---|---|
| Realms ships per-seat delegation in Realms MCP | Possible — they have governance heritage and infra | Differentiate on vault-native + active trading + Money Tree retention. Move first on Sendai skill, Mirror post. |
| Drift Vaults adds multi-depositor governance | Possible — they have vault primitive | Drift's brand is single-manager perpetuals. Vertical reach into group governance unlikely soon. |
| Squads adds active execution layer | Unlikely — they're enterprise-focused | Squads = custody for funds. Different ICP. |
| Solana Agent Kit ships group-vault skill | Possible if Sendai prioritizes — but our PotBot skill PR pre-empts this. | Ship the skill first. |
| AI agent regulation classifies delegated voting as advice | Possible mid-2026 | rules_uri immutability + on-chain audit trail = transparency story for regulators. |

---

## Recommended differentiation angle

Three lines to use everywhere:

1. **"PotBot is the first protocol where each seat in a shared trading vault can be delegated to a personal AI."** — This sentence does not describe Squads, Realms, Drift, or any AI hackathon winner. It only describes PotBot.
2. **"`@potbot/mcp` is the first MCP server in the Solana ecosystem where AI tools produce real on-chain transactions, not advice."** — Verifiable on Explorer (3 tx hashes in submission).
3. **"`MemberDelegate` is a primitive other vault protocols can adopt — the rules-URI commitment + member.wallet keyed VoterRecord is a portable design pattern."** — Frames PotBot as ecosystem-positive, not zero-sum.

Use these three lines in: hackathon submission first paragraph, Sendai skill description, Mirror post lede, Twitter thread cold opener, grant applications, podcast pitches.

---

## Sources

- Local Colosseum dataset: `~/.claude/skills/data/colosseum/hackathon-winners.md` — 6 hackathons, all grand champions and notable track winners.
- [Solana Ecosystem Report Feb 2026](https://solana.com/news/state-of-solana-february-2026) — Realms agent-ready, Realms MCP shipped.
- [Solana Compass — Squads project review](https://solanacompass.com/projects/squads) — $10B+ secured, customer list.
- [Squads $10B story (Fystack)](https://fystack.io/blog/squads-from-zero-to-the-multisig-protocol-securing-10b-on-solana).
- [Solana Agent Kit — Drift Vaults integration](https://github.com/sendaifun/solana-agent-kit).
- [Hive / Cleopetra / Plutus (Jan 2025 AI hackathon)](https://coinlaunch.space/blog/solana-ai-hackathon-the-best-ai-agents/).
- [State Street + Galaxy SWEEP](https://www.coindesk.com/markets/2025/12/10/state-street-and-galaxy-to-launch-tokenized-liquidity-fund-on-solana-in-2026).
- [Solana Frontier Hackathon 2026 announcement (NeosLegal)](https://neoslegal.co/neoslegal-solana-hackathon-partnership/).
