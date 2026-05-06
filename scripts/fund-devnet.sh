#!/usr/bin/env bash
# scripts/fund-devnet.sh — airdrop SOL on devnet for demo purposes
# Usage: ./scripts/fund-devnet.sh [<wallet>] [<amount>]
set -euo pipefail

WALLET="${1:-$(solana address)}"
AMOUNT="${2:-2}"

echo "Airdropping $AMOUNT SOL to $WALLET on devnet..."
solana airdrop "$AMOUNT" "$WALLET" --url devnet

echo ""
echo "Balance:"
solana balance "$WALLET" --url devnet
