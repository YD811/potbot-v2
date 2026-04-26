# Frontier Hackathon 2026 - Side Track Bounty Mapping

Last updated: 2026-04-26 (15 days, 19 hours to submission close).
Total prize pool: $397,914 across 51 side tracks.

This document maps every Frontier side track to PotBot v2 features and ranks each by likelihood of winning. See BOUNTY-ANALYSIS.md for the deeper Kora and Contra writeups; this file covers the broader sponsor surface revealed when Frontier opened.

## Tier 1: direct fit, ship a submission

These tracks match work we have done or are doing.

### Adevar Labs - $50,000 Security Audit Credits

Why we fit: we just shipped docs/PRIVATE_POTS.md (threat model, role matrix) and docs/INTEGRATIONS.md, and Codex is finishing role-based access control and a per-instruction security audit. What we need: write a one-page submission referencing the security-audit.md output, and explicitly request the credit in the form. Audit credits would let us harden pot_vault before mainnet cutover.

### MagicBlock x ST MY x SNS Privacy Track - $5,000

Why we fit: private POTs are the strongest privacy story in our stack (off-chain RLS, on-chain signer checks, Privy embedded wallets, no key paste). What we need: short writeup on the privacy model, link PRIVATE_POTS.md, demo creating a private pot.

### Cloak - $5,010 Privacy Payments

Why we fit: pot deposits and withdrawals are private payments inside a vault. Members onboarded via Privy never expose a wallet to the public. What we need: small adapter showing pot deposit as a privacy-preserving payment; mention private pot mode.

### SNS Identity Track - $5,000

Why we fit: pots already use SNS for vault names; we can extend SNS lookups to member roles. What we need: ensure member display names resolve via SNS in the Members tab; submit with screenshots.

### Dune Analytics - $6,000 Data Sidetrack

Why we fit: we already write to trade_log and leaderboard_cache; publishing a Dune dashboard pointing at our pot_vault program is a small effort. What we need: build a public Dune dashboard (Total Volume, Top Pots, Member Count, P&L histogram) and link it from the leaderboard page.

### Torque MCP - $3,000

Why we fit: we already ship @potbot/mcp. Connecting it through Torque MCP is a documentation + adapter task. What we need: register our MCP with Torque, add an MCP install snippet to README, demo agent calling pot_status.

### Jupiter - $3,000 jupUSD (Not Your Regular Bounty)

Why we fit: keeper executes via Jupiter Swap v6 + Trigger + DCA. We already have docs/DX-REPORT.md from prior bounty. What we need: short submission citing DX report, screenshots of strategy execution, and a video of a pot tick.

### Zerion - $5,000 + $2,000 Autonomous Onchain Agent

Why we fit: pots run autonomous strategies via the keeper, surfaced through MCP for AI agents. What we need: build a thin Zerion CLI wrapper that lets an agent call our MCP to propose and execute a trade.

### SagaPad - $1,000 Agentic Skills on X

Why we fit: we have @PotBot_sol on Twitter; can ship an agentic skill that posts pot summaries. What we need: small bot that watches new trades and posts a daily X thread.

## Tier 2: medium fit, attempt if time allows

### Eitherway - $20,000 (Solflare/Kamino/DFlow/Quicknode/Birdeye)

Why partial fit: we use Solana wallet adapter (Solflare supported). We could add Birdeye price widgets to the pot Overview tab. What we need: explicitly support Solflare deeplink, add Birdeye-powered price card on Overview tab.

### Visa Frontier Track - $10,000

Why partial fit: payments narrative; pots are group payments. Stretch.

### Tether - $10,000

Why partial fit: USDT is supported by Jupiter routes; we can prioritize USDT vaults. What we need: feature USDT in Create Pot UI.

### Jito - $2,000 Jito Infrastructure

Why partial fit: keeper could send transactions through Jito bundles for MEV protection. What we need: add Jito tip account + bundle support to keeper executor.

