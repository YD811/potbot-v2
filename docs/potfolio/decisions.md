# Technical decisions

Decisions about `pot_index` that are not obvious from the code, with the reason and what they cost. Review findings are numbered as in [security.md](security.md) (F1 to F14). Add a decision here whenever a change trades one property for another.

## Deployment and account layouts

**1. v1.2 goes to a new program address; v1.1 stays live as a backup.** (Oct 12)
Devnet has no real users, so v1.2 is deployed now instead of after a migration period, but to a fresh address: `DfKKe9oiPb8E98qxZ95otU3D5y1L1U3L2Eh3A7HQiUxr` keeps running the build that was judged, with its Pots and funds, and nothing has to be migrated. An in-place upgrade remains possible (see [operations.md](operations.md)), at the cost of every existing Pot.

**2. Before mainnet, account layouts may change without supporting old accounts.**
`Pot.total_exits_usd` was removed outright (decision 13), which makes v1.1 Pots unreadable by v1.2. That is acceptable on devnet only. From mainnet on, fields are only appended, and every layout change ships with a migration instruction, as `migrate_config` does for `Config`.

**3. `Config.pending_admin_expiry_slot` is appended after `bump`, with a one-off `migrate_config`.**
Appending keeps every old field at its offset, so a v1.1 `Config` grows in place and the new field reads 0 (no proposal pending). `migrate_config` checks owner, discriminator, old size and admin, and tops up rent. It exists only for the in-place path and should be deleted once no deployment needs it.

**4. Error codes are renamed in place and new ones appended, never reordered.**
Anchor numbers errors by position (6000 + index), and clients match on the number. `PriceAgeTooLong` became `PriceAgeOutOfRange` and `BadUsdcDecimals` became `BadUsdcMint` at the same codes (6043, 6044); new errors start at 6046.

## Admin and configuration

**5. `init_config` can only be called by the program's upgrade authority (F4).**
The first caller of `init_config` becomes admin and picks the cash mint. The earlier plan, deploy and init in one transaction, cannot work: the runtime makes a program callable only from the slot after its deployment. Checking the upgrade authority in `ProgramData` closes the window at any time.

**6. The USDC mint is fixed at build time, per cluster.**
`USDC_MINT` is mainnet USDC with `--features mainnet` and the devnet test USDC otherwise; `init_config` accepts no other mint. A runtime check (the old `decimals == 6`) only catches honest mistakes, not a look-alike mint. A default build fails `init_config` on mainnet instead of accepting the wrong mint.

**7. Admin transfer is two-step, with a one-hour expiry.**
`set_config(new_admin)` proposes; the new key must sign `accept_admin`, which proves the address can sign before it gets any power (a typo, a PDA or a Squads multisig account instead of its vault cannot become admin). The check is an account constraint, `pending_admin == new_admin`, with no separate "is a transfer pending" test: an empty `pending_admin` is the default key, which nobody can sign for. A proposal expires after `PENDING_ADMIN_TTL_SLOTS` (9,000 slots, about an hour), so a forgotten proposal cannot be accepted months later by whoever holds that key by then. Proposing the default key cancels. With a Squads admin, the multisig has to execute `accept_admin` inside the hour, or propose again.

**8. `set_config` must change something, and every admin action emits an event.**
An update that changes nothing (empty, or the value already set) fails with `NothingToUpdate`, so on an explorer a successful `set_config` always is a configuration change. `ConfigUpdated`, `AdminAccepted`, `AssetRegistered` and `AssetUpdated` make the admin's history readable without diffing account state.

**9. The price window is 1 to 60 s in code, 30 s recommended live (F1).**
Pyth is a pull oracle: anyone can post any signed update that is still inside the window, so the window is how far back a depositor can pick a favourable price. One helper validates the bound for `init_config` and `set_config`. The live value was raised to 60 s because a human signing several transactions was too slow; since the operator refreshes prices right before it submits, signing time no longer counts against the window, and 30 s costs nothing.

## Asset allowlist

**10. `enabled` is a flag, not the account's existence.**
Closing the `AssetConfig` to disable an asset would save one check, but re-enabling would then mean registering again with a feed id supplied afresh, which is the path an admin could abuse (F2). The flag restores the vetted mint and feed as they were, keeps disabled assets visible on-chain, and gives a specific error (`AssetDisabled`).

**11. Legs keep a snapshot of the feed id; `update_asset` changes it for new legs only.**
Reading the feed live from `AssetConfig` would let one admin change reprice every existing Pot at once, extending F2 from new Pots to all of them, and would add an account per leg to every priced instruction. The snapshot keeps the admin's reach to Pots created after a change. If Pyth retires a feed, the Pots using it stop taking deposits and rebalancing (prices go stale and the program refuses them), but in-kind exit needs no price, so holders can always leave. `set_asset_enabled` became `update_asset({ enabled, feed_id })`.

**12. Registering or repointing a feed requires a live price for it.**
`register_asset` and a feed change in `update_asset` read a fresh `PriceUpdateV2` for the feed. A mistyped or unentitled feed would otherwise surface only at the first deposit, after a creator may have finalized a Pot whose legs cannot change. This proves the feed exists, not that it prices this mint: nothing on-chain links a mint to a Pyth feed, so F2 stays a governance item.

