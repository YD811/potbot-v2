import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getRpcUrl } from "@/lib/rpc";

interface TokenPrice {
  mint: string;
  symbol: string;
  decimals: number;
  price: number;
  liquidity: number;
  volume24h: number;
  priceChange24h: number;
}

interface PriceCache {
  [key: string]: TokenPrice;
}

interface PriceSource {
  name: string;
  url: string;
  priority: number;
}

class DefiPriceManager {
  private connection: Connection;
  private priceCache: PriceCache = {};
  private cacheTimestamp: number = 0;
  private cacheDuration: number = 60000; // 60 seconds
  private priceSources: PriceSource[] = [
    {
      name: "Jupiter",
      url: "https://api.jup.ag/price",
      priority: 1,
    },
    {
      name: "Raydium",
      url: "https://api.raydium.io/v2/main/prices",
      priority: 2,
    },
    {
      name: "Coingecko",
      url: "https://api.coingecko.com/api/v3/simple/price",
      priority: 3,
    },
  ];

  constructor(rpcEndpoint: string = getRpcUrl()) {
    this.connection = new Connection(rpcEndpoint);
  }

  /**
   * Get token price from cache or fetch from sources
   */
  async getTokenPrice(mint: string): Promise<TokenPrice | null> {
    // Check cache
    if (this.isValidCache(mint)) {
      return this.priceCache[mint];
    }

    // Try each price source in priority order
    for (const source of this.priceSources) {
      try {
        const price = await this.fetchFromSource(source, mint);
        if (price) {
          this.priceCache[mint] = price;
          this.cacheTimestamp = Date.now();
          return price;
        }
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Get prices for multiple tokens
   */
  async getTokenPrices(mints: string[]): Promise<TokenPrice[]> {
    const prices = await Promise.all(
      mints.map((mint) => this.getTokenPrice(mint))
    );
    return prices.filter((price) => price !== null) as TokenPrice[];
  }

  /**
   * Fetch price from a specific source
   */
  private async fetchFromSource(
    source: PriceSource,
    mint: string
  ): Promise<TokenPrice | null> {
    try {
      let response;

      if (source.name === "Jupiter") {
        response = await fetch(`${source.url}?ids=${mint}`);
        const data = await response.json();
        if (data.data && data.data[mint]) {
          return this.parseJupiterPrice(mint, data.data[mint]);
        }
      } else if (source.name === "Raydium") {
        response = await fetch(source.url);
        const data = await response.json();
        if (data[mint]) {
          return this.parseRaydiumPrice(mint, data[mint]);
        }
      } else if (source.name === "Coingecko") {
        // Coingecko uses different format
        response = await fetch(`${source.url}?ids=solana&vs_currencies=usd`);
        const data = await response.json();
        if (data.solana) {
          return this.parseCoinGeckoPrice(mint, data.solana);
        }
      }

      return null;
    } catch (error) {
      console.error(`Error in ${source.name} fetch:`, error);
      return null;
    }
  }

  /**
   * Parse Jupiter API response
   */
  private parseJupiterPrice(mint: string, data: any): TokenPrice {
    return {
      mint,
      symbol: data.symbol || "UNKNOWN",
      decimals: data.decimals || 6,
      price: parseFloat(data.price) || 0,
      liquidity: parseFloat(data.liquidity) || 0,
      volume24h: parseFloat(data.volume24h) || 0,
      priceChange24h: parseFloat(data.priceChange24h) || 0,
    };
  }

  /**
   * Parse Raydium API response
   */
  private parseRaydiumPrice(mint: string, data: any): TokenPrice {
    return {
      mint,
      symbol: data.symbol || "UNKNOWN",
      decimals: data.decimals || 6,
      price: parseFloat(data.price) || 0,
      liquidity: parseFloat(data.liquidity) || 0,
      volume24h: parseFloat(data.volume24h) || 0,
      priceChange24h: parseFloat(data.priceChange24h) || 0,
    };
  }

  /**
   * Parse CoinGecko API response
   */
  private parseCoinGeckoPrice(mint: string, data: any): TokenPrice {
    return {
      mint,
      symbol: "SOL",
      decimals: 9,
      price: parseFloat(data.usd) || 0,
      liquidity: 0,
      volume24h: parseFloat(data.usd_24h_vol) || 0,
      priceChange24h: parseFloat(data.usd_24h_change) || 0,
    };
  }

  /**
   * Check if cache is still valid
   */
  private isValidCache(mint: string): boolean {
    if (!this.priceCache[mint]) {
      return false;
    }

    const now = Date.now();
    const age = now - this.cacheTimestamp;
    return age < this.cacheDuration;
  }

  /**
   * Clear the price cache
   */
  clearCache(): void {
    this.priceCache = {};
    this.cacheTimestamp = 0;
  }

  /**
   * Update cache duration
   */
  setCacheDuration(duration: number): void {
    this.cacheDuration = duration;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    age: number;
    entries: string[];
  } {
    return {
      size: Object.keys(this.priceCache).length,
      age: Date.now() - this.cacheTimestamp,
      entries: Object.keys(this.priceCache),
    };
  }

  /**
   * Calculate token value
   */
  calculateValue(amount: number, price: number, decimals: number): number {
    return (amount / Math.pow(10, decimals)) * price;
  }

  /**
   * Format price for display
   */
  formatPrice(price: number, decimals: number = 2): string {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }

  /**
   * Get price change indicator
   */
  getPriceChangeIndicator(
    change: number
  ): { emoji: string; prefix: string; value: string } {
    const absChange = Math.abs(change);
    return {
      emoji: change >= 0 ? "📈" : "📉",
      prefix: change >= 0 ? "+" : "-",
      value: absChange.toFixed(2) + "%",
    };
  }
}

// Export singleton instance
export const priceManager = new DefiPriceManager();

export type { TokenPrice, PriceCache };
export { DefiPriceManager };