/**
 * PotBot Asset Registry — seed list (~100 assets, grouped by category).
 *
 * ╭───────────────────────────── SAFETY CONTRACT ─────────────────────────────╮
 * │ 1. NO entry here is production-trusted. `hydrateSeed` forces               │
 * │    verified=false and enabled=false for every row.                        │
 * │ 2. A `mint` is provided ONLY for assets whose mint AND decimals we are     │
 * │    highly confident about (majors). Everything else has mint=undefined →   │
 * │    stored as NULL and marked pending_verification.                         │
 * │ 3. `scripts/resolve-mints.ts` verifies every candidate mint against the    │
 * │    Jupiter token list and fills decimals/symbol. Only AFTER that, and a    │
 * │    human review, should `enabled` be flipped on in the DB.                 │
 * │ 4. Decimals on unverified rows are a best-effort placeholder and MUST be   │
 * │    overwritten by the resolver before use.                                 │
 * ╰────────────────────────────────────────────────────────────────────────────╯
 */
import type { AssetSeed } from '../types.js';

const PENDING = undefined; // explicit: mint unknown -> pending_verification

export const ASSET_SEED: AssetSeed[] = [
  // ── SOL / LST ──────────────────────────────────────────────────────────────
  { symbol: 'SOL',     name: 'Solana (Wrapped)',       category: 'sol_lst', decimals: 9, riskTier: 2, maxPotWeightBps: 10000, mint: 'So11111111111111111111111111111111111111112', supportsLp: true },
  { symbol: 'JitoSOL', name: 'Jito Staked SOL',        category: 'sol_lst', decimals: 9, riskTier: 2, isLst: true, mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', supportsLp: true },
  { symbol: 'mSOL',    name: 'Marinade Staked SOL',    category: 'sol_lst', decimals: 9, riskTier: 2, isLst: true, mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', supportsLp: true },
  { symbol: 'bSOL',    name: 'BlazeStake Staked SOL',  category: 'sol_lst', decimals: 9, riskTier: 2, isLst: true, mint: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HJseex87' },
  { symbol: 'INF',     name: 'Sanctum Infinity',       category: 'sol_lst', decimals: 9, riskTier: 2, isLst: true, mint: '5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm' },
  { symbol: 'hSOL',    name: 'Helius Staked SOL',      category: 'sol_lst', decimals: 9, riskTier: 3, isLst: true, mint: PENDING },
  { symbol: 'jupSOL',  name: 'Jupiter Staked SOL',     category: 'sol_lst', decimals: 9, riskTier: 2, isLst: true, mint: PENDING },
  { symbol: 'bonkSOL', name: 'BonkSOL',                category: 'sol_lst', decimals: 9, riskTier: 3, isLst: true, mint: PENDING },
  { symbol: 'cgntSOL', name: 'Cogent SOL',             category: 'sol_lst', decimals: 9, riskTier: 3, isLst: true, mint: PENDING },
  { symbol: 'dSOL',    name: 'Drift Staked SOL',       category: 'sol_lst', decimals: 9, riskTier: 3, isLst: true, mint: PENDING },

  // ── Stablecoins ─────────────────────────────────────────────────────────────
  { symbol: 'USDC',  name: 'USD Coin',          category: 'stablecoin', decimals: 6, riskTier: 1, isStable: true, mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', supportsLp: true, supportsLending: true },
  { symbol: 'USDT',  name: 'Tether USD',        category: 'stablecoin', decimals: 6, riskTier: 1, isStable: true, mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', supportsLp: true },
  { symbol: 'PYUSD', name: 'PayPal USD',        category: 'stablecoin', decimals: 6, riskTier: 2, isStable: true, mint: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo' },
  { symbol: 'USDS',  name: 'Sky USDS',          category: 'stablecoin', decimals: 6, riskTier: 2, isStable: true, mint: PENDING },
  { symbol: 'USDe',  name: 'Ethena USDe',       category: 'stablecoin', decimals: 6, riskTier: 3, isStable: true, mint: PENDING },
  { symbol: 'EURC',  name: 'Euro Coin',         category: 'stablecoin', decimals: 6, riskTier: 2, isStable: true, mint: PENDING },
  { symbol: 'USDY',  name: 'Ondo US Dollar Yield', category: 'stablecoin', decimals: 6, riskTier: 3, isStable: true, isRwa: true, mint: PENDING },
  { symbol: 'USDG',  name: 'Global Dollar',     category: 'stablecoin', decimals: 6, riskTier: 2, isStable: true, mint: PENDING },
  { symbol: 'FDUSD', name: 'First Digital USD', category: 'stablecoin', decimals: 6, riskTier: 3, isStable: true, mint: PENDING },
  { symbol: 'AUSD',  name: 'Agora USD',         category: 'stablecoin', decimals: 6, riskTier: 3, isStable: true, mint: PENDING },

  // ── xStocks (tokenized equities) — ALL pending: mints must be verified ───────
  { symbol: 'AAPLx',  name: 'Apple xStock',          category: 'xstock', decimals: 8, riskTier: 4, isXstock: true, mint: PENDING },
  { symbol: 'TSLAx',  name: 'Tesla xStock',          category: 'xstock', decimals: 8, riskTier: 4, isXstock: true, mint: PENDING },
  { symbol: 'NVDAx',  name: 'NVIDIA xStock',         category: 'xstock', decimals: 8, riskTier: 4, isXstock: true, mint: PENDING },
  { symbol: 'MSFTx',  name: 'Microsoft xStock',      category: 'xstock', decimals: 8, riskTier: 4, isXstock: true, mint: PENDING },
  { symbol: 'AMZNx',  name: 'Amazon xStock',         category: 'xstock', decimals: 8, riskTier: 4, isXstock: true, mint: PENDING },
  { symbol: 'GOOGLx', name: 'Alphabet xStock',       category: 'xstock', decimals: 8, riskTier: 4, isXstock: true, mint: PENDING },
  { symbol: 'METAx',  name: 'Meta xStock',           category: 'xstock', decimals: 8, riskTier: 4, isXstock: true, mint: PENDING },
  { symbol: 'SPYx',   name: 'S&P 500 xStock',        category: 'xstock', decimals: 8, riskTier: 3, isXstock: true, mint: PENDING },
  { symbol: 'COINx',  name: 'Coinbase xStock',       category: 'xstock', decimals: 8, riskTier: 4, isXstock: true, mint: PENDING },
  { symbol: 'MSTRx',  name: 'MicroStrategy xStock',  category: 'xstock', decimals: 8, riskTier: 5, isXstock: true, mint: PENDING },

  // ── Blue chips ───────────────────────────────────────────────────────────────
  { symbol: 'WBTC', name: 'Wrapped BTC (Wormhole)', category: 'blue_chip', decimals: 8, riskTier: 2, mint: PENDING, supportsLp: true },
  { symbol: 'WETH', name: 'Wrapped ETH (Wormhole)', category: 'blue_chip', decimals: 8, riskTier: 2, mint: PENDING, supportsLp: true },
  { symbol: 'cbBTC', name: 'Coinbase Wrapped BTC',  category: 'blue_chip', decimals: 8, riskTier: 2, mint: PENDING },
  { symbol: 'JUP',  name: 'Jupiter',                category: 'blue_chip', decimals: 6, riskTier: 3, mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', supportsLp: true },
  { symbol: 'JTO',  name: 'Jito',                   category: 'blue_chip', decimals: 9, riskTier: 3, mint: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL' },
  { symbol: 'PYTH', name: 'Pyth Network',           category: 'blue_chip', decimals: 6, riskTier: 3, mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3' },
  { symbol: 'W',    name: 'Wormhole',               category: 'blue_chip', decimals: 6, riskTier: 3, mint: '85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ' },
  { symbol: 'RAY',  name: 'Raydium',                category: 'blue_chip', decimals: 6, riskTier: 3, mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', supportsLp: true },
  { symbol: 'ORCA', name: 'Orca',                   category: 'blue_chip', decimals: 6, riskTier: 3, mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE' },
  { symbol: 'TNSR', name: 'Tensor',                 category: 'blue_chip', decimals: 9, riskTier: 4, mint: 'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6' },

  // ── DeFi ─────────────────────────────────────────────────────────────────────
  { symbol: 'KMNO',  name: 'Kamino',          category: 'defi', decimals: 6, riskTier: 4, mint: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS' },
  { symbol: 'DRIFT', name: 'Drift Protocol',  category: 'defi', decimals: 6, riskTier: 4, mint: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7' },
  { symbol: 'MNDE',  name: 'Marinade',        category: 'defi', decimals: 9, riskTier: 4, mint: 'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey' },
  { symbol: 'MeteoraMET', name: 'Meteora',    category: 'defi', decimals: 6, riskTier: 4, mint: PENDING },
  { symbol: 'CLOUD', name: 'Cloud (Sanctum)', category: 'defi', decimals: 9, riskTier: 4, mint: PENDING },
  { symbol: 'PRCL',  name: 'Parcl',           category: 'defi', decimals: 6, riskTier: 4, isRwa: true, mint: PENDING },
  { symbol: 'LFNTY', name: 'Lifinity',        category: 'defi', decimals: 6, riskTier: 4, mint: PENDING },
  { symbol: 'SLND',  name: 'Solend / Save',   category: 'defi', decimals: 6, riskTier: 4, mint: PENDING },
  { symbol: 'MRLN',  name: 'Marlin',          category: 'defi', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'FXS',   name: 'Frax Share (Sol)', category: 'defi', decimals: 6, riskTier: 4, mint: PENDING },
  { symbol: 'PHANTOM', name: 'Phantom (placeholder)', category: 'defi', decimals: 6, riskTier: 5, mint: PENDING, notes: 'placeholder — verify existence before enabling' },
  { symbol: 'ZEUS',  name: 'Zeus Network',    category: 'defi', decimals: 6, riskTier: 5, mint: PENDING },

  // ── AI ───────────────────────────────────────────────────────────────────────
  { symbol: 'RENDER', name: 'Render',         category: 'ai', decimals: 8, riskTier: 4, mint: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof' },
  { symbol: 'AI16Z',  name: 'ai16z',          category: 'ai', decimals: 9, riskTier: 5, mint: PENDING },
  { symbol: 'GRIFFAIN', name: 'Griffain',     category: 'ai', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'ARC',    name: 'AI Rig Complex', category: 'ai', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'FARTCOIN', name: 'Fartcoin',     category: 'ai', decimals: 6, riskTier: 5, mint: PENDING, notes: 'meme/ai overlap — high risk' },
  { symbol: 'ZEREBRO', name: 'Zerebro',       category: 'ai', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'GOAT',   name: 'Goatseus Maximus', category: 'ai', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'TANK',   name: 'AgentTank',      category: 'ai', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'NEUR',   name: 'Neur',           category: 'ai', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'SWARMS', name: 'Swarms',         category: 'ai', decimals: 6, riskTier: 5, mint: PENDING },

  // ── Infrastructure ─────────────────────────────────────────────────────────
  { symbol: 'HNT',  name: 'Helium',           category: 'infrastructure', decimals: 8, riskTier: 3, mint: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux' },
  { symbol: 'MOBILE', name: 'Helium Mobile',  category: 'infrastructure', decimals: 6, riskTier: 4, mint: PENDING },
  { symbol: 'IOT',  name: 'Helium IOT',       category: 'infrastructure', decimals: 6, riskTier: 4, mint: PENDING },
  { symbol: 'RENDER2', name: 'Render (legacy RNDR)', category: 'infrastructure', decimals: 8, riskTier: 4, mint: PENDING, notes: 'legacy RNDR mint — verify vs migrated RENDER' },
  { symbol: 'SHDW', name: 'GenesysGo Shadow', category: 'infrastructure', decimals: 9, riskTier: 4, mint: PENDING },
  { symbol: 'NOS',  name: 'Nosana',           category: 'infrastructure', decimals: 6, riskTier: 4, mint: PENDING },
  { symbol: 'GRASS', name: 'Grass',           category: 'infrastructure', decimals: 9, riskTier: 4, mint: PENDING },
  { symbol: 'PIPE', name: 'Pipe Network',     category: 'infrastructure', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'IO',   name: 'io.net',           category: 'infrastructure', decimals: 8, riskTier: 4, mint: PENDING },
  { symbol: 'DBR',  name: 'deBridge',         category: 'infrastructure', decimals: 6, riskTier: 4, mint: PENDING },

  // ── Memes ─────────────────────────────────────────────────────────────────────
  { symbol: 'BONK',   name: 'Bonk',           category: 'meme', decimals: 5, riskTier: 5, mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', supportsLp: true },
  { symbol: 'WIF',    name: 'dogwifhat',      category: 'meme', decimals: 6, riskTier: 5, mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { symbol: 'POPCAT', name: 'Popcat',         category: 'meme', decimals: 9, riskTier: 5, mint: PENDING },
  { symbol: 'MEW',    name: 'cat in a dogs world', category: 'meme', decimals: 5, riskTier: 5, mint: PENDING },
  { symbol: 'PENGU',  name: 'Pudgy Penguins', category: 'meme', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'BOME',   name: 'BOOK OF MEME',   category: 'meme', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'TRUMP',  name: 'OFFICIAL TRUMP', category: 'meme', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'MELANIA', name: 'Melania Meme',  category: 'meme', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'PNUT',   name: 'Peanut the Squirrel', category: 'meme', decimals: 6, riskTier: 5, mint: PENDING },
  { symbol: 'MOODENG', name: 'Moo Deng',      category: 'meme', decimals: 6, riskTier: 5, mint: PENDING },

  // ── RWA ─────────────────────────────────────────────────────────────────────
  { symbol: 'ONDO',  name: 'Ondo (bridged)',  category: 'rwa', decimals: 6, riskTier: 4, isRwa: true, mint: PENDING },
  { symbol: 'OUSG',  name: 'Ondo Short-Term US Gov', category: 'rwa', decimals: 6, riskTier: 3, isRwa: true, mint: PENDING },
  { symbol: 'BUIDL', name: 'BlackRock BUIDL (Sol)',  category: 'rwa', decimals: 6, riskTier: 3, isRwa: true, mint: PENDING },
  { symbol: 'CETES', name: 'Mexican CETES (Etherfuse)', category: 'rwa', decimals: 6, riskTier: 3, isRwa: true, mint: PENDING },
  { symbol: 'TBILL', name: 'OpenEden T-Bill', category: 'rwa', decimals: 6, riskTier: 3, isRwa: true, mint: PENDING },
  { symbol: 'GOLD',  name: 'Tokenized Gold (placeholder)', category: 'rwa', decimals: 8, riskTier: 4, isRwa: true, mint: PENDING },
  { symbol: 'PARCLR', name: 'Parcl Real Estate (placeholder)', category: 'rwa', decimals: 6, riskTier: 4, isRwa: true, mint: PENDING },
  { symbol: 'HOMES', name: 'Homebase RWA (placeholder)', category: 'rwa', decimals: 6, riskTier: 5, isRwa: true, mint: PENDING },

  // ── Yield assets ────────────────────────────────────────────────────────────
  { symbol: 'JLP',     name: 'Jupiter Perps LP',  category: 'yield', decimals: 6, riskTier: 3, mint: '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4' },
  { symbol: 'kSOL',    name: 'Kamino SOL Vault',  category: 'yield', decimals: 9, riskTier: 4, mint: PENDING },
  { symbol: 'kUSDC',   name: 'Kamino USDC Vault', category: 'yield', decimals: 6, riskTier: 3, mint: PENDING },
  { symbol: 'sUSDe',   name: 'Ethena Staked USDe', category: 'yield', decimals: 6, riskTier: 4, mint: PENDING },
  { symbol: 'meSOL',   name: 'Meteora SOL LST',   category: 'yield', decimals: 9, riskTier: 4, mint: PENDING },
  { symbol: 'lstSOL',  name: 'Generic LST yield', category: 'yield', decimals: 9, riskTier: 4, mint: PENDING },
  { symbol: 'vSOL',    name: 'The Vault SOL',     category: 'yield', decimals: 9, riskTier: 4, mint: PENDING },
  { symbol: 'picoSOL', name: 'picoSOL',          category: 'yield', decimals: 9, riskTier: 4, mint: PENDING },
  { symbol: 'compoundUSDC', name: 'Compounding USDC (placeholder)', category: 'yield', decimals: 6, riskTier: 4, mint: PENDING },
  { symbol: 'driftUSDC', name: 'Drift USDC Earn', category: 'yield', decimals: 6, riskTier: 4, mint: PENDING },
];

/** Count by category — handy for sanity tests. */
export function seedCountByCategory(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of ASSET_SEED) out[s.category] = (out[s.category] ?? 0) + 1;
  return out;
}
