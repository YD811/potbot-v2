/**
 * Meteora adapter (interface + v1 placeholder).
 *
 * Meteora DLMM positions need a live on-chain read (bin reserves + position
 * liquidity) to value. v1 ships the interface only; valuation defers to a
 * keeper-provided cached value or throws — it never invents a number.
 *
 * When implemented (Phase 2), override getPool() from the Meteora SDK/API and
 * getPositionValueUsd() from the on-chain position + token prices.
 */
import { NotImplementedLpAdapter } from '../nav/lpInterface.js';

export class MeteoraAdapter extends NotImplementedLpAdapter {
  static readonly poolType = 'dlmm';

  constructor() {
    super('meteora');
  }

  describe(): { dex: string; poolType: string; implemented: boolean } {
    return { dex: this.dex, poolType: MeteoraAdapter.poolType, implemented: false };
  }
}
