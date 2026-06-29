/**
 * Jupiter Tokens API adapter — token-list lookups for mint verification.
 *
 * Used by scripts/resolve-mints.ts to VERIFY candidate mints and fill
 * decimals/symbol from an authoritative source. We never trust a seed mint
 * until it round-trips through here.
 *
 * Endpoints:
 *   - single:  https://tokens.jup.ag/token/<mint>   → TokenInfo
 *   - tagged:  https://tokens.jup.ag/tokens?tags=verified
 */
import type { TokenInfo } from '../types.js';

type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

export interface JupiterTokensOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
}

interface RawToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

export class JupiterTokensAdapter {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(opts: JupiterTokensOptions = {}) {
    this.baseUrl = opts.baseUrl ?? 'https://tokens.jup.ag';
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    if (!this.fetchImpl) throw new Error('No fetch implementation available; pass fetchImpl');
  }

  /** Look up a single mint. Returns null if Jupiter does not know it. */
  async getToken(mint: string): Promise<TokenInfo | null> {
    const res = await this.fetchImpl(`${this.baseUrl}/token/${mint}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Jupiter tokens API ${res.status}`);
    const t: RawToken | null = await res.json();
    if (!t || !t.address) return null;
    return this.normalize(t);
  }

  /** Fetch the verified token set as a mint->TokenInfo map. */
  async getVerifiedTokens(): Promise<Map<string, TokenInfo>> {
    const res = await this.fetchImpl(`${this.baseUrl}/tokens?tags=verified`);
    if (!res.ok) throw new Error(`Jupiter tokens API ${res.status}`);
    const arr: RawToken[] = await res.json();
    const out = new Map<string, TokenInfo>();
    for (const t of arr) {
      if (t?.address) out.set(t.address, this.normalize(t));
    }
    return out;
  }

  /**
   * Verify a candidate (mint, expectedSymbol). Returns the canonical TokenInfo
   * only when the mint exists AND its symbol matches (case-insensitive).
   * A mismatch means the seed mint is WRONG — caller must keep it pending.
   */
  async verify(mint: string, expectedSymbol: string): Promise<{ ok: boolean; token: TokenInfo | null; reason?: string }> {
    const token = await this.getToken(mint);
    if (!token) return { ok: false, token: null, reason: 'mint not found on Jupiter' };
    if (token.symbol.toLowerCase() !== expectedSymbol.toLowerCase()) {
      return { ok: false, token, reason: `symbol mismatch: seed=${expectedSymbol} jupiter=${token.symbol}` };
    }
    return { ok: true, token };
  }

  private normalize(t: RawToken): TokenInfo {
    return {
      mint: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      logoUrl: t.logoURI,
      tags: t.tags,
    };
  }
}
