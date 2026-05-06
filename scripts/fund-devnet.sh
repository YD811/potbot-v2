#!/usr/bin/env bash
# scripts/fund-devnet.sh
# Bootstrap a wallet for PotBot v2 devnet testing:
#   1) airdrop SOL
#   2) create wSOL ATA
#   3) print devnet USDC mint + faucet URL
#
# Usage: ./scripts/fund-devnet.sh

set -euo pipefail

if ! command -v solana >/dev/null 2>&1; then
  echo "ERROR: 'solana' CLI not found in PATH" >&2
  exit 1
fi
if ! command -v spl-token >/dev/null 2>&1; then
  echo "ERROR: 'spl-token' CLI not found in PATH" >&2
  exit 1
fi

CLUSTER="${SOLANA_CLUSTER:-devnet}"
WSOL_MINT="So11111111111111111111111111111111111111112"
USDC_DEVNET_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

WALLET=$(solana address)
echo "Wallet: $WALLET (cluster=$CLUSTER)"

echo ""
echo "[1/3] Airdropping 2 SOL on $CLUSTER..."
solana airdrop 2 --url "$CLUSTER" || {
  echo "  Airdrop failed — devnet faucet is rate-limited; retry in a minute or visit"
  echo "  https://faucet.solana.com to top up manually."
}
sleep 2

echo ""
echo "[2/3] Ensuring wSOL ATA exists..."
spl-token create-account "$WSOL_MINT" --url "$CLUSTER" 2>/dev/null \
  && echo "  Created wSOL ATA" \
  || echo "  wSOL ATA already exists (ok)"

echo ""
echo "[3/3] Devnet USDC: $USDC_DEVNET_MINT"
echo "  Faucet: https://faucet.circle.com (select Solana → Devnet)"
echo ""

CURRENT_BALANCE=$(solana balance --url "$CLUSTER" | awk '{print $1}')
echo "Done. Current SOL balance: ${CURRENT_BALANCE} SOL"
echo ""
echo "Next steps:"
echo "  - cd packages/program && anchor build"
echo "  - npx ts-node scripts/demo_swap.ts   # E2E SOL→USDC swap demo"
