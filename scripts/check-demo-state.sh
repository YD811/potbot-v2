#!/usr/bin/env bash
#
# scripts/check-demo-state.sh
#
# Quick health check for the hackathon demo Pot on devnet. Prints program
# status, demo-Pot vault balance, recent transactions, and IDL freshness.
#
# Usage:
#   ./scripts/check-demo-state.sh
#
# Picks up the pot pubkey from scripts/.demo-pot.json (written by
# create-frontier-demo-pot.ts) or from POT env var if set.

set -euo pipefail

PROGRAM_ID="GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK"
TREASURY="2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o"
CLUSTER_URL="${RPC_URL:-https://api.devnet.solana.com}"
META_FILE="$(dirname "$0")/.demo-pot.json"

bold() { printf "\033[1m%s\033[0m" "$1"; }
green() { printf "\033[32m%s\033[0m" "$1"; }
red() { printf "\033[31m%s\033[0m" "$1"; }
yellow() { printf "\033[33m%s\033[0m" "$1"; }

# Resolve pot pubkey: env wins, then meta file, else error.
POT_PUBKEY="${POT:-}"
if [[ -z "$POT_PUBKEY" && -f "$META_FILE" ]]; then
  POT_PUBKEY=$(grep -o '"pot": "[^"]*"' "$META_FILE" | head -1 | cut -d'"' -f4)
fi

echo
echo "$(bold "─── PotBot v2 — Devnet Demo State ─────────────────────────────")"
echo "Program:  $PROGRAM_ID"
echo "Cluster:  $CLUSTER_URL"
echo "Treasury: $TREASURY"
echo

# ── 1. Program deploy info ─────────────────────────────────────────────────
echo "$(bold "[1] Program deploy")"
if solana program show "$PROGRAM_ID" --url "$CLUSTER_URL" 2>&1 | grep -E "Last Deployed In Slot|Data Length|Authority"; then
  :
else
  echo "$(red "✗ Could not fetch program info — RPC issue or program not deployed.")"
fi
echo

# ── 2. Local IDL freshness ─────────────────────────────────────────────────
echo "$(bold "[2] Local IDL artifact")"
IDL_PATH="$(dirname "$0")/../packages/program/target/idl/pot_vault.json"
if [[ -f "$IDL_PATH" ]]; then
  IDL_AGE_DAYS=$(( ($(date +%s) - $(stat -f %m "$IDL_PATH")) / 86400 ))
  IX_COUNT=$(jq -r '.instructions | length' "$IDL_PATH" 2>/dev/null || echo "?")
  ACC_COUNT=$(jq -r '.accounts | length' "$IDL_PATH" 2>/dev/null || echo "?")
  if [[ "$IDL_AGE_DAYS" -gt 1 ]]; then
    echo "$(yellow "⚠ IDL is $IDL_AGE_DAYS days old") — anchor build IDL gen may be broken."
  else
    echo "$(green "✓ IDL is fresh ($IDL_AGE_DAYS days old)")"
  fi
  echo "  $IX_COUNT instructions, $ACC_COUNT accounts"
else
  echo "$(red "✗ No local IDL at $IDL_PATH — anchor build hasn't produced one.")"
fi
echo

# ── 3. Demo Pot ─────────────────────────────────────────────────────────────
echo "$(bold "[3] Demo Pot")"
if [[ -z "$POT_PUBKEY" ]]; then
  echo "$(yellow "⚠ No demo Pot pubkey known.") Either:"
  echo "    - run scripts/create-frontier-demo-pot.ts to create one, or"
  echo "    - set POT=<pubkey> env var to inspect an existing pot"
else
  echo "Pot:      $POT_PUBKEY"
  echo "Explorer: https://explorer.solana.com/address/$POT_PUBKEY?cluster=devnet"
  POT_BAL=$(solana balance "$POT_PUBKEY" --url "$CLUSTER_URL" 2>/dev/null || echo "—")
  echo "Pot acct: $POT_BAL  (rent-exempt PotAccount, not user funds)"

  # Compute vault PDA. Vault seeds: ["vault", pot_pubkey]. Easiest via solana CLI? No direct. Use python or a tiny node helper.
  # The pot's metadata file already has vault — read it.
  if [[ -f "$META_FILE" ]]; then
    VAULT=$(grep -o '"vault": "[^"]*"' "$META_FILE" | head -1 | cut -d'"' -f4)
    if [[ -n "$VAULT" ]]; then
      VAULT_BAL=$(solana balance "$VAULT" --url "$CLUSTER_URL" 2>/dev/null || echo "—")
      echo "Vault:    $VAULT"
      echo "Vault $: $VAULT_BAL"
    fi
  else
    echo "$(yellow "  Vault PDA: unknown — meta file missing. Check via Explorer.")"
  fi
fi
echo

# ── 4. Authority wallet ────────────────────────────────────────────────────
echo "$(bold "[4] Authority wallet (this machine's solana CLI default)")"
WALLET=$(solana address 2>/dev/null || echo "—")
WALLET_BAL=$(solana balance --url "$CLUSTER_URL" 2>/dev/null || echo "—")
echo "Wallet:  $WALLET"
echo "Balance: $WALLET_BAL"
if [[ "$WALLET_BAL" == "0 SOL" || "$WALLET_BAL" == "—" ]]; then
  echo "$(yellow "⚠ Wallet is empty.") Run: solana airdrop 2 --url devnet"
fi
echo

# ── 5. PR & branch state ───────────────────────────────────────────────────
echo "$(bold "[5] Repo state")"
cd "$(dirname "$0")/.."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
DIRTY=$(git status -s | wc -l | tr -d ' ')
echo "Branch:  $BRANCH"
if [[ "$DIRTY" -gt 0 ]]; then
  echo "$(yellow "⚠ $DIRTY uncommitted file(s)") — run: git status"
else
  echo "$(green "✓ Working tree clean")"
fi
echo

echo "$(bold "─── Done ───────────────────────────────────────────────────────")"
