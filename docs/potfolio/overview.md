# Overview

## One sentence
A POTfolio is any basket of Solana assets, held as one token: deposit USDC to get it, hold it anywhere a token works, redeem it any time for your share of every asset inside.

## Who it is for
- **Holders**: communities, creators' audiences, degens who want exposure to a theme without managing five tokens.
- **Creators**: people with a thesis and a following. They publish a basket, their audience holds the token, they earn on every deposit.
- **Agents and developers**: every Pot is readable and actionable through the PotBot MCP server.

## What it promises
1. **No rug.** The token is backed one to one by the assets in the Pot. Assets sit in program-owned accounts (PDAs) with no private key. The program has no withdraw instruction. Not the creator, not PotBot, not an admin can move them out.
2. **Exit always works.** Redeeming needs no oracle, no keeper, no permission, and cannot be paused. Everyone leaves at the same pro-rata value; nobody is sold on.
3. **Honest growth.** Garden mode shows a plant whose level is a pure function of value in the Pot. It cannot be faked.
4. **Creators earn without custody.** Fees are split on-chain in the deposit transaction. Creators never hold anyone's money.

## What it is not
- Not a managed fund. Weights are fixed at creation. Managed and Community POTfolios (creator adjusts inside a public mandate with a timelock; holders vote) are planned after the Fair.
- Not a DEX. The token is minted and burned at net asset value (NAV). A secondary pool is planned so it also trades.
- Not audited yet. Tested (LiteSVM suite) and reviewed against the Solana Foundation checklist; third-party audit is on the mainnet path.

## Lifecycle
1. Creator picks 2 to 5 registered assets and weights that sum to 100%, names the basket, publishes. The program creates the Pot PDA, one vault per asset plus a USDC cash vault, the index mint (6 decimals, address starts with `Pot`), and Metaplex metadata.
2. Holder deposits USDC. Pyth prices are posted in the same transaction. Tokens minted = deposit / NAV per token. 0.30% entry fee split instantly.
3. Keepers buy the basket: USDC in the cash vault is swapped into the target assets within program limits. Deposits land as cash first; allocation follows within minutes.
4. Holder redeems: tokens burned, pro-rata share of USDC cash and every asset transferred in kind. 0.50% stays in the Pot. Exit to USDC in one step is in development.

## Glossary
- **Pot**: the on-chain basket (PDA + vaults + mint). "POTfolio" is the product name for a Pot and its token.
- **NAV**: net asset value, USDC cash + sum of (vault balance x Pyth price).
- **Leg**: one asset in the basket with its target weight.
- **Keeper**: any bot that submits a bounded rebalance.
- **Index token**: the SPL token that represents a share of the Pot.
