---
name: potbot-anchor
description: >-
  Conventions and safe-change rules for the PotBot Anchor programs (pot_vault, pot_duel).
  Use when adding or modifying instructions, accounts, PDAs, or governance logic in
  packages/program, when touching account layouts/migrations, or wiring program changes
  into the SDK and the web mock store. Triggers on "add instruction", "change the program",
  "новый инструкшн", "поменяй программу", "добавь поле в аккаунт".
---

# PotBot — Anchor program conventions

Programs: `packages/program/programs/pot_vault` (core) and `pot_duel` (1v1, post-MVP).
Anchor 0.30.1. Read `docs/architecture/program.md` and `governance.md` before non-trivial changes.

## Golden rules
1. **Plan first.** Before writing code, list: files touched, new/changed account fields,
   account-size delta + migration impact, new error codes, and which instructions enforce what.
   Wait for approval, then implement in small commits.
2. **Keep the core minimal and auditable.** New monetization/extra systems (subscriptions, etc.)
   go in separate modules/programs, not bloating `pot_vault`.
3. **Backward compatible.** Prefer additive `Option<T>` fields with sane defaults. Any change to an
   existing account layout needs a migration plan and a callout before mainnet.
4. **Mirror everywhere.** A program change must update `packages/sdk` (PDAs + regenerated IDL) and
   keep `apps/web` mock mode working (`apps/web/src/lib/mock-store.ts`).
5. **Test before done.** Add/extend anchor tests; `anchor build && anchor test` must be green.

## PDAs (keep seeds consistent — see packages/sdk/src/pda.ts)
```
[b"pot", name, authority]              // PotAccount
[b"vault", potPubkey]                  // vault SOL/token authority
[b"member", potPubkey, wallet]         // MemberAccount (shares, depositTotal)
[b"proposal", potPubkey, id_bytes]     // ProposalAccount
```
New PDAs: follow the same `[b"<label>", ...keys]` pattern; document the seed in `program.md`.

## Instructions (current)
Core: `create_pot · deposit · withdraw · create_proposal · vote · execute_proposal ·
execute_swap (Jupiter v6 CPI) · update_tamagotchi · init_token_mint`
Strategy: `create_strategy_vault · join_strategy_vault · exit_strategy_vault · evolve_tamagotchi`

### Adding an instruction
1. Handler in `programs/pot_vault/src/instructions/<name>.rs`; wire into `lib.rs`.
2. Define `#[derive(Accounts)]` with explicit `has_one` / `constraint` / `seeds` + `bump`.
3. Custom errors in the program error enum; never `panic!` — return `Err(error!(...))`.
4. Update IDL + SDK client + types; add a mock-store equivalent for demo mode.
5. Tests for happy path + each failure (unauthorized, frozen, cap breach, bad quorum).

## Security invariants (must hold)
- Only the program (via vault PDA) moves funds; only after a passed proposal.
- Validate signer + ownership on every privileged ix; check `has_one = authority` etc.
- Recompute share math on-chain; never trust client-passed amounts/prices.
- Respect risk config: `maxSwapPct`, quorum %, approval %, and (planned) per-protocol/asset caps.
- CPI (Jupiter/SPL): validate program ids and accounts; guard slippage/min-out.
- (Planned) Sentinel role can freeze/cancel but NEVER withdraw; timelock on risky param changes.
See skill `solana-security-review` for the full checklist.

## Governance (L0–L4)
Share-weighted. Settings: quorumPct, approvalPct, votingWindowHours, riskLevel, maxSwapPct,
maxBudgetGrantPct, requireAdminCoSign. Higher tiers add timelocks / co-sign. Keep the meaning
of each level consistent between program, SDK, and `GovernanceSettings.tsx`.

## Don't
- Don't reorder/remove fields in a live account without migration.
- Don't add external crates without need (audit surface).
- Don't bypass governance for "convenience" admin actions on funds.
