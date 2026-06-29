import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePotComposition } from '../src/validation/potValidation.js';
import type { Asset, PotAssetDraft } from '../src/types.js';

function asset(partial: Partial<Asset> & { id: string; symbol: string }): Asset {
  return {
    chain: 'solana', mint: 'M' + partial.id, name: partial.symbol, category: 'blue_chip',
    decimals: 6, logoUrl: null, coingeckoId: null, enabled: true, verified: true,
    isStable: false, isLst: false, isXstock: false, isRwa: false, riskTier: 2,
    liquidityScore: 50, volatilityScore: 50, maxPotWeightBps: 2500, maxUserDepositUsd: 10000,
    priceSource: 'jupiter', oracleSource: null, pythPriceAccount: null,
    supportsSwap: true, supportsLp: false, supportsLending: false, supportsNav: true,
    metadata: {}, ...partial,
  };
}

function mapOf(...assets: Asset[]) {
  return new Map(assets.map((a) => [a.id, a]));
}

test('valid composition: weights sum to 10000, within caps', () => {
  const a = asset({ id: 'a', symbol: 'SOL', maxPotWeightBps: 10000 });
  const b = asset({ id: 'b', symbol: 'USDC', maxPotWeightBps: 10000 });
  const draft: PotAssetDraft[] = [
    { assetId: 'a', targetWeightBps: 6000 },
    { assetId: 'b', targetWeightBps: 4000 },
  ];
  const r = validatePotComposition({ draft, assetsById: mapOf(a, b) });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.errors.length, 0);
});

test('rejects when weights do not sum to 10000', () => {
  const a = asset({ id: 'a', symbol: 'SOL', maxPotWeightBps: 10000 });
  const r = validatePotComposition({ draft: [{ assetId: 'a', targetWeightBps: 9000 }], assetsById: mapOf(a) });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === 'WEIGHTS_NOT_100'));
});

test('rejects more than max assets', () => {
  const assets: Asset[] = [];
  const draft: PotAssetDraft[] = [];
  for (let i = 0; i < 11; i++) {
    assets.push(asset({ id: `a${i}`, symbol: `T${i}`, maxPotWeightBps: 10000 }));
    draft.push({ assetId: `a${i}`, targetWeightBps: i === 10 ? 0 : 1000 });
  }
  // fix weights to 10000 across 11 → still TOO_MANY_ASSETS regardless
  draft.forEach((d, i) => (d.targetWeightBps = i < 10 ? 1000 : 1));
  const r = validatePotComposition({ draft, assetsById: mapOf(...assets) });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === 'TOO_MANY_ASSETS'));
});

test('rejects disabled asset', () => {
  const a = asset({ id: 'a', symbol: 'SOL', maxPotWeightBps: 10000 });
  const dis = asset({ id: 'b', symbol: 'X', enabled: false, maxPotWeightBps: 10000 });
  const draft: PotAssetDraft[] = [
    { assetId: 'a', targetWeightBps: 5000 },
    { assetId: 'b', targetWeightBps: 5000 },
  ];
  const r = validatePotComposition({ draft, assetsById: mapOf(a, dis) });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === 'ASSET_NOT_ADDABLE'));
});

test('rejects pending_verification asset (verified=false)', () => {
  const a = asset({ id: 'a', symbol: 'SOL', maxPotWeightBps: 10000 });
  const pend = asset({ id: 'b', symbol: 'PND', verified: false, maxPotWeightBps: 10000 });
  const draft: PotAssetDraft[] = [
    { assetId: 'a', targetWeightBps: 5000 },
    { assetId: 'b', targetWeightBps: 5000 },
  ];
  const r = validatePotComposition({ draft, assetsById: mapOf(a, pend) });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === 'ASSET_NOT_ADDABLE'));
});

test('rejects weight exceeding per-asset cap', () => {
  const a = asset({ id: 'a', symbol: 'SOL', maxPotWeightBps: 3000 });
  const b = asset({ id: 'b', symbol: 'USDC', maxPotWeightBps: 10000 });
  const draft: PotAssetDraft[] = [
    { assetId: 'a', targetWeightBps: 5000 }, // > 3000 cap
    { assetId: 'b', targetWeightBps: 5000 },
  ];
  const r = validatePotComposition({ draft, assetsById: mapOf(a, b) });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === 'WEIGHT_EXCEEDS_CAP'));
});

test('risky asset requires acknowledgeRisk', () => {
  const a = asset({ id: 'a', symbol: 'SOL', maxPotWeightBps: 10000, riskTier: 2 });
  const meme = asset({ id: 'b', symbol: 'MEME', maxPotWeightBps: 10000, riskTier: 5 });
  const base: PotAssetDraft[] = [
    { assetId: 'a', targetWeightBps: 5000 },
    { assetId: 'b', targetWeightBps: 5000 },
  ];
  const r1 = validatePotComposition({ draft: base, assetsById: mapOf(a, meme) });
  assert.equal(r1.ok, false);
  assert.ok(r1.errors.some((e) => e.code === 'RISK_NOT_ACKNOWLEDGED'));

  const acked: PotAssetDraft[] = [
    { assetId: 'a', targetWeightBps: 5000 },
    { assetId: 'b', targetWeightBps: 5000, acknowledgeRisk: true },
  ];
  const r2 = validatePotComposition({ draft: acked, assetsById: mapOf(a, meme) });
  assert.equal(r2.ok, true, JSON.stringify(r2.errors));
  assert.ok(r2.warnings.some((w) => w.code === 'RISKY_ASSET'));
});

test('rejects LP strategy on non-LP asset', () => {
  const a = asset({ id: 'a', symbol: 'SOL', maxPotWeightBps: 10000, supportsLp: false });
  const draft: PotAssetDraft[] = [{ assetId: 'a', targetWeightBps: 10000, primaryStrategy: 'lp' }];
  const r = validatePotComposition({ draft, assetsById: mapOf(a) });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === 'LP_UNSUPPORTED'));
});
