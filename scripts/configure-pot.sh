#!/usr/bin/env bash
set -euo pipefail
POT_PUBKEY="${1:?Usage: configure-pot.sh <potPubkey>}"
echo "Configuring pot $POT_PUBKEY..."
npx tsx scripts/_configure_pot_inner.ts "$POT_PUBKEY"
