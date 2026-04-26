# PotBot v2 — Integration Stack

Last updated: 2026-04-26

This document is the canonical map of every external protocol or service PotBot v2 depends on, why we use it, and where it lives in the codebase. It also records the privacy and security guarantees we promise to users when they use a private POT.

## At a glance

| Layer | Provider | Purpose | Where |
| --- | --- | --- | --- |
| Settlement | Solana mainnet (devnet for staging) | Custody, share accounting, governance votes | `programs/pot_vault` |
| RPC | Helius (primary), public mainnet-beta (fallback) | High-reliability RPC + websockets for the keeper and the web app | `apps/keeper`, `apps/web/src/lib/rpc.ts` |
| Swap routing | Jupiter v6 + Trigger + DCA | Best-execution swaps inside the vault, limit + DCA orders for strategies | `apps/keeper/src/executor.ts` |
| Auth | Solana Wallet Adapter + Privy | External wallets and email/social onboarding with embedded wallets | `apps/web/src/components/PrivyProviders.tsx` |
| Off-chain mirror | Supabase | Read-optimized projections of on-chain state, leaderboard cache, trade log | `apps/keeper/src/supabase-sync.ts` |
| Explorers | Solscan, Helius XRAY | Deep-links from the UI for transparent verification | `apps/web/src/lib/explorer.ts` |
| Agent surface | MCP server (`@potbot/mcp`) | AI-native interface for proposing trades and reading pot state | `apps/potbot-mcp` |

## Why each integration matters

### Helius RPC

We centralize the RPC URL behind `getRpcUrl()` and accept `NEXT_PUBLIC_SOLANA_RPC_URL` (web) and `SOLANA_RPC_URL` (keeper). Helius gives us higher rate limits, geo-distributed endpoints, and the XRAY explorer for transaction inspection. The fallback to `api.mainnet-beta.solana.com` keeps the app functional if the key rotates.

### Privy

Privy is offered alongside the existing wallet adapter, never replacing it. New users can sign in with email or a social provider and Privy provisions an embedded Solana wallet for them; existing wallet users keep their Phantom / Backpack / Solflare flow. The unified hook `useUnifiedWallet()` returns a single `{publicKey, signTransaction, source}` interface so feature code does not branch on the auth source.

### Solscan + Helius XRAY

Every pot, vault, and confirmed swap exposes a one-click link to a public explorer. This is the most important UX guarantee for trust: members never need to take the keeper's word that a trade happened. The Analytics tab on the pot page surfaces these links and the last five `trade_log` rows for the pot.

### Jupiter

The keeper executes strategy ticks via Jupiter Swap v6 for spot routes, Trigger for limit orders, and DCA for time-weighted entries. All three return a transaction signature that the keeper logs to `trade_log` with `triggerReason` set to the strategy decision that produced it.

### Supabase

Supabase is a read mirror; the keeper writes with the `service_role` key, the web app reads with the `anon` key. RLS policies (see `docs/security-audit.md`) restrict private-pot trade logs to verified members.

## Privacy model for private POTs

A private POT is a pot whose `members` set is enforced both on-chain and in the Supabase mirror.

1. On-chain: every state-mutating instruction (`deposit`, `withdraw`, `propose`, `vote`, `executeTrade`) verifies the signer is in `PotAccount.members` (or `PotAccount.creator` for creator-only actions) before doing anything else. Failing this check aborts the transaction.
2. 2. Off-chain: Supabase RLS on the `trade_log` and `members` tables joins to the `pot_visibility` flag. When `visibility = 'private'`, SELECT requires the calling JWT to resolve to a wallet listed in `members.pot_pubkey = trade_log.pot_pubkey`.
   3. 3. UI: the `usePotRole()` hook returns `creator | member | viewer` and gates Withdraw, Create Proposal, Edit Strategy, and member management. Viewers never see a working button for actions they cannot perform; instead they see a disabled state with a tooltip explaining why.
      4. 4. RPC: the web app never sends a wallet's private signing material anywhere. Privy embedded wallets sign in-browser; external wallets sign via the wallet adapter. The keeper has its own dedicated signer for tick automation and never has access to user keys.
        
         5. A full audit checklist is maintained in `docs/security-audit.md`.
        
         6. ## Environment variables
        
         7. Never commit real values. Add the following to `.env.example` files only.
        
         8. ### `apps/web/.env.example`
        
         9. ```
            NEXT_PUBLIC_SUPABASE_URL=
            NEXT_PUBLIC_SUPABASE_ANON_KEY=
            NEXT_PUBLIC_SOLANA_RPC_URL=  # https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
            NEXT_PUBLIC_PRIVY_APP_ID=cmo7w4ycz00oi0cjuypf7pjuf
            NEXT_PUBLIC_CLUSTER=mainnet  # or devnet
            ```

            ### `apps/keeper/.env.example`

            ```
            SUPABASE_URL=
            SUPABASE_SERVICE_ROLE_KEY=
            SOLANA_RPC_URL=  # Helius preferred
            KEEPER_ENABLE_WORKER=true
            KEEPER_TICK_INTERVAL_MS=30000
            POT_VAULT_PROGRAM_ID=
            ```

            ## Sponsor mapping (Solana Frontier 2026)

            | Sponsor | Track / bounty | How PotBot uses them |
            | --- | --- | --- |
            | Jupiter | Swap, Trigger, DCA | Strategy execution, limit orders, DCA entries inside the vault |
            | Helius | RPC + XRAY | Primary RPC for keeper + web; XRAY links from Analytics tab |
            | Privy | Embedded wallets | Email/social onboarding so non-crypto-native users can join a pot |
            | Solscan | Explorer | Transaction provenance for every trade and member action |
            | Squads | Multisig | (Roadmap) optional multisig signer for high-value pots |
            | Meteora | Yield | (Roadmap) idle vault funds routed to Meteora pools when strategy permits |
            | Drift | Perps | (Roadmap) leveraged strategies for advanced pots |

            ## Roadmap signals

            - Streaming push notifications via Helius webhooks when a pot member proposes or executes a trade.
            - - Privy MFA for high-value pots (creator-configurable threshold).
              - - Per-pot Solscan dashboards embedded as iframes in the Analytics tab.
                - - MCP server exposing `pot_status`, `propose_trade`, `recent_trades` so any agent can act on a pot the user owns.
                  - 
