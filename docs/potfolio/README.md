# POTfolio (PotBot v3) documentation

POTfolio is a basket of Solana assets issued as one liquid SPL token. Built during Colosseum Crypto World's Fair (Sept 14 to Oct 12, 2026). Live on devnet.

| Doc | Read it when |
|---|---|
| [overview.md](overview.md) | You want the product in plain words: what it is, who it is for, what it promises. |
| [program.md](program.md) | You want the on-chain mechanics: accounts, instructions, limits, errors. |
| [fees-and-economics.md](fees-and-economics.md) | You want to know who earns what and when. |
| [keepers.md](keepers.md) | You want to run a keeper or understand how rebalancing is bounded. |
| [garden-mode.md](garden-mode.md) | You want the plant levels and how they are computed. |
| [security.md](security.md) | You want the review findings, what was fixed, what is accepted, and the mainnet list. |
| [operations.md](operations.md) | You run the devnet deployment: scripts, env vars, upgrade procedure. |
| [faq.md](faq.md) | You have a question a holder or creator would ask. |

Program id (devnet): `DfKKe9oiPb8E98qxZ95otU3D5y1L1U3L2Eh3A7HQiUxr`. Source: [`packages/pot-index`](../../packages/pot-index). Web: [`apps/web/src/app/portfolios`](../../apps/web/src/app/portfolios), [`apps/web/src/lib/pot-index`](../../apps/web/src/lib/pot-index).

Vaults (PotBot v2, group treasuries with votes) are documented under [`../architecture`](../architecture). POTfolio and Vault share the protocol and the brand; they are different products.
