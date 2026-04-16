import { NextRequest, NextResponse } from "next/server";
import { priceManager } from "@/lib/defi-prices";

interface TopToken {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  marketCap: number;
  volume24h: number;
  volumeChange24h: number;
  priceChange24h: number;
  liquidity: number;
  holders: number;
  trades24h: number;
  rank: number;
}

/**
 * GET /api/tokens/top
 * Fetch top tokens by market cap, volume, or price change
 *
 * Query Parameters:
 * - limit: number of tokens to return (default: 20, max: 100)
 * - sort: sorting metric (marketCap, volume24h, priceChange24h, liquidity) (default: marketCap)
 * - order: ascending or descending (default: descending)
 * - minLiquidity: minimum liquidity filter (default: 0)
 *
 * Response:
 * {
 *   success: boolean,
 *   data: TopToken[],
 *   count: number,
 *   timestamp: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20"),
      100
    );
    const sort = searchParams.get("sort") || "marketCap";
    const order = searchParams.get("order") || "descending";
    const minLiquidity = parseFloat(searchParams.get("minLiquidity") || "0");

    // Validate sort parameter
    const validSortFields = [
      "marketCap",
      "volume24h",
      "priceChange24h",
      "liquidity",
    ];
    if (!validSortFields.includes(sort)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid sort parameter. Must be one of: ${validSortFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Mock data - in production this would fetch from multiple sources
    const mockTopTokens: TopToken[] = [
      {
        mint: "EPjFWaLb3odcccccccccccccccccccccccccccccccc",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        price: 1.0,
        marketCap: 30000000000,
        volume24h: 5000000000,
        volumeChange24h: 2.5,
        priceChange24h: 0.01,
        liquidity: 2000000000,
        holders: 500000,
        trades24h: 1000000,
        rank: 1,
      },
      {
        mint: "EPjFWaLb3odcccccccccccccccccccccccccccccccd",
        symbol: "USDT",
        name: "Tether",
        decimals: 6,
        price: 1.0,
        marketCap: 25000000000,
        volume24h: 4500000000,
        volumeChange24h: 1.8,
        priceChange24h: 0.02,
        liquidity: 1500000000,
        holders: 450000,
        trades24h: 900000,
        rank: 2,
      },
      {
        mint: "So11111111111111111111111111111111111111112",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        price: 140.5,
        marketCap: 65000000000,
        volume24h: 3000000000,
        volumeChange24h: 5.2,
        priceChange24h: 2.45,
        liquidity: 3000000000,
        holders: 300000,
        trades24h: 2000000,
        rank: 3,
      },
      {
        mint: "EPjFWaLb3odccccccccccccccccccccccccccccccce",
        symbol: "RAY",
        name: "Raydium",
        decimals: 6,
        price: 5.5,
        marketCap: 500000000,
        volume24h: 50000000,
        volumeChange24h: 3.1,
        priceChange24h: 1.25,
        liquidity: 100000000,
        holders: 150000,
        trades24h: 300000,
        rank: 4,
      },
      {
        mint: "EPjFWaLb3odccccccccccccccccccccccccccccccdf",
        symbol: "JUP",
        name: "Jupiter",
        decimals: 6,
        price: 4.2,
        marketCap: 420000000,
        volume24h: 40000000,
        volumeChange24h: 4.5,
        priceChange24h: 3.15,
        liquidity: 80000000,
        holders: 120000,
        trades24h: 250000,
        rank: 5,
      },
    ];

    // Filter by minimum liquidity
    let tokens = mockTopTokens.filter((t) => t.liquidity >= minLiquidity);

    // Sort tokens
    tokens.sort((a, b) => {
      const aValue = a[sort as keyof TopToken] as number;
      const bValue = b[sort as keyof TopToken] as number;

      return order === "descending" ? bValue - aValue : aValue - bValue;
    });

    // Apply limit
    tokens = tokens.slice(0, limit);

    // Update ranks based on current sort
    tokens = tokens.map((token, index) => ({
      ...token,
      rank: index + 1,
    }));

    const response = {
      success: true,
      data: tokens,
      count: tokens.length,
      query: {
        limit,
        sort,
        order,
        minLiquidity,
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("Error in /api/tokens/top:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tokens/top
 * Custom token ranking with filters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      limit = 20,
      sort = "marketCap",
      order = "descending",
      filters = {},
    } = body;

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Limit must be between 1 and 100",
        },
        { status: 400 }
      );
    }

    // TODO: Implement advanced filtering
    // - Price range
    // - Holder count range
    // - Volume thresholds
    // - Custom metrics

    return NextResponse.json(
      {
        success: true,
        data: [],
        filters,
        timestamp: Date.now(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/tokens/top:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}