# @potbot/mcp Changelog

## 0.6.0 — 2026-04-25

### Real market & social signals so the AI doesn't bluff

Adds 4 new tools that pull live fundamentals and crowd sentiment so an
AI strategist can ground proposals in observable data instead of vibes.

#### `get_market_analytics(token)` — fundamentals
Pulls the asset record from **CoinGecko** (free, key-less) plus 30d
daily price chart. Returns: USD price, market cap & rank, 24h volume,
%-changes (24h / 7d / 30d), ATH price + distance from ATH, FDV,
circulating + total supply. Computed signals:

- **30d realized volatility** — annualized stdev of daily log-returns, %.
- **14d RSI** — classic Wilder's RSI on the daily series.
- **30d trend label** — strong_up / up / sideways / down / strong_down.

Symbol resolver knows SOL, USDC, USDT, JUP, WIF, BONK, JITOSOL, MSOL,
BTC, ETH and a handful of Solana mint addresses. Extend `COINGECKO_IDS`
in src/data/market.ts for more.

#### `get_top_solana_protocols(limit)` and `get_protocol_stats(slug)`
Top Solana DeFi by **DefiLlama**. Filters out CEX / Bridge / RWA so
the list is actually Solana-native. Each protocol carries Solana-only
TVL, 1d / 7d % TVL change, category, and slug. The slug variant pulls
the full per-chain breakdown for one protocol.

#### `get_social_sentiment(token)` — crowd sentiment
Aggregates and labels the crowd:

- **Twitter via LunarCrush** (`LUNARCRUSH_API_KEY`) — top ~20 posts per
  topic with pre-computed influencer sentiment (1-5 scale → label).
- **Reddit via public JSON** (no key needed) — top weekly posts on
  r/solana, r/CryptoCurrency, etc. matching the symbol.
- **News via CryptoPanic** (`CRYPTOPANIC_API_KEY`) — recent headlines
  per coin with vote-derived sentiment.
- Every text item is also scored locally with **VADER**
  (vader-sentiment npm). External labels override VADER when present.

Output: a single `overall` (bullish / bearish / neutral) + numeric
score in [-1, 1] + confidence (low / medium / high based on sample
size). Per-source breakdowns, top posts/headlines with their
individual VADER compounds, and explicit warnings for missing keys.

Source weighting in the aggregate score: Twitter 50% · Reddit 30% ·
News 20%, renormalised over the sources that actually returned data.
So even with no LunarCrush key the tool works (Reddit-only, lower
confidence).

#### Prompt: `vault_strategist` upgraded
Now refuses to make recommendations without first calling
`get_market_analytics` and `get_social_sentiment`, and forces the AI
to cite specific numbers per signal in its rationale. Goal: stop AI
making up data when real data is one tool call away.

### Misc
- `vader-sentiment` added as a runtime dep (~50 KB, Apache-2.0, zero
  transitive deps).
- `.env.example` documents `LUNARCRUSH_API_KEY` and
  `CRYPTOPANIC_API_KEY` as optional but recommended.

### E2E verified on devnet (sample run)
- get_market_analytics(SOL) → price=$85.77 mcap_rank=7 30d_vol=52.82%
  RSI_14d=49.6 trend=sideways ATH=$293 -70.76% from ATH.
- get_top_solana_protocols(5) → Kamino Lend $1.5B / Sanctum $1.1B /
  Raydium $1.0B / BNSOL / Jito (CEX category filtered out).
- get_social_sentiment(SOL) without LunarCrush → bullish 0.323,
  Reddit 4↑/1↓/0→ of 5 r/CryptoCurrency posts.

## 0.5.0 — 2026-04-25

### Real on-chain reads (no more mock vaults)

The four discovery / analytics tools now hit Solana RPC for real PotAccount
and ProposalAccount data via `getProgramAccounts` filtered by Anchor
account discriminators (`sha256("account:<PascalCase>")[..8]`):

- `list_vaults` — discovers every PotAccount under the program ID, fetches
  each vault PDA balance in parallel, returns name, emoji, authority,
  is_public, member_count, trade_count, total_shares, governance settings,
  and live SOL TVL. No more `MOCK_VAULTS`.
- `get_leaderboard` — same source, sorted by `tvl_lamports`,
  `member_count`, `trade_count`, or `total_volume_lamports`.
- `get_vault_analytics` — decodes the full PotAccount header (authority,
  governance levels, quorum_bps, vote_timeout, min_deposit, yield_strategy,
  high_water_mark, agent_pubkey, next_proposal_id) plus real vault PDA
  balance and SPL holdings via `getTokenAccountsByOwner(vault_pda)`.
- **New `get_proposals`** — lists ProposalAccount PDAs for a vault, decoded
  with full Swap variant details (from_mint, to_mint, amount_in,
  min_amount_out), status, vote tally, snapshot, and timestamps.

Internal: new `BorshReader` + `decodePotAccount` / `decodeProposalAccount`
in `src/anchor.ts`. Deliberately decodes only the prefix fields needed by
each tool — robust against future field appends to the Rust struct.

### Real on-chain writes — first non-vote tools that actually transact

- `create_swap_proposal` — auto-derives next_proposal_id from PotAccount,
  builds the real `create_proposal` ix with `ProposalType::Swap`, returns
  base64 unsigned tx for the proposer to sign, OR signs+submits if
  `AGENT_KEYPAIR` is the proposer.
