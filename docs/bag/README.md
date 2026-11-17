# BAG MVP: Bitcoin · Anthropic · Gold

`potbot.fun/bag` is a non-custodial one-click buy. The user pays USDC, and Jupiter Swap V2 buys each leg (cbBTC, tokenized ANT, gold) straight into the user's wallet. No PotBot program or vault is involved and no index token is minted. BAG Points are tracked off-chain in Supabase.

## Files
- `apps/web/src/lib/bag/config.ts`: leg allowlist, weights, limits, split logic
- `apps/web/src/lib/bag/server.ts`: Jupiter Swap V2 order/execute, mainnet RPC, geo check
- `apps/web/src/lib/bag/points.ts`: points rules (pure functions)
- `apps/web/src/app/api/bag/{order,execute,holdings,leaderboard}`: API routes
- `apps/web/src/app/api/cron/bag-hold-points`: daily hold snapshot (Vercel cron, 03:17 UTC)
- `apps/web/src/app/bag/page.tsx` and `apps/web/src/components/bag/BagClient.tsx`: the page
- `supabase/migrations/20261117120000_bag_points.sql`: tables

## Environment (Vercel)
| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_BAG_ANT_MINT` | for the ANT leg | Set on 19.11 **only** from the issuer's official list. Jupiter search already shows fake "ANTX" tokens |
| `NEXT_PUBLIC_BAG_ANT_SYMBOL` / `_ISSUER` / `_DECIMALS` | optional | Defaults: `ANTx` / xStocks / 8. Check decimals on-chain |
| `NEXT_PUBLIC_BAG_GOLD` | optional | `xaut0` (default) or `paxg` |
| `BAG_JUP_REFERRAL_ACCOUNT` | for revenue | Jupiter referral account. Also create a referral token account for **USDC** (the fee mint for USDC→X swaps), or the fee is skipped |
| `BAG_JUP_REFERRAL_FEE_BPS` | optional | 50–255, default 100 (1%). Jupiter keeps 20% of it |
| `NEXT_PUBLIC_BAG_BUY_ENABLED` | to open buying | `1` turns the buy cards on. Default off: `/bag` is the builder, gallery and joins only |
| `JUPITER_API_KEY` | optional | Sent as `x-api-key`. Swap V2 also works keyless at lower rate limits |
| `BAG_RPC_URL` | recommended | Mainnet RPC for reads and tx verification (Helius). Server-only |
| `BAG_BLOCKED_COUNTRIES` | optional | Default `US,CU,IR,KP,SY,RU,BY`. Product guardrail, not legal advice |
| `NEXT_PUBLIC_BAG_MIN_BUY_USDC` / `_MAX_BUY_USDC` | optional | Default 10 / 500 |
| `NEXT_PUBLIC_BAG_SLIPPAGE_BPS` / `_MAX_PRICE_IMPACT_PCT` | optional | Default 100 bps / 2% |
| `BAG_GENESIS_END` | optional | Default `2026-12-03T23:59:59Z` (×2 buy points before this time) |
| `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` | for points | Without them buys still work and points are skipped |

## Build your BAG (17.11.2026)
`/bag` is now a builder: three sliders (Bitcoin, Anthropic, gold) that always add up to 100%, a name and a link. Saving signs a **message** (no transaction, no funds) and creates a recipe with its own page `/bag/<slug>` and a share card (`opengraph-image`).

- `apps/web/src/lib/bag/recipes.ts`: weights validation, slider rebalance, slugs, signed messages (pure)
- `apps/web/src/lib/bag/fees.ts`: fee model. 1% fee, Jupiter keeps 20%, net split 60% treasury / 25% creator / 15% referrer. Creator and referrer shares are **tracked as points only**; nothing is paid out
- `apps/web/src/lib/bag/sig.ts`: Ed25519 check of the wallet signature
- `apps/web/src/app/api/bag/recipes` (GET list, POST create) and `apps/web/src/app/api/bag/join` (POST)
- `apps/web/src/components/bag/{BagBuilder,BagGallery,BagJoin,WeightBar}.tsx`
- `supabase/migrations/20261117210000_bag_recipes.sql`: `bag_recipes`, `bag_joins`, `bag_buys.bag_slug`

Rules: at least 2 assets, whole percents, 3 BAGs per wallet, one joined BAG per wallet. Joining links the wallet to the BAG's creator in `bag_referrals` (first referrer wins), so buys after launch count for the creator through the existing +10% referral rule. When buying is on, a buy on `/bag/<slug>` is split by the recipe's weights and stored with `bag_slug`.

## Checking a new mint (ANT on 19.11)
`cd apps/web && npx tsx scripts/bag-check-mint.ts <mint> --expect-symbol ANT`

Read-only. Reports token program, Token-2022 extensions, issuer powers, Jupiter verification and $100/$500 quotes, then GO / GO WITH RISK BADGES / NO. A transfer hook, default-frozen accounts or no route are NO. A pass is necessary, not sufficient: the mint must also be on the issuer's official list.

## Launch checklist
1. Apply both Supabase migrations (`20261117120000_bag_points.sql`, then `20261117210000_bag_recipes.sql`).
2. Create the Jupiter referral account and its USDC token account, then set the env vars.
3. Smoke test on mainnet with $10–20 from the team wallet: both live legs land, `/api/bag/holdings` shows them, and `bag_buys` gets a row.
4. On 19.11, after the IPO: confirm the ANT mint from the issuer, check its liquidity on Jupiter (a $100 quote with price impact under 1%), set `NEXT_PUBLIC_BAG_ANT_MINT` and redeploy.
5. Set `NEXT_PUBLIC_BAG_BUY_ENABLED=1` to open buying.
6. Promote to production only after YD says yes.

## Known limits (beta)
- Wallet-adapter wallets only (Phantom, Solflare). Privy embedded wallets are not wired in yet.
- No sell or rebalance-by-selling. A new buy tops up underweight legs first.
- The leaderboard ignores the referral bonus. The wallet page shows full points.
- If one leg fails, the others still land. The user sees a per-leg status and can buy the missing leg again.