### Covalent GoldRush - $3,000

Why partial fit: extra analytics surface; complementary to Helius. What we need: integrate one GoldRush call (e.g., wallet token balances on Profile page).

### Umbra - $10,000 Privacy Side Track

Why partial fit: we already concept-integrated Umbra in CreatePotModal privacy step. What we need: finish the Umbra path end-to-end and submit.

### RPC Fast - $10,000 RPC Credits

Why partial fit: alternative to Helius; we could add it as a secondary RPC for failover. What we need: env var NEXT_PUBLIC_FALLBACK_RPC_URL=, fallback in getRpcUrl().

## Tier 3: regional / community tracks

There are roughly 25 regional sidetracks at $10,000 USDG each (Singapore, Turkey, Japan, Georgia, India, Germany, Ukraine, Nigeria, Canada, Balkan, Malaysia, Brazil, Indonesia, Ireland, Nepal, Korea, Poland, UAE, Australia, Netherlands, Pakistan, Kazakhstan and more).

Strategy: submit to one or two regions where we have the strongest narrative match. Y-DAO Amsterdam suggests Netherlands and Balkan are natural fits. Regional tracks often have lower applicant counts and judge for local relevance plus general quality.

## Recommended submission order

With 15 days, we have time for roughly 6 to 8 quality submissions:

1. Adevar Labs $50K - highest expected value; submission is a writeup, no extra code needed.
2. 2. MagicBlock Privacy $5K - private POTs already done; submission is writeup + demo.
   3. 3. SNS Identity $5K - already integrated; small polish + writeup.
      4. 4. Dune Analytics $6K - one afternoon to publish a dashboard.
         5. 5. Jupiter $3K jupUSD - we are heavy users; writeup only.
            6. 6. Torque MCP $3K - register MCP + writeup.
               7. 7. Zerion Autonomous Agent $5K + $2K - one Zerion CLI adapter + demo.
                  8. 8. Cloak $5K - small adapter + writeup.
                     9. 9. Superteam Netherlands $10K - regional, we are based in Amsterdam.
                        10. 10. Superteam Balkan $10K - second regional shot.
                           
                            11. Total expected ceiling on this list: $100K+ across primary tracks.
                           
                            12. ## Submission checklist template
                           
                            13. Each submission should include:
                           
                            14. - One-paragraph project summary (PotBot v2 - group trading vaults).
                                - - Specific feature for this bounty (one paragraph).
                                  - - Link to the relevant doc (PRIVATE_POTS.md, INTEGRATIONS.md, security-audit.md, DX-REPORT.md).
                                    - - Live demo link (potbot.fun/pots/DemoPoT...).
                                      - - 30-second video walking through the bounty-specific flow.
                                        - - Repository link with the relevant PR or commit hash.
                                          - - Any custom config the judge needs (Privy app id, webhook url, etc).
                                           
                                            - ## Coordination table
                                           
                                            - | Track | Sponsor | Prize | Status | Owner |
                                            - | --- | --- | --- | --- | --- |
                                            - | Security audit credits | Adevar Labs | $50,000 | Not started | TBD |
                                            - | Privacy track | MagicBlock | $5,000 | Not started | TBD |
                                            - | SNS Identity | SNS | $5,000 | Not started | TBD |
                                            - | Dune data sidetrack | Dune | $6,000 | Not started | TBD |
                                            - | Jupiter not your regular bounty | Jupiter | $3,000 | Not started | TBD |
                                            - | Torque MCP | Torque | $3,000 | Not started | TBD |
                                            - | Autonomous onchain agent | Zerion | $5,000 | Not started | TBD |
                                            - | Privacy payments | Cloak | $5,010 | Not started | TBD |
                                            - | Netherlands regional | Superteam NL | $10,000 | Not started | TBD |
                                            - | Balkan regional | Superteam Balkan | $10,000 | Not started | TBD |
                                            - 
