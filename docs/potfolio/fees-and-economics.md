# Fees and economics

| Event | Fee | Where it goes |
|---|---|---|
| Deposit | 0.30% of the deposit | 0.12% creator, 0.12% referrer, 0.06% protocol treasury, paid in the deposit transaction to USDC token accounts. No referrer: creator receives 0.24%. |
| Exit (in kind) | 0.50% of the redeemed share | stays in the Pot, i.e. accrues to remaining holders; waived for the last holder, since nobody remains |
| Exit to USDC | 0.50% exit + 0.10% conversion on the sold part | conversion fee to the protocol treasury, enforced by `exit_usdc_close`; the cash share carries no conversion fee. This is an **interface fee**, not a protocol fee: any front end can call `exit` and swap the assets itself without it (review F13). Revenue projections count entry and in-Pot exit only. |
| Holding | 0% | no management or performance fee |
| Rebalance | up to the Pot's slippage band per trade vs Pyth (default 0.5%) | implicit; the band is a floor a third-party keeper can take in full, see keepers.md |

Example, $10,000 deposit: $30 fee ($12 creator, $12 referrer, $6 protocol), $9,970 minted. Redeeming $10,000 later: $50 stays in the Pot, $9,950 in assets to the holder.

Referral: the link `/portfolios/<mint>?ref=<wallet>` passes the referrer as an account in `deposit`. Payment is instant, no claim step. Self-referral from the same wallet is rejected (`SelfReferral`).

Creator incentives: no custody, no liability, income scales with deposits into their basket. Community incentives: holders can share their own referral link, so distribution is the community itself.
