---
name: solana-security-review
description: >-
  Pre-mainnet security review checklist for the PotBot Anchor programs and DeFi integrations.
  Use before any mainnet deploy, when reviewing program changes that touch funds, CPI, or
  governance, or when the user asks for an audit / security pass / "проверь на безопасность".
  Tailored to non-custodial vaults handling user funds.
---

# Solana security review — PotBot

Run this before mainnet and on any change to fund-moving or governance code. Goal: no path lets
anyone move funds except a passed proposal executed by the program. Inspired by Morpho Vault V2's
role separation + timelocks + caps.

## 1. Account & authority checks
- Every privileged instruction validates the signer (`Signer`) and ownership (`has_one`,
  `constraint`, `address =`). No instruction trusts a client-passed pubkey for authority.
- PDAs derived with correct seeds + `bump`; no user-supplied bump without verification.
- Token accounts: verify mint, owner, and that the vault PDA is the authority.
- No `AccountInfo` used where a typed/owned account is required.

## 2. Fund-movement invariants
- Funds leave the vault ONLY via `execute_proposal`/`execute_swap` after a passed vote.
- Withdraw burns the right share amount and pays proportional value (recomputed on-chain).
- Share/NAV math: checked arithmetic only (`checked_add/mul/div`), no silent overflow, no
  precision loss that lets dust drain value. Guard divide-by-zero on empty pools.
- Re-entrancy / double-execute: a proposal can execute at most once (status flips, checked first).

## 3. Governance integrity
- Vote weight = shares at the correct snapshot; can't vote twice; can't vote after window.
- Quorum + approval thresholds enforced before execution; `maxSwapPct` / budget caps respected.
- Settings changes can't retroactively pass an in-flight proposal.
- (Recommended) Timelock on risky param changes (quorum, approval %, caps, maxSwapPct).

## 4. Roles (recommended hardening)
- Sentinel/guardian: can freeze pot / cancel a proposal, can NEVER withdraw or change ownership.
- Clear separation: authority/owner vs sentinel vs member; compromise of one ≠ loss of funds.
- When frozen: deposits-execution and proposal execution blocked; withdraw policy explicit.

## 5. CPI safety (Jupiter / SPL / yield protocols)
- Validate the target program id against an allowlist before CPI.
- For swaps: enforce min-out / slippage bounds; verify the destination is the vault.
- Per-protocol and per-asset exposure caps enforced at execution time.
- Don't forward more accounts/authority than the CPI needs.

## 6. Oracle / pricing
- Price used for caps/PnL has staleness + sanity checks (Pyth/Switchboard/Jupiter); reject stale.
- Never let a manipulable spot price gate a fund movement without bounds.

## 7. Keeper / agent / off-chain
- Keeper and agent-cron can only PROPOSE or run permissionless cranks; they cannot move funds.
- Executor key scope is minimal; rotate-able; not in git.
- x402 / API gates don't expose privileged actions.

## 8. Ops & supply chain
- No secrets/keypairs committed; CI doesn't leak env.
- Dependencies pinned; minimal external crates; `cargo audit` clean if available.
- Upgrade authority intentional (consider Squads v4 multisig); buffer kept for fast patch.

## Output
Produce a findings list: Critical / High / Medium / Low, each with file:line, impact, and a fix.
Block mainnet on any Critical/High. Re-run after fixes. Tests must cover each fixed issue.
