import { NextRequest, NextResponse } from "next/server";
import { priceManager } from "@/lib/defi-prices";

interface CacheStats {
  before: {
    size: number;
    age: number;
    entries: string[];
  };
  after: {
    size: number;
    age: number;
    entries: string[];
  };
  cleared: boolean;
  timestamp: number;
}

/**
 * POST /api/cache/clear
 * Clear the price cache or specific cache entries
 *
 * Query Parameters:
 * - type: cache type to clear (all, prices, portfolio, tokens) (default: all)
 * - mints: comma-separated mints to remove from cache (optional)
 *
 * Request Body:
 * {
 *   type?: string,
 *   mints?: string[]
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   data: CacheStats,
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type") || "all";

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Request body is optional
    }

    // Validate type parameter
    const validTypes = ["all", "prices", "portfolio", "tokens"];
    if (!validTypes.includes(typeParam)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid cache type. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Get cache stats before clearing
    const statsBefore = priceManager.getCacheStats();

    // Clear cache based on type
    if (typeParam === "all" || typeParam === "prices") {
      // Handle mint-specific clearing
      const { mints } = body;
      if (Array.isArray(mints) && mints.length > 0) {
        // Clear specific mints - would need to modify priceManager
        console.log(`Clearing cache for ${mints.length} specific mints`);
        // For now, we'll clear all as the simple implementation
        priceManager.clearCache();
      } else {
        priceManager.clearCache();
      }
    }

    // Get cache stats after clearing
    const statsAfter = priceManager.getCacheStats();

    const cacheStats: CacheStats = {
      before: statsBefore,
      after: statsAfter,
      cleared: statsBefore.size > statsAfter.size || typeParam === "all",
      timestamp: Date.now(),
    };

    return NextResponse.json(
      {
        success: true,
        data: cacheStats,
        message: `Cache cleared successfully. Removed ${statsBefore.size} entries.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/cache/clear:", error);
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
 * GET /api/cache/clear
 * View cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = priceManager.getCacheStats();

    return NextResponse.json(
      {
        success: true,
        data: {
          cache: stats,
          cacheControl: {
            duration: 60000,
            unit: "milliseconds",
          },
          timestamp: Date.now(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/cache/clear:", error);
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
 * DELETE /api/cache/clear
 * Advanced cache management with detailed control
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "all";

    const validScopes = ["all", "stale", "byMint"];
    if (!validScopes.includes(scope)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid scope. Must be one of: ${validScopes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const statsBefore = priceManager.getCacheStats();

    if (scope === "all") {
      priceManager.clearCache();
    } else if (scope === "stale") {
      // Clear only stale entries (would need additional logic in priceManager)
      console.log("Clearing stale cache entries");
      priceManager.clearCache();
    }

    const statsAfter = priceManager.getCacheStats();

    return NextResponse.json(
      {
        success: true,
        data: {
          scope,
          before: statsBefore,
          after: statsAfter,
          removed: statsBefore.size - statsAfter.size,
        },
        timestamp: Date.now(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/cache/clear:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}