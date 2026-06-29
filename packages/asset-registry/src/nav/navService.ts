/**
 * NAV calculation service.
 *
 * NAV(USD) = Σ over holdings of value(holding).
 *   - direct token holding:  (amountRaw / 10^decimals) * priceUsd
 *   - LP holding:            adapter.getPositionValueUsd(position)
 *
 * Pricing uses an ordered fallback chain of PriceProviders. If NO provider can
 * price an asset, the holding is marked `unpriced` and contributes 0 to NAV —
 * and `complete` becomes false so callers never mistake a partial NAV for a
 * full one. We NEVER fabricate a price.
 */
import type {
  Holding,
  NavResult,
  PricedHolding,
  PriceProvider,
  PriceQuote,
  LpAdapter,
  PriceSource,
} from '../types.js';
import { LpNotImplementedError } from './lpInterface.js';

export interface NavServiceOptions {
  /** Ordered price providers; first hit wins. */
  providers: PriceProvider[];
  /** Optional LP adapters keyed by dex. */
  lpAdapters?: Map<string, LpAdapter>;
}

export function rawToHuman(amountRaw: bigint, decimals: number): number {
  if (decimals < 0) throw new Error('decimals must be >= 0');
  // Use string math to avoid bigint->number precision loss for large amounts.
  const negative = amountRaw < 0n;
  const abs = negative ? -amountRaw : amountRaw;
  const s = abs.toString().padStart(decimals + 1, '0');
  const intPart = s.slice(0, s.length - decimals) || '0';
  const fracPart = decimals > 0 ? s.slice(s.length - decimals) : '';
  const num = Number(`${intPart}${fracPart ? '.' + fracPart : ''}`);
  return negative ? -num : num;
}

export class NavService {
  private readonly providers: PriceProvider[];
  private readonly lpAdapters: Map<string, LpAdapter>;

  constructor(opts: NavServiceOptions) {
    if (!opts.providers || opts.providers.length === 0) {
      throw new Error('NavService requires at least one PriceProvider');
    }
    this.providers = opts.providers;
    this.lpAdapters = opts.lpAdapters ?? new Map();
  }

  /** Resolve a price for a single mint via the fallback chain. */
  async resolvePrice(mint: string): Promise<PriceQuote | null> {
    for (const provider of this.providers) {
      try {
        const map = await provider.getPrices([mint]);
        const q = map.get(mint);
        if (q && Number.isFinite(q.priceUsd) && q.priceUsd > 0) return q;
      } catch {
        // provider failed -> try next in the chain
      }
    }
    return null;
  }

  /** Batch-resolve prices, returning a mint->quote map (best provider per mint). */
  async resolvePrices(mints: string[]): Promise<Map<string, PriceQuote>> {
    const out = new Map<string, PriceQuote>();
    const remaining = new Set(mints);
    for (const provider of this.providers) {
      if (remaining.size === 0) break;
      let map: Map<string, PriceQuote>;
      try {
        map = await provider.getPrices([...remaining]);
      } catch {
        continue;
      }
      for (const mint of [...remaining]) {
        const q = map.get(mint);
        if (q && Number.isFinite(q.priceUsd) && q.priceUsd > 0) {
          out.set(mint, q);
          remaining.delete(mint);
        }
      }
    }
    return out;
  }

  async computeNav(holdings: Holding[]): Promise<NavResult> {
    // Collect mints needing a direct price (non-LP holdings with a mint).
    const directMints = holdings
      .filter((h) => !h.lpPosition && h.asset.mint)
      .map((h) => h.asset.mint!) as string[];

    const priceMap = await this.resolvePrices([...new Set(directMints)]);

    const priced: PricedHolding[] = [];
    const unpriced: string[] = [];
    let navUsd = 0;

    for (const h of holdings) {
      if (h.lpPosition) {
        const result = await this.priceLp(h);
        priced.push(result);
        if (!result.priced) unpriced.push(h.asset.id || h.asset.symbol);
        else navUsd += result.valueUsd;
        continue;
      }

      const amount = rawToHuman(h.amountRaw, h.asset.decimals);
      const quote = h.asset.mint ? priceMap.get(h.asset.mint) : undefined;

      if (!quote) {
        priced.push({ asset: h.asset, amount, priceUsd: null, valueUsd: 0, priced: false, source: null });
        unpriced.push(h.asset.id || h.asset.symbol);
        continue;
      }

      const valueUsd = amount * quote.priceUsd;
      navUsd += valueUsd;
      priced.push({ asset: h.asset, amount, priceUsd: quote.priceUsd, valueUsd, priced: true, source: quote.source });
    }

    return { navUsd, holdings: priced, unpriced, complete: unpriced.length === 0 };
  }

  private async priceLp(h: Holding): Promise<PricedHolding> {
    const pos = h.lpPosition!;
    const adapter = this.lpAdapters.get(pos.pair.dex);
    const human = rawToHuman(h.amountRaw, h.asset.decimals);
    if (!adapter) {
      return { asset: h.asset, amount: human, priceUsd: null, valueUsd: 0, priced: false, source: null };
    }
    try {
      const valueUsd = await adapter.getPositionValueUsd(pos);
      return { asset: h.asset, amount: human, priceUsd: null, valueUsd, priced: true, source: 'manual' as PriceSource };
    } catch (e) {
      if (e instanceof LpNotImplementedError) {
        return { asset: h.asset, amount: human, priceUsd: null, valueUsd: 0, priced: false, source: null };
      }
      throw e;
    }
  }
}
