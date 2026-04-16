"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface Asset {
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
  assets: Asset[];
  totalValue: number;
  tokenCount: number;
  timestamp: number;
}

interface PortfolioViewProps {
  walletAddress?: string;
  minValue?: number;
  includeZeroBalance?: boolean;
  refreshInterval?: number;
  onDataLoaded?: (portfolio: Portfolio) => void;
  onError?: (error: Error) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  walletAddress,
  minValue = 0,
  includeZeroBalance = false,
  refreshInterval = 30000, // 30 seconds
  onDataLoaded,
  onError,
}) => {
  const { publicKey } = useWallet();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [sortBy, setSortBy] = useState<"value" | "percentage" | "name">(
    "value"
  );

  const effectiveWallet = walletAddress || publicKey?.toBase58();

  /**
   * Fetch portfolio data from API
   */
  const fetchPortfolio = async (wallet: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        includeZeroBalance: includeZeroBalance.toString(),
        minValue: minValue.toString(),
      });

      const response = await fetch(
        `/api/portfolio/${wallet}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch portfolio: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch portfolio");
      }

      setPortfolio(data.data);
      setLastUpdated(new Date());

      if (onDataLoaded) {
        onDataLoaded(data.data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);

      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Set up auto-refresh
   */
  useEffect(() => {
    if (!effectiveWallet) {
      setLoading(false);
      setError("No wallet connected");
      return;
    }

    // Initial fetch
    fetchPortfolio(effectiveWallet);

    // Set up interval
    const interval = setInterval(() => {
      fetchPortfolio(effectiveWallet);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [effectiveWallet, refreshInterval, minValue, includeZeroBalance]);

  /**
   * Sort assets based on current sort criteria
   */
  const getSortedAssets = (): Asset[] => {
    if (!portfolio) return [];

    const sorted = [...portfolio.assets];

    switch (sortBy) {
      case "value":
        sorted.sort((a, b) => b.value - a.value);
        break;
      case "percentage":
        sorted.sort((a, b) => b.percentage - a.percentage);
        break;
      case "name":
        sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
    }

    return sorted;
  };

  /**
   * Format currency value
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  /**
   * Format percentage
   */
  const formatPercent = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  /**
   * Format large numbers
   */
  const formatAmount = (amount: number, decimals: number = 2): string => {
    if (amount === 0) return "0";
    if (amount < 0.01) return amount.toExponential(decimals);
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  if (!effectiveWallet) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-semibold">Wallet Not Connected</p>
        <p className="text-red-700 text-sm mt-2">
          Please connect your wallet to view your portfolio.
        </p>
      </div>
    );
  }

  if (loading && !portfolio) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading portfolio...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-semibold">Error Loading Portfolio</p>
        <p className="text-red-700 text-sm mt-2">{error}</p>
        <button
          onClick={() => fetchPortfolio(effectiveWallet)}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!portfolio || portfolio.assets.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600">No assets found in this wallet</p>
      </div>
    );
  }

  const sortedAssets = getSortedAssets();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
            <p className="text-sm text-gray-500 mt-1">
              {portfolio.wallet.slice(0, 8)}...{portfolio.wallet.slice(-8)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {formatCurrency(portfolio.totalValue)}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {portfolio.tokenCount} assets
            </div>
          </div>
        </div>

        {lastUpdated && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
            <button
              onClick={() => fetchPortfolio(effectiveWallet)}
              disabled={loading}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={sortBy === "value"}
            onChange={() => setSortBy("value")}
            className="w-4 h-4"
          />
          Sort by Value
        </label>
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={sortBy === "percentage"}
            onChange={() => setSortBy("percentage")}
            className="w-4 h-4"
          />
          Sort by %
        </label>
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={sortBy === "name"}
            onChange={() => setSortBy("name")}
            className="w-4 h-4"
          />
          Sort by Name
        </label>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                  Asset
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                  Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                  Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedAssets.map((asset, idx) => (
                <tr
                  key={asset.mint}
                  className={`hover:bg-gray-50 cursor-pointer transition ${
                    selectedAsset?.mint === asset.mint ? "bg-blue-50" : ""
                  }`}
                  onClick={() =>
                    setSelectedAsset(
                      selectedAsset?.mint === asset.mint ? null : asset
                    )
                  }
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {asset.symbol.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {asset.symbol}
                        </div>
                        <div className="text-xs text-gray-500">
                          {asset.mint.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(asset.price)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-gray-900 font-mono text-sm">
                      {formatAmount(asset.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(asset.value)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-semibold text-blue-600">
                      {formatPercent(asset.percentage)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Details */}
      {selectedAsset && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {selectedAsset.symbol} Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Current Price
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(selectedAsset.price)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Total Amount
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatAmount(selectedAsset.amount, 6)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Total Value
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(selectedAsset.value)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Portfolio Weight
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercent(selectedAsset.percentage)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Mint Address
              </p>
              <p className="text-sm font-mono text-gray-700 break-all">
                {selectedAsset.mint}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioView;