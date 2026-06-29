/**
 * Jupiter Price API adapter — implements PriceProvider.
 *
 * Endpoint (v2): https://api.jup.ag/price/v2?ids=<mint,mint,...>
 *   → { data: { [mint]: { id, price: "12.34", ... } }, timeTaken }
 *
 * `fetchImpl` is injectable so unit tests never hit the network.
 */
import type { PriceProvider, PriceQuote, PriceSource } from '../types.js';

type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

export interface JupiterPriceOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
  /** Max mints per request (Jupiter caps batch size). */
  batchSize?: number;
}

export class JupiterPriceProvider implements PriceProvider {
  readonly source: PriceSource = 'jupiter';
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly batchSize: number;

  constructor(opts: JupiterPriceOptions = {}) {
    this.baseUrl = opts.baseUrl ?? 'https://api.jup.ag/price/v2';
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    this.batchSize = opts.batchSize ?? 100;
    if (!this.fetchImpl) throw new Error('No fetch implementation available; pass fetchImpl');
  }

  async getPrices(mints: string[]): Promise<Map<string, PriceQuote>> {
    const out = new Map<string, PriceQuote>();
    const unique = [...new Set(mints.filter(Boolean))];
    for (let i = 0; i < unique.length; i += this.batchSize) {
      const batch = unique.slice(i, i + this.batchSize);
      const url = `${this.baseUrl}?ids=${encodeURIComponent(batch.join(','))}`;
      const res = await this.fetchImpl(url);
      if (!res.ok) throw new Error(`Jupiter price API ${res.status}`);
      const body = await res.json();
      const data = body?.data ?? {};
      for (const mint of batch) {
        const entry = data[mint];
        const price = entry ? Number(entry.price) : NaN;
        if (Number.isFinite(price) && price > 0) {
          out.set(mint, { mint, priceUsd: price, source: this.source });
        }
      }
    }
    return out;
  }
}
