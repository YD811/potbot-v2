import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NavService, rawToHuman } from '../src/nav/navService.js';
import type { Asset, Holding, PriceProvider, PriceQuote } from '../src/types.js';

function asset(partial: Partial<Asset> & { id: string; symbol: string; mint: string | null; decimals: number }): Asset {
  return {
    chain: 'solana', name: partial.symbol, category: 'blue_chip', logoUrl: null, coingeckoId: null,
    enabled: true, verified: true, isStable: false, isLst: false, isXstock: false, isRwa: false,
    riskTier: 2, liquidityScore: 50, volatilityScore: 50, maxPotWeightBps: 2500, maxUserDepositUsd: 10000,
    priceSource: 'jupiter', oracleSource: null, pythPriceAccount: null, supportsSwap: true,
    supportsLp: false, supportsLending: false, supportsNav: true, metadata: {}, ...partial,
  };
}

class StubProvider implements PriceProvider {
  readonly source = 'jupiter' as const;
  constructor(private prices: Record<string, number>, public calls = 0) {}
  async getPrices(mints: string[]): Promise<Map<string, PriceQuote>> {
    this.calls++;
    const out = new Map<string, PriceQuote>();
    for (const m of mints) {
      const p = this.prices[m];
      if (p != null) out.set(m, { mint: m, priceUsd: p, source: this.source });
    }
    return out;
  }
}

class FailingProvider implements PriceProvider {
  readonly source = 'pyth' as const;
  async getPrices(): Promise<Map<string, PriceQuote>> {
    throw new Error('provider down');
  }
}

test('rawToHuman handles decimals precisely', () => {
  assert.equal(rawToHuman(1_000_000_000n, 9), 1);          // 1 SOL
  assert.equal(rawToHuman(1_500_000n, 6), 1.5);            // 1.5 USDC
  assert.equal(rawToHuman(0n, 6), 0);
  assert.equal(rawToHuman(123n, 0), 123);
});

test('NAV sums direct holdings', async () => {
  const SOL = asset({ id: 'sol', symbol: 'SOL', mint: 'mSOL', decimals: 9 });
  const USDC = asset({ id: 'usdc', symbol: 'USDC', mint: 'mUSDC', decimals: 6 });
  const svc = new NavService({ providers: [new StubProvider({ mSOL: 150, mUSDC: 1 })] });
  const holdings: Holding[] = [
    { asset: SOL, amountRaw: 2_000_000_000n },  // 2 SOL * 150 = 300
    { asset: USDC, amountRaw: 50_000_000n },    // 50 USDC * 1 = 50
  ];
  const r = await svc.computeNav(holdings);
  assert.equal(r.navUsd, 350);
  assert.equal(r.complete, true);
  assert.equal(r.unpriced.length, 0);
});

test('missing price → holding unpriced, NAV is lower bound, complete=false', async () => {
  const SOL = asset({ id: 'sol', symbol: 'SOL', mint: 'mSOL', decimals: 9 });
  const UNK = asset({ id: 'unk', symbol: 'UNK', mint: 'mUNK', decimals: 6 });
  const svc = new NavService({ providers: [new StubProvider({ mSOL: 100 })] }); // no UNK price
  const r = await svc.computeNav([
    { asset: SOL, amountRaw: 1_000_000_000n },  // 100
    { asset: UNK, amountRaw: 5_000_000n },       // unpriced
  ]);
  assert.equal(r.navUsd, 100);
  assert.equal(r.complete, false);
  assert.deepEqual(r.unpriced, ['unk']);
  const unk = r.holdings.find((h) => h.asset.id === 'unk')!;
  assert.equal(unk.priced, false);
  assert.equal(unk.valueUsd, 0);
});

test('price fallback: first provider fails, second answers', async () => {
  const SOL = asset({ id: 'sol', symbol: 'SOL', mint: 'mSOL', decimals: 9 });
  const svc = new NavService({ providers: [new FailingProvider(), new StubProvider({ mSOL: 42 })] });
  const r = await svc.computeNav([{ asset: SOL, amountRaw: 1_000_000_000n }]);
  assert.equal(r.navUsd, 42);
  assert.equal(r.complete, true);
});

test('never fabricates a price when all providers fail', async () => {
  const SOL = asset({ id: 'sol', symbol: 'SOL', mint: 'mSOL', decimals: 9 });
  const svc = new NavService({ providers: [new FailingProvider()] });
  const r = await svc.computeNav([{ asset: SOL, amountRaw: 1_000_000_000n }]);
  assert.equal(r.navUsd, 0);
  assert.equal(r.complete, false);
  assert.deepEqual(r.unpriced, ['sol']);
});
