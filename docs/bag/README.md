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
| `BAG_JUP_REFERRAL_FEE_BPS` | optional | 50–255, default 50. Jupiter keeps 20% of it |
| `JUPITER_API_KEY` | optional | Sent as `x-api-key`. Swap V2 also works keyless at lower rate limits |
| `BAG_RPC_URL` | recommended | Mainnet RPC for reads and tx verification (Helius). Server-only |
| `BAG_BLOCKED_COUNTRIES` | optional | Default `US,CU,IR,KP,SY,RU,BY`. Product guardrail, not legal advice |
| `NEXT_PUBLIC_BAG_MIN_BUY_USDC` / `_MAX_BUY_USDC` | optional | Default 10 / 500 |
| `NEXT_PUBLIC_BAG_SLIPPAGE_BPS` / `_MAX_PRICE_IMPACT_PCT` | optional | Default 100 bps / 2% |
| `BAG_GENESIS_END` | optional | Default `2026-12-03T23:59:59Z` (×2 buy points before this time) |
| `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` | for points | Without them buys still work and points are skipped |

## Launch checklist
1. Apply the Supabase migration.
2. Create the Jupiter referral account and its USDC token account, then set the env vars.
3. Smoke test on mainnet with $10–20 from the team wallet: both live legs land, `/api/bag/holdings` shows them, and `bag_buys` gets a row.
4. On 19.11, after the IPO: confirm the ANT mint from the issuer, check its liquidity on Jupiter (a $100 quote with price impact under 1%), set `NEXT_PUBLIC_BAG_ANT_MINT` and redeploy.
5. Promote to production only after YD says yes.

## Known limits (beta)
- Wallet-adapter wallets only (Phantom, Solflare). Privy embedded wallets are not wired in yet.
- No sell or rebalance-by-selling. A new buy tops up underweight legs first.
- The leaderboard ignores the referral bonus. The wallet page shows full points.
- If one leg fails, the others still land. The user sees a per-leg status and can buy the missing leg again.
