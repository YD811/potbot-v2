# Private POTs - Privacy and Security Reference

Last updated: 2026-04-26

A Private POT is the strongest privacy mode PotBot v2 offers. It is designed for groups who want trustless on-chain settlement with off-chain visibility limited to verified members.

## What is private vs public?

| Property | Public POT | Private POT |
| --- | --- | --- |
| Pot account on-chain | World-readable | World-readable (Solana state is public) |
| Member list | Anyone can see members | World-readable on-chain; Supabase mirror restricted |
| Trade log (Supabase) | Public read | Members + creator only via RLS |
| P&L feed | Public | Members + creator only |
| Strategy config | Public | Members + creator only via RLS; on-chain remains world-readable |
| Deposit | Anyone (if pot allows) | Anyone (becomes member on first deposit) |
| Withdraw | Members only | Members only |
| Propose / Vote | Members only | Members only |

The critical thing to understand: anything written to Solana is public. Private POTs add a privacy layer to the off-chain experience (Supabase, the web UI, the analytics surface) so that casual scrapers cannot mine member behavior. A determined on-chain analyst can still derive trade history from the program log; this is true of every Solana protocol.

## Threat model

We protect against:

1. Unauthorized withdrawal: a non-member trying to drain a pot. Mitigated on-chain by signer-vs-member checks in withdraw. The web UI also disables the Withdraw button for viewers, but the on-chain check is the source of truth.
2. 2. Unauthorized governance: a non-member submitting a proposal or vote. Mitigated by propose and vote instruction guards; the UI hides Create Proposal for viewers.
   3. 3. Strategy tampering: a non-creator pushing a malicious strategy. Mitigated by setStrategy requiring signer == pot.creator (or in future, governance vote).
      4. 4. Off-chain data leakage: scraping trade_log or members for a private pot via the Supabase anon key. Mitigated by RLS policies that join member visibility.
         5. 5. Phishing private keys: social engineering against a member. Mitigated by Privy MFA (roadmap) and by never asking users to paste keys; only wallet-adapter or Privy embedded signing is supported.
           
            6. We do NOT protect against:
           
            7. - A member voluntarily leaking trade data. That is a social trust problem.
               - - Solana RPC providers seeing transaction graphs. We use Helius which has its own privacy policy; users are notified.
                 - - Wallet provider compromises (Phantom, Backpack, etc).
                  
                   - ## Role matrix (what each role can do)
                  
                   - | Action | Viewer | Member | Creator |
                   - | --- | --- | --- | --- |
                   - | Read public pot metadata | yes | yes | yes |
                   - | Read trade log of a public pot | yes | yes | yes |
                   - | Read trade log of a private pot | no | yes | yes |
                   - | Deposit | yes (becomes member) | yes | yes |
                   - | Withdraw | no | yes | yes |
                   - | Create proposal | no | yes | yes |
                   - | Vote | no | yes | yes |
                   - | Edit strategy | no | no | yes |
                   - | Pause strategy | no | no | yes |
                   - | Add / remove member | no | no | yes |
                   - | Set pot visibility (public/private) | no | no | yes |
                  
                   - The usePotRole() hook in apps/web/src/hooks/usePotRole.ts returns the role for the connected wallet. The pot page header shows a small badge so users always know what they can do.
                  
                   - ## Onboarding for non-crypto-native members
                  
                   - Via Privy a member can join with an email address or social login. Privy provisions an embedded Solana wallet on first login. The user can later export the key or upgrade to an external wallet without losing pot membership (the pot tracks the wallet pubkey, not the auth method).
                  
                   - For creators of high-value private pots we recommend:
                  
                   - 1. Enable Privy MFA in the Privy dashboard.
                     2. 2. Add allowed origins (potbot.fun only) so a phishing clone cannot use your App ID.
                        3. 3. Use a hardware wallet for the creator role; let members use Privy if they prefer.
                           4. 4. Set a per-tx withdraw cap in the strategy config (roadmap).
                             
                              5. ## How members verify on-chain
                             
                              6. Every action in a pot has a transaction signature. The Analytics tab in the pot page shows the last five trades with one-click Solscan links. Members can verify:
                             
                              7. - The trade was signed by the keeper (not an unauthorized signer).
                                 - - The input/output mints match what the strategy proposed.
                                   - - The amounts match what the trade log records.
                                     - - The pot's vault token account balance changed accordingly.
                                      
                                       - If any of these don't match, file an issue in the GitHub repo and pause the strategy.
                                      
                                       - ## Operational guarantees from the keeper
                                      
                                       - - The keeper signs only with its dedicated keeper key, which has zero ability to drain the vault (it can only call executeTrade whose signature already validates the strategy).
                                         - - Tick errors do not crash the keeper; they are recorded to worker_metrics and the next tick proceeds.
                                           - - The keeper publishes a /health and /metrics endpoint for ops monitoring; if metrics drift (e.g. lastTickAt older than 5 minutes), alert.
                                            
                                             - See docs/operations/security-audit.md for the per-instruction checklist (created by the security RBAC PR).
                                             - 