**13. Mints with a freeze authority cannot be listed (F8).**
Exits pay every leg, so a single frozen leg vault would block every exit, and exit is the one path that must never fail. v1 therefore lists only assets nobody can freeze, which rules out regulated tokens (tokenized stocks, most fiat stablecoins). Those belong in a separate product whose exit pays the unfrozen legs and keeps a frozen leg's share claimable until it is unfrozen.

**14. Legs are classic SPL tokens only.**
Every leg CPI uses the classic token program, and vaults are checked against it. Token-2022 legs would need per-leg token programs and an allowlist of extensions (transfer hooks, permanent delegates, pausable mints and transfer fees all break the exit or valuation assumptions). Not planned for v1; see v2 recommendation 3.

## Exits and statistics

**15. Exits are never paused and never read the oracle.**
The admin can pause deposits and rebalances, a creator can pause deposits, but nobody can stop an exit: the power to stop exits is the power to trap funds.

**16. The last holder pays no exit fee.**
The 0.50% exit fee stays in the Pot for the holders who remain. When the whole supply is burned, nobody remains: the fee would be stranded in a Pot with no tokens and taken by whoever deposits next (the same holder, or a bot watching for it). `exit_amount` therefore returns the whole balance when `shares == supply`.

**17. `total_exits_usd` was removed.**
Holders choose how much leaves in kind and how much as USDC, and legs paid in kind carry no price on the exit path, so the counter recorded only the USDC part of exits and said little about what left a Pot. Valuing in-kind exits would mean an oracle read on the one path designed to need none. `total_deposits_usd` stays: deposits are always USDC, so it is exact.

**18. The 0.10% conversion fee is an interface fee (F13).**
Any front end can call `exit` and swap the legs itself without it. Revenue projections count only the entry fee and the in-Pot exit fee.

## Valuation

**19. The virtual offset is one phantom token at $1.**
`VIRTUAL_SHARES` and `VIRTUAL_ASSETS` (1 token, $1) stop the first-depositor attack: donating to the vault to round the next deposit down gives the donation away instead (test `a_donation_cannot_steal_from_the_next_depositor`). The cost is that the phantom is always priced at $1: while supply is small and a token is worth more than $1, a deposit can move up to `VIRTUAL_SHARES / (supply + VIRTUAL_SHARES)` of the Pot from existing holders to the depositor. In practice this only matters after a near-total exit leaves a few tokens behind, when the next depositor collects most of the fees those few tokens had accrued. The random-sequence test pins this bound.

**20. Two checks are kept although no transaction can reach them today.**
`RebalanceOpen` in `deposit`, `rebalance_open` and `exit_usdc_open` is reachable only through a CPI from another program, which the instructions-sysvar walk does not see. The `price - conf > 0` check in `snapshot_legs` sits behind the 2% confidence cap in `read_price`. Both stay as defence in depth; the tests document why they cannot be triggered directly.

## Recommended for v2

**1. Accept only Pyth's canonical push-feed account for each feed.** After lowering the live window to 30 s, this is the next oracle step. Pyth's push oracle keeps one account per feed at an address derived from the feed id and only accepts newer updates, so a caller can no longer post an older, more favourable price (F1), and "never use an older price than last time" holds for every Pot without a new field. It needs no layout change: `read_price` checks the account address as well. It has to ship together with an operator change: today the operator posts prices into its own persistent accounts, which the program would then refuse, so the operator switches to updating Pyth's canonical accounts (or relies on Pyth's sponsored updates where they exist). Verify the address derivation against Pyth's SDK before implementing.

**2. Rotations as a Dutch auction, with an instruction allowlist.** A keeper returns only the minimum the program asks for (F6). In a Dutch auction the minimum starts at the full oracle value when a leg crosses the deadband and drops a little every slot, so keepers compete it down to the real cost of the swap instead of taking the whole band. `rebalance_open` also inspects the transaction and refuses instructions from programs outside a short list (compute budget, Pyth, token programs, the swap router), so a keeper cannot move a pool's price inside the same transaction. Executing the swap from the Pot itself (a CPI into Jupiter) was considered: it removes skimming of the output but not route manipulation, needs address lookup tables and deep CPI chains, and costs several times more to build and test.

**3. Token-2022 legs, with an extension allowlist.** Each leg records its token program (a layout change); leg transfers go through `token_interface`; vault checks accept both token programs; `register_asset` refuses mints with transfer hooks, a permanent delegate, a pause authority, frozen-by-default accounts, non-transferability, confidential transfers or transfer fees, and either refuses or values correctly interest-bearing and scaled-amount mints. Roughly 300 to 500 lines of program and 400 of tests (one refusal per extension, a full flow with a Token-2022 leg, a mixed Pot). What it would enable is mostly metadata-only Token-2022 tokens; most regulated tokens use hooks or permanent delegates and would still be refused.

**4. "Last look" before the operator co-signs an exit to USDC.** On devnet the sale between `exit_usdc_open` and `exit_usdc_close` is the operator minting `payUsdc`, a price fixed when the transaction is prepared, so the holder can wait up to the blockhash lifetime and sign only when the quote is stale in their favour (security.md, O2). The operator must co-sign that mint, so it has a veto: at submit, re-price the legs and refuse to sign when the signed `payUsdc` exceeds the fresh value by more than ~0.2%. A few lines in `tx/submit`, and a stopgap: the lasting fix is a sale priced at execution, Jupiter on mainnet and a real AMM pool or a mainnet fork for testing.
