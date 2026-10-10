# Fees and economics

| Event | Fee | Where it goes |
|---|---|---|
| Deposit | 0.30% of the deposit | 0.12% creator, 0.12% referrer, 0.06% protocol treasury, paid in the deposit transaction to USDC token accounts. No referrer: creator receives 0.24%. |
| Exit (in kind) | 0.50% of the redeemed share | stays in the Pot, i.e. accrues to remaining holders |
| Exit to USDC | 0.50% exit + 0.10% conversion on the sold part | conversion fee to the protocol treasury, enforced by `exit_usdc_close`; the cash share carries no conversion fee |
| Holding | 0% | no management or performance fee |
| Rebalance | up to 1% slippage per trade vs Pyth | implicit; keepers compete on price |

Example, $10,000 deposit: $30 fee ($12 creator, $12 referrer, $6 protocol), $9,970 minted. Redeeming $10,000 later: $50 stays in the Pot, $9,950 in assets to the holder.

Referral: the link `/portfolios/<mint>?ref=<wallet>` passes the referrer as an account in `deposit`. Payment is instant, no claim step. Self-referral from the same wallet is rejected (`SelfReferral`).

Creator incentives: no custody, no liability, income scales with deposits into their basket. Community incentives: holders can share their own referral link, so distribution is the community itself.
