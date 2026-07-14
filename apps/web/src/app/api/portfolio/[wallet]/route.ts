import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getRpcUrl } from "@/lib/rpc";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { priceManager } from "@/lib/defi-prices";

interface PortfolioAsset {
  mint: string;
  symbol: string;
  decimals: number;
  amount: number;
  price: number;
  value: number;
  percentage: number;
}

interface Portfolio {
  wallet: string;
  assets: PortfolioAsset[];
  totalValue: number;
  tokenCount: number;
  timestamp: number;
}

/**
 * GET /api/portfolio/[wallet]
 * Fetch portfolio information for a wallet address
 *
 * Path Parameters:
 * - wallet: Solana wallet address (pubkey)
 *
 * Query Parameters:
 * - includeZeroBalance: include assets with zero balance (default: false)
 * - minValue: minimum USD value to include (default: 0)
 *
 * Response:
 * {
 *   success: boolean,
 *   data: Portfolio,
 *   error?: string
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;
    const { searchParams } = new URL(request.url);
    const includeZeroBalance = searchParams.get("includeZeroBalance") === "true";
    const minValue = parseFloat(searchParams.get("minValue") || "0");

    // Validate wallet address
    let walletPublicKey: PublicKey;
    try {
      walletPublicKey = new PublicKey(wallet);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address",
          wallet,
        },
        { status: 400 }
      );
    }

    // Initialize Solana connection
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || getRpcUrl()
    );

    // Get token accounts for wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      {
        programId: new PublicKey("TokenkegQfeZyiNwAJsyFbPVwwQQfuM32jnMAKfKAsH"),
      }
    );

    // Get SOL balance
    const solBalance = await connection.getBalance(walletPublicKey);

    // Collect all mints for price fetch
    const mints = tokenAccounts.value
      .map((acc) => acc.account.data.parsed.info.mint)
      .filter(Boolean);

    // Fetch prices for all tokens
    const prices = await priceManager.getTokenPrices(mints);
    const priceMap = new Map(prices.map((p) => [p.mint, p]));

    // Build asset list
    const assets: PortfolioAsset[] = [];
    let totalValue = 0;

    // Add SOL
    const solPrice = priceMap.get(
      "So11111111111111111111111111111111111111112"
    );
    const solUsdValue = solPrice
      ? (solBalance / 1e9) * solPrice.price
      : solBalance / 1e9;

    if (solBalance > 0 || includeZeroBalance) {
      if (solUsdValue >= minValue) {
        assets.push({
          mint: "So11111111111111111111111111111111111111112",
          symbol: "SOL",
          decimals: 9,
          amount: solBalance / 1e9,
          price: solPrice?.price || 0,
          value: solUsdValue,
          percentage: 0, // Will calculate after total
        });
        totalValue += solUsdValue;
      }
    }

    // Add SPL tokens
    for (const tokenAccount of tokenAccounts.value) {
      const parsed = tokenAccount.account.data.parsed.info;
      const mint = parsed.mint;
      const amount = parsed.tokenAmount.uiAmount || 0;
      const decimals = parsed.tokenAmount.decimals || 6;

      const price = priceMap.get(mint);
      const value = price ? amount * price.price : 0;

      if ((amount > 0 || includeZeroBalance) && value >= minValue) {
        assets.push({
          mint,
          symbol: price?.symbol || "UNKNOWN",
          decimals,
          amount,
          price: price?.price || 0,
          value,
          percentage: 0, // Will calculate after total
        });
        totalValue += value;
      }
    }

    // Calculate percentages
    assets.forEach((asset) => {
      asset.percentage =
        totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
    });

    // Sort by value descending
    assets.sort((a, b) => b.value - a.value);

    const portfolio: Portfolio = {
      wallet,
      assets,
      totalValue,
      tokenCount: assets.length,
      timestamp: Date.now(),
    };

    return NextResponse.json(
      {
        success: true,
        data: portfolio,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, s-maxage=30",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error in /api/portfolio/[wallet]:",
      error instanceof Error ? error.message : error
    );
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
 * POST /api/portfolio/[wallet]
 * Analyze portfolio risk and performance
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;
    const body = await request.json();
    const { analysis = "summary" } = body;

    // Validate wallet
    try {
      new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address",
        },
        { status: 400 }
      );
    }

    // TODO: Implement portfolio analysis
    // - Risk metrics
    // - Correlation analysis
    // - Historical performance
    // - Recommendations

    return NextResponse.json(
      {
        success: true,
        data: {
          wallet,
          analysis,
          metrics: {},
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/portfolio/[wallet]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}