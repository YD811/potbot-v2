# Garden mode

Every POTfolio is a plant. Its level is a function of the USD value held in the Pot (supply x NAV per token), read from chain, so it cannot be faked. Deposits water it, exits dry it out.

| Level | Name | From |
|---|---|---|
| 1 | Seedling | first deposit |
| 2 | Sprout | $1,000 |
| 3 | Bud | $10,000 |
| 4 | Bloom | $50,000 |
| 5 | Full Bloom | $250,000 |
| 6 | Mature Tree | $1,000,000 |

Thresholds and stage names: `apps/web/src/lib/pot-index/garden.ts` (`STAGES`, `stageForUsd`). Plant variety follows the Pot's dominant category: crypto majors pink, Solana natives purple, stocks/RWA blue, memes coral (`potSeries`). Sprites: `apps/web/public/garden/<series>-<level>.png`.

Where it shows: the landing section (demo loop), the plant badge on every POTfolio card and page (real level), the level line on the POTfolio page ("next level at $10k").
