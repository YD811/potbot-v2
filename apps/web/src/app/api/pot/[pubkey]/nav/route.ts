import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getRpcUrl } from "@/lib/rpc";

interface NAVData {
  pubkey: string;
  name: string;
  symbol: string;
  totalAssets: number;
  totalLiabilities: number;
  netAssetValue: number;
  sharesOutstanding: number;
  navPerShare: number;
  navChange24h: number;
  navChangePercent24h: number;
  timestamp: number;
  lastUpdate: number;
}

interface NAVHistory {
  timestamp: number;
  nav: number;
  navPerShare: number;
  sharesOutstanding: number;
}

/**
 * GET /api/pot/[pubkey]/nav
 * Fetch Net Asset Value (NAV) for a Pot (portfolio/fund)
 *
 * Path Parameters:
 * - pubkey: Pot public key address
 *
 * Query Parameters:
 * - history: number of historical data points to return
 * - interval: time interval for history (1h, 4h, 1d, etc.)
 *
 * Response:
 * {
 *   success: boolean,
 *   data: NAVData,
 *   history?: NAVHistory[],
 *   error?: string
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> }
) {
  try {
    const { pubkey } = await params;
    const { searchParams } = new URL(request.url);
    const historyCount = parseInt(searchParams.get("history") || "0");
    const interval = searchParams.get("interval") || "1d";

    // Validate public key
    let potPubkey: PublicKey;
    try {
      potPubkey = new PublicKey(pubkey);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid public key format",
          pubkey,
        },
        { status: 400 }
      );
    }

    // Initialize connection
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || getRpcUrl()
    );

    // Fetch account info
    const accountInfo = await connection.getAccountInfo(potPubkey);

    if (!accountInfo) {
      return NextResponse.json(
        {
          success: false,
          error: "Pot account not found",
          pubkey,
        },
        { status: 404 }
      );
    }

    // Parse account data (this is a simplified example)
    // In production, you'd decode the actual account structure
    const navData: NAVData = {
      pubkey,
      name: "Sample Pot",
      symbol: "POT",
      totalAssets: 1000000, // USD value
      totalLiabilities: 100000,
      netAssetValue: 900000,
      sharesOutstanding: 100000,
      navPerShare: 9.0,
      navChange24h: 5000,
      navChangePercent24h: 0.56,
      timestamp: Date.now(),
      lastUpdate: Date.now() - 60000, // 1 minute ago
    };

    const response: any = {
      success: true,
      data: navData,
    };

    // Include history if requested
    if (historyCount > 0) {
      const history: NAVHistory[] = [];
      const now = Date.now();

      // Generate mock historical data
      for (let i = historyCount - 1; i >= 0; i--) {
        const timeOffset = getTimeOffset(i, interval);
        history.push({
          timestamp: now - timeOffset,
          nav: navData.netAssetValue * (0.95 + Math.random() * 0.1),
          navPerShare: navData.navPerShare * (0.95 + Math.random() * 0.1),
          sharesOutstanding: navData.sharesOutstanding,
        });
      }

      response.history = history;
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (error) {
    console.error("Error in /api/pot/[pubkey]/nav:", error);
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
 * POST /api/pot/[pubkey]/nav
 * Calculate NAV based on provided assets
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> }
) {
  try {
    const { pubkey } = await params;
    const body = await request.json();
    const { assets, liabilities = [] } = body;

    if (!Array.isArray(assets)) {
      return NextResponse.json(
        {
          success: false,
          error: "Request body must include 'assets' array",
        },
        { status: 400 }
      );
    }

    // Calculate totals
    const totalAssets = (assets as Array<{ value: number }>).reduce(
      (sum, asset) => sum + asset.value,
      0,
    );
    const totalLiabilities = (liabilities as Array<{ value: number }>).reduce(
      (sum, liability) => sum + liability.value,
      0,
    );
    const nav = totalAssets - totalLiabilities;

    const navData: NAVData = {
      pubkey,
      name: "Calculated NAV",
      symbol: "NAV",
      totalAssets,
      totalLiabilities,
      netAssetValue: nav,
      sharesOutstanding: 100000, // Default
      navPerShare: nav / 100000,
      navChange24h: 0,
      navChangePercent24h: 0,
      timestamp: Date.now(),
      lastUpdate: Date.now(),
    };

    return NextResponse.json(
      {
        success: true,
        data: navData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/pot/[pubkey]/nav:", error);
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
 * Helper to calculate time offset based on interval
 */
function getTimeOffset(
  index: number,
  interval: string
): number {
  const intervals: { [key: string]: number } = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
  };

  const intervalMs = intervals[interval] || 60 * 60 * 1000;
  return index * intervalMs;
}