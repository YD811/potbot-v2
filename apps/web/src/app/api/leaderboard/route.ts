import { NextRequest, NextResponse } from "next/server";

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  username?: string;
  totalValue: number;
  portfolioSize: number;
  returns24h: number;
  returnsPercent24h: number;
  topAsset: string;
  topAssetPercent: number;
  roi30d: number;
  winRate: number;
  trades: number;
  joinDate: string;
}

interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardEntry[];
  count: number;
  period: string;
  timestamp: number;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

/**
 * GET /api/leaderboard
 * Fetch leaderboard rankings
 *
 * Query Parameters:
 * - metric: ranking metric (totalValue, returns24h, roi30d, winRate) (default: totalValue)
 * - period: time period for metrics (1d, 7d, 30d, all) (default: all)
 * - page: page number for pagination (default: 1)
 * - pageSize: number of results per page (default: 20, max: 100)
 * - filter: filter type (all, verified, active) (default: all)
 *
 * Response:
 * {
 *   success: boolean,
 *   data: LeaderboardEntry[],
 *   count: number,
 *   period: string,
 *   timestamp: number,
 *   pagination: { ... }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get("metric") || "totalValue";
    const period = searchParams.get("period") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "20"),
      100
    );
    const filter = searchParams.get("filter") || "all";

    // Validate metric
    const validMetrics = ["totalValue", "returns24h", "roi30d", "winRate"];
    if (!validMetrics.includes(metric)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid metric. Must be one of: ${validMetrics.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate period
    const validPeriods = ["1d", "7d", "30d", "all"];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid period. Must be one of: ${validPeriods.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (page < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Page must be greater than 0",
        },
        { status: 400 }
      );
    }

    // Mock leaderboard data
    const mockEntries: LeaderboardEntry[] = [
      {
        rank: 1,
        wallet: "8nEzM6C7Q9X2K5L1Z7R4W8T2P5V9M0K3",
        username: "AlphaTrade",
        totalValue: 5000000,
        portfolioSize: 15,
        returns24h: 50000,
        returnsPercent24h: 1.02,
        topAsset: "SOL",
        topAssetPercent: 45.5,
        roi30d: 12.5,
        winRate: 82.3,
        trades: 145,
        joinDate: "2023-01-15",
      },
      {
        rank: 2,
        wallet: "7mDxL9N3K5P8Z1Q4R7W0T3M6K9L2P5V",
        username: "CryptoKing",
        totalValue: 4500000,
        portfolioSize: 12,
        returns24h: 45000,
        returnsPercent24h: 1.01,
        topAsset: "JUP",
        topAssetPercent: 35.2,
        roi30d: 11.8,
        winRate: 79.5,
        trades: 132,
        joinDate: "2023-02-01",
      },
      {
        rank: 3,
        wallet: "6kCbJ7H2F4M1N5P9Z3W6T0K2L8Q1V5R",
        username: "DeFiMaster",
        totalValue: 4000000,
        portfolioSize: 18,
        returns24h: 40000,
        returnsPercent24h: 1.01,
        topAsset: "RAY",
        topAssetPercent: 28.7,
        roi30d: 10.2,
        winRate: 76.8,
        trades: 178,
        joinDate: "2023-01-20",
      },
      {
        rank: 4,
        wallet: "5jAeG6L1M3N7P2Q5Z9W0T4K6L1M5P9V",
        username: "TokenHunter",
        totalValue: 3500000,
        portfolioSize: 22,
        returns24h: 35000,
        returnsPercent24h: 1.01,
        topAsset: "USDC",
        topAssetPercent: 25.3,
        roi30d: 9.5,
        winRate: 74.2,
        trades: 201,
        joinDate: "2023-02-10",
      },
      {
        rank: 5,
        wallet: "4iBfH5K9L2M6N0P3Z7W1T9K5L0M8Q2V",
        username: "LiquidityPro",
        totalValue: 3000000,
        portfolioSize: 10,
        returns24h: 30000,
        returnsPercent24h: 1.0,
        topAsset: "SOL",
        topAssetPercent: 52.1,
        roi30d: 8.7,
        winRate: 71.5,
        trades: 98,
        joinDate: "2023-03-01",
      },
    ];

    // Sort based on metric
    const sorted = [...mockEntries].sort((a, b) => {
      const aVal = a[metric as keyof LeaderboardEntry] as number;
      const bVal = b[metric as keyof LeaderboardEntry] as number;
      return bVal - aVal;
    });

    // Apply pagination
    const totalCount = sorted.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedEntries = sorted.slice(startIdx, endIdx);

    const response: LeaderboardResponse = {
      success: true,
      data: paginatedEntries,
      count: paginatedEntries.length,
      period,
      timestamp: Date.now(),
      pagination: {
        page,
        pageSize,
        totalPages,
        totalCount,
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("Error in /api/leaderboard:", error);
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
 * POST /api/leaderboard
 * Advanced leaderboard filtering and analytics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      metric = "totalValue",
      period = "all",
      filters = {},
      page = 1,
      pageSize = 20,
    } = body;

    // TODO: Implement advanced filtering
    // - Min/Max portfolio value
    // - Minimum win rate
    // - Account age filters
    // - Custom date ranges
    // - Geographic filters (if available)

    return NextResponse.json(
      {
        success: true,
        data: [],
        metric,
        period,
        filters,
        timestamp: Date.now(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/leaderboard:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}