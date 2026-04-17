#!/usr/bin/env bash
# =============================================================================
# PotBot v2 — Devnet Deploy / Upgrade Script
# =============================================================================
# Requirements:
#   - Rust:    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
#   - Solana:  sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
#   - Anchor:  cargo install --git https://github.com/coral-xyz/anchor avm --locked
#              avm install 0.30.1 && avm use 0.30.1
#
# Usage:
#   cd packages/program
#   bash deploy.sh
# =============================================================================
set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}[deploy]${NC} $1"; }
ok()   { echo -e "${GREEN}[ok]${NC}    $1"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $1"; }
err()  { echo -e "${RED}[error]${NC} $1"; exit 1; }

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Program ID must match declare_id! in lib.rs and Anchor.toml
PROGRAM_ID="ED4zhABMV97obJSD5bzasUPaNVmc3qwA3WhwqoGVCDvH"
KEYPAIR_PATH="target/deploy/pot_vault-keypair.json"
SO_FILE="target/deploy/pot_vault.so"

# ──────────────────────────────────────────────────────────────────────────────
# 1. Check prerequisites
# ──────────────────────────────────────────────────────────────────────────────
log "Checking prerequisites..."
command -v solana        &>/dev/null || err "Solana CLI not found. Install: sh -c \"\$(curl -sSfL https://release.anza.xyz/stable/install)\""
command -v solana-keygen &>/dev/null || err "solana-keygen not found"
command -v cargo         &>/dev/null || err "Rust/Cargo not found. Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"

# Anchor is preferred (generates IDL), fall back to cargo build-sbf
if command -v anchor &>/dev/null; then
  BUILD_CMD="anchor"
  ok "anchor CLI found — will use anchor build (generates IDL)"
else
  BUILD_CMD="cargo"
  warn "anchor CLI not found — using cargo build-sbf (no IDL generation)"
  warn "Install: cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install 0.30.1 && avm use 0.30.1"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 2. Configure Solana CLI for devnet
# ──────────────────────────────────────────────────────────────────────────────
log "Configuring Solana CLI for devnet..."
solana config set --url https://api.devnet.solana.com

if [ ! -f ~/.config/solana/id.json ]; then
  warn "No keypair found at ~/.config/solana/id.json — generating..."
  solana-keygen new --outfile ~/.config/solana/id.json --no-bip39-passphrase
fi

DEPLOYER=$(solana address)
log "Deployer wallet: $DEPLOYER"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Check SOL balance
# ──────────────────────────────────────────────────────────────────────────────
BALANCE=$(solana balance --url devnet 2>/dev/null | awk '{print $1}' | cut -d. -f1 || echo "0")
log "Current balance: ${BALANCE} SOL"

if [ "${BALANCE:-0}" -lt 3 ] 2>/dev/null; then
  log "Balance low, requesting airdrop..."
  solana airdrop 4 --url devnet || warn "Airdrop rate limited — get SOL at: https://faucet.solana.com"
  sleep 5
  solana balance --url devnet
fi

# ──────────────────────────────────────────────────────────────────────────────
# 4. Build program + generate IDL
# ──────────────────────────────────────────────────────────────────────────────
log "Building program..."

if [ "$BUILD_CMD" = "anchor" ]; then
  anchor build 2>&1 || true   # IDL generation may warn on stable Rust — that's OK
else
  cargo build-sbf --manifest-path programs/pot_vault/Cargo.toml 2>&1 || true
fi

if [ ! -f "$SO_FILE" ]; then
  err "Build failed — $SO_FILE not found. Check compile errors above."
fi
ok "Build complete — $(ls -sh $SO_FILE | awk '{print $1}') .so"

# ──────────────────────────────────────────────────────────────────────────────
# 5. Ensure program keypair exists with correct ID
# ──────────────────────────────────────────────────────────────────────────────
mkdir -p target/deploy

if [ ! -f "$KEYPAIR_PATH" ]; then
  warn "No program keypair at $KEYPAIR_PATH — generating..."
  solana-keygen new --outfile "$KEYPAIR_PATH" --no-bip39-passphrase
fi

KEYPAIR_ID=$(solana-keygen pubkey "$KEYPAIR_PATH")
log "Keypair program ID: $KEYPAIR_ID"

if [ "$KEYPAIR_ID" != "$PROGRAM_ID" ]; then
  warn "Keypair ID ($KEYPAIR_ID) != expected ($PROGRAM_ID)"
  warn "If this is a first deploy, the program will get the keypair's ID."
  warn "If upgrading, make sure you have the original keypair!"
  # Update declare_id! and Anchor.toml to match the actual keypair
  sed -i.bak "s/$PROGRAM_ID/$KEYPAIR_ID/g" programs/pot_vault/src/lib.rs
  sed -i.bak "s/$PROGRAM_ID/$KEYPAIR_ID/g" Anchor.toml
  PROGRAM_ID="$KEYPAIR_ID"
  log "Updated program ID to $PROGRAM_ID — rebuilding..."
  if [ "$BUILD_CMD" = "anchor" ]; then
    anchor build 2>&1 || true
  else
    cargo build-sbf --manifest-path programs/pot_vault/Cargo.toml 2>&1 || true
  fi
fi

# ──────────────────────────────────────────────────────────────────────────────
# 6. Check if program is already deployed (upgrade path)
# ──────────────────────────────────────────────────────────────────────────────
PROGRAM_EXISTS=$(solana program show "$PROGRAM_ID" --url devnet 2>/dev/null || echo "NOT_FOUND")

if echo "$PROGRAM_EXISTS" | grep -q "NOT_FOUND"; then
  log "Fresh deploy (program not found on devnet)..."
  DEPLOY_MODE="fresh"
else
  log "Program already deployed — this is an UPGRADE"
  log "Current on-chain info:"
  solana program show "$PROGRAM_ID" --url devnet
  DEPLOY_MODE="upgrade"

  # For upgrade: extend program buffer if .so is larger than current allocation
  SO_SIZE=$(wc -c < "$SO_FILE")
  log "New .so size: ${SO_SIZE} bytes ($(echo "scale=1; $SO_SIZE/1024" | bc) KB)"
  log "Extending program data account to fit new binary..."
  solana program extend "$PROGRAM_ID" 50000 --url devnet 2>/dev/null || warn "Extend skipped (may already be large enough)"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 7. Deploy / Upgrade
# ──────────────────────────────────────────────────────────────────────────────
log "Deploying to devnet (mode: $DEPLOY_MODE)..."

solana program deploy "$SO_FILE" \
  --program-id "$KEYPAIR_PATH" \
  --url https://api.devnet.solana.com

ok "Program deployed to devnet! ID: $PROGRAM_ID"
solana program show "$PROGRAM_ID" --url devnet

# ──────────────────────────────────────────────────────────────────────────────
# 8. Copy IDL to SDK (if anchor build was used)
# ──────────────────────────────────────────────────────────────────────────────
IDL_JSON="target/idl/pot_vault.json"
IDL_TS="../../packages/sdk/src/idl/pot_vault.ts"

if [ -f "$IDL_JSON" ]; then
  log "Copying IDL to SDK..."
  IDL_CONTENT=$(cat "$IDL_JSON")
  cat > "$IDL_TS" << TSEOF
// Auto-generated by deploy.sh — do not edit manually
// Source: packages/program/target/idl/pot_vault.json
export const IDL = ${IDL_CONTENT} as const
export type PotVault = typeof IDL
TSEOF
  ok "IDL synced to $IDL_TS"
else
  warn "No IDL found at $IDL_JSON — SDK IDL not updated"
  warn "Run 'anchor build' to generate IDL, then re-run deploy.sh"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 9. Write frontend .env.local
# ──────────────────────────────────────────────────────────────────────────────
ENV_FILE="../../apps/web/.env.local"
log "Writing frontend env to $ENV_FILE..."

cat > "$ENV_FILE" << EOF
# Auto-generated by deploy.sh — $(date)
NEXT_PUBLIC_PROGRAM_ID=${PROGRAM_ID}
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
EOF

ok "Frontend env written: $ENV_FILE"

# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN} ✅ PotBot deployed to devnet!${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo ""
echo "  Program ID : $PROGRAM_ID"
echo "  Explorer   : https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "  Next steps:"
echo "    cd ../../apps/web && npm run dev"
echo "    Open http://localhost:3000 — DApp will auto-switch to on-chain mode"
echo ""
echo "  E2E test:"
echo "    cd ../../ && npx ts-node scripts/e2e-devnet.ts"
echo ""
