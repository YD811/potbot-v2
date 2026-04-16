import { NextRequest, NextResponse } from "next/server";
import { priceManager } from "@/lib/defi-prices";

/**
 * GET /api/prices
 * Fetch token prices by mint addresses
 *
 * Query Parameters:
 * - mints: comma-separated list of token mint addresses
 * - cache: boolean to enable/disable caching (default: true)
 *
 * Response:
 * {
 *   success: boolean,
 *   data: TokenPrice[],
 *   cached: boolean,
 *   timestamp: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mintsParam = searchParams.get("mints");
    const useCache = searchParams.get("cache") !== "false";

    // Validate input
    if (!mintsParam) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: mints",
          example: "/api/prices?mints=EPjFWaLb3odcccccccccccccccccccccccccccccccc,So11111111111111111111111111111111111111112",
        },
        { status: 400 }
      );
    }

    // Parse mints
    const mints = mintsParam
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    if (mints.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one mint address is required",
        },
        { status: 400 }
      );
    }

    // Validate mint addresses (basic validation)
    const invalidMints = mints.filter((m) => m.length < 32);
    if (invalidMints.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid mint address format",
          invalidMints,
        },
        { status: 400 }
      );
    }

    // Fetch prices
    if (!useCache) {
      priceManager.clearCache();
    }

    const prices = await priceManager.getTokenPrices(mints);

    const response = {
      success: true,
      data: prices,
      cached: useCache,
      count: prices.length,
      requestedCount: mints.length,
      timestamp: Date.now(),
      missing: mints.filter(
        (m) => !prices.find((p) => p.mint === m)
      ),
    };

    // Set cache headers
    const cacheControl = useCache
      ? "public, max-age=60, s-maxage=60"
      : "no-cache, no-store, must-revalidate";

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": cacheControl,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in /api/prices:", error);
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
 * POST /api/prices
 * Batch fetch token prices
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mints, cache = true } = body;

    if (!Array.isArray(mints) || mints.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Request body must include 'mints' array with at least one mint",
        },
        { status: 400 }
      );
    }

    if (!cache) {
      priceManager.clearCache();
    }

    const prices = await priceManager.getTokenPrices(mints);

    return NextResponse.json(
      {
        success: true,
        data: prices,
        count: prices.length,
        timestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": cache
            ? "public, max-age=60, s-maxage=60"
            : "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("Error in POST /api/prices:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}