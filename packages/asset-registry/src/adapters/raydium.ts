/**
 * Raydium adapter (interface + v1 placeholder).
 *
 * Raydium CLMM/AMM positions need a live on-chain read to value. v1 ships the
 * interface only; valuation defers to a keeper-provided cached value or throws.
 * Override getPool()/getPositionValueUsd() in Phase 2 using the Raydium SDK.
 */
import { NotImplementedLpAdapter } from '../nav/lpInterface.js';

export class RaydiumAdapter extends NotImplementedLpAdapter {
  static readonly poolType = 'clmm';

  constructor() {
    super('raydium');
  }

  describe(): { dex: string; poolType: string; implemented: boolean } {
    return { dex: this.dex, poolType: RaydiumAdapter.poolType, implemented: false };
  }
}