- `join_strategy_vault` — builds the real `deposit` ix (creates
  MemberAccount via `init_if_needed` on first deposit). Same dual return
  shape as above.

### E2E verification on devnet

This release was validated by a real flow against the upgraded program
`GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`:

1. `scripts/seed-test-pot.mjs` created **MCP Demo Pot** at
   `CFke4rJqmx1HyWQxNuZWGitFGDSE5rmf7fhr3zJ1dWjC`
   (tx `5oJpF5Ai...4GQ7hZk`).
2. `list_vaults` returned the new pot.
3. MCP `join_strategy_vault` deposited 0.5 SOL, MemberAccount created
   (tx `4V8i9MD3...HLWn4`).
4. MCP `create_swap_proposal` created Swap proposal #0
   (tx `2xQNzisj...g5d3AXn`).
5. `get_proposals` decoded the new proposal: status=Active, swap params,
   description, vote tally, total_shares_snapshot=500_000_000.

### Misc

- New `scripts/seed-test-pot.mjs` — one-shot devnet seed for reproducing
  the E2E demo.

## 0.4.0 — 2026-04-25

### Personal AI Voters — real on-chain delegation
- New on-chain program upgrade (devnet `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`):
  - `register_delegate(delegate, rules_uri)` — member registers a delegate wallet
    (typically an AI agent) that may sign votes on their behalf.
  - `revoke_delegate()` — member revokes the delegation; the PDA is preserved
    for audit trail.
  - `vote_as_delegate(approve)` — delegate signer submits a real on-chain vote;
    weight comes from `member.shares`, double-vote prevented because
    `VoterRecord` is keyed by the member's wallet (not the delegate's).
- `MemberDelegate` PDA: `[b"delegate", pot, member]` carries the delegate
  pubkey, IPFS / Arweave / https `rules_uri` for off-chain transparency,
  scope mask (reserved), and registered_at / revoked_at timestamps.

### MCP — new tools (4)
- `register_delegate` — builds the registration ix. Self-signs and submits
  if `AGENT_KEYPAIR` is the member; otherwise returns base64 unsigned tx
  for the member's wallet.
- `revoke_delegate` — same pattern for revocation.
- `check_delegate` — reads the on-chain MemberDelegate PDA: delegate pubkey,
  rules URI, registered/revoked timestamps, active flag.
- `agent_status` — exposes the AI delegate identity loaded by the MCP server
  (pubkey, devnet SOL balance, source format).

### MCP — `vote_on_proposal` upgrade
When `proposal_pubkey` and `member_wallet` are passed AND `AGENT_KEYPAIR` is
loaded AND a matching active delegation exists on-chain, the tool now
**signs and submits a real `vote_as_delegate` transaction**, returning the
signature and Solana Explorer link. Falls back to a dApp signing link
otherwise. This is the first MCP tool in the server that produces real
on-chain effects rather than instructions for a human signer.

### MCP — internals
- New `src/anchor.ts` module: discriminator computation
  (`sha256("global:<snake>")[..8]`), PDA helpers, raw instruction builders,
  keypair loading (base58 or JSON-array env), tx signing/sending, base64
  serialization. Deliberately does NOT depend on the IDL — the committed
  IDL is partial and would drift again.
- Added `bs58` dependency.

### Verification
On-chain instructions confirmed via simulateTransaction against devnet —
program logs `Instruction: RegisterDelegate` and `Instruction: VoteAsDelegate`,
proving the deployed bytecode recognizes the new entrypoints.

## 0.3.0 — 2026-04-25

### Real data (replaces mocks)
- `get_yield_rates` now hits **DefiLlama** (`yields.llama.fi/pools`) for live Solana yields with TVL > $100k. Risk classification: low (APY < 10% no IL) / medium (10–30% no IL) / high (> 30% or IL). Static estimates kept as offline fallback.
- `get_vault_analytics` now reports real **SPL token holdings** via `getTokenAccountsByOwner`, prices each holding via Jupiter Price API v2, and computes a real-balance NAV. Performance fields (PnL, APY, Sharpe) clearly tagged as `mock (devnet)` until on-chain accounting lands.
- All helpers stop swallowing fetch/RPC errors silently — surfaces a `warnings` array on the tool response so the agent (and humans) can see when an upstream is degraded.

### x402 hardening
- HTTP transport `verifyX402Payment` now performs **real on-chain verification**: `getTransaction` lookup, success-status check, USDC `pre/postTokenBalances` delta against `X402_RECEIVER_WALLET`. Previously only validated signature format.
- Added replay protection — used signatures cached, capped at 10k entries.

### MCP capabilities expansion
- Added **Resources**: `potbot://network/info`, `potbot://vaults/list`, `potbot://yields/solana`.
- Added **Prompts**: `vault_strategist`, `risk_auditor`, `yield_hunter` — canned multi-step workflows for AI clients.

### Misc
- Unified `POTBOT_API_URL` default to `https://api.potbot.fun` across stdio + http transports.
- Bumped advertised server version in both transports.

## 0.2.0 — 2026-04-23
- HTTP+SSE transport (`potbot-mcp-http` bin).
- x402 micropayment gating (signature-format-only verification).

## 0.1.0 — 2026-04-23
- Initial release. 9 stdio tools.
