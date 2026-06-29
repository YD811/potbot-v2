/**
 * LP valuation interface (v1: placeholder).
 *
 * NAV for an LP position depends on the underlying reserves + the position's
 * share of the pool, which requires a live read from the DEX program. In v1 we
 * define the interface and a safe default that REFUSES to invent a number:
 * an unimplemented adapter returns `null`, and the NAV service treats the
 * holding as unpriced rather than silently valuing it at zero or a guess.
 */
import type { LpAdapter, LpPosition, AssetPair, Dex } from '../types.js';

export class NotImplementedLpAdapter implements LpAdapter {
  constructor(public readonly dex: Dex) {}

  async getPool(_poolAddress: string): Promise<AssetPair | null> {
    return null;
  }

  /**
   * Returns the keeper-provided cached value if present, otherwise throws.
   * Never fabricates a valuation.
   */
  async getPositionValueUsd(position: LpPosition): Promise<number> {
    if (typeof position.cachedValueUsd === 'number') return position.cachedValueUsd;
    throw new LpNotImplementedError(this.dex);
  }
}

export class LpNotImplementedError extends Error {
  constructor(dex: Dex) {
    super(`LP valuation for ${dex} is not implemented in v1 (no cached value available)`);
    this.name = 'LpNotImplementedError';
  }
}
