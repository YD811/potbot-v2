#!/usr/bin/env bash
# =============================================================================
# PotBot v2 — Devnet Deploy Script
# =============================================================================
# Requirements:
#   - Rust:    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
#   - Solana:  sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
#   - Anchor:  cargo install --git https://github.com/coral-xyz/anchor avm --locked
#              avm install 0.30.1 && avm use 0.30.1
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

# ──────────────────────────────────────────────────────────────────────────────
# 1. Check prerequisites
# ──────────────────────────────────────────────────────────────────────────────
log "Checking prerequisites..."
command -v solana        &>/dev/null || err "Solana CLI not found. Install: sh -c \"$(curl -sSfL https://release.anza.xyz/stable/install)\""
command -v solana-keygen &>/dev/null || err "solana-keygen not found (should come with Solana CLI)"
command -v cargo         &>/dev/null || err "Rust/Cargo not found. Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
ok "All prerequisites found"

# ──────────────────────────────────────────────────────────────────────────────
# 2. Configure Solana CLI for devnet
# ──────────────────────────────────────────────────────────────────────────────
log "Configuring Solana CLI for devnet..."
solana config set --url https://api.devnet.solana.com

# Check keypair
if [ ! -f ~/.config/solana/id.json ]; then
  warn "No keypair found at ~/.config/solana/id.json"
  log "Generating new keypair..."
  solana-keygen new --outfile ~/.config/solana/id.json --no-bip39-passphrase
fi

DEPLOYER=$(solana address)
log "Deployer wallet: $DEPLOYER"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Airdrop SOL if needed (devnet)
# ──────────────────────────────────────────────────────────────────────────────
BALANCE=$(solana balance --url devnet | awk '{print $1}' | cut -d. -f1)
log "Current balance: ${BALANCE} SOL"

if [ "$BALANCE" -lt 3 ] 2>/dev/null; then
  log "Balance low, requesting airdrop..."
  solana airdrop 4 --url devnet || warn "Airdrop failed (rate limited). Get SOL at: https://faucet.solana.com"
  sleep 5
  NEW_BAL=$(solana balance --url devnet | awk '{print $1}' | cut -d. -f1)
  if [ "$NEW_BAL" -lt 1 ] 2>/dev/null; then
    err "Insufficient SOL. Fund $DEPLOYER via https://faucet.solana.com then re-run."
  fi
  solana balance --url devnet
fi

# ──────────────────────────────────────────────────────────────────────────────
# 4. Build with cargo build-sbf
#    IDL generation may fail on stable Rust (anchor-syn/proc_macro2 issue) —
#    that is OK: we only need the compiled .so for deployment.
# ──────────────────────────────────────────────────────────────────────────────
log "Building program with cargo build-sbf..."
cargo build-sbf --manifest-path programs/pot_vault/Cargo.toml || true

SO_FILE="target/deploy/pot_vault.so"
if [ ! -f "$SO_FILE" ]; then
  err "Build failed — $SO_FILE not found. Check compile errors above."
fi
ok "Build successful — $(ls -sh $SO_FILE | awk '{print $1}') .so ready"

# ──────────────────────────────────────────────────────────────────────────────
# 5. Verify / fix program ID
# ──────────────────────────────────────────────────────────────────────────────
KEYPAIR_PATH="target/deploy/pot_vault-keypair.json"
HARDCODED_ID="Hyi1PNxPMUqwdDukhB2a4fvcBxQHmbXy3CZ95mgyFHA3"

if [ ! -f "$KEYPAIR_PATH" ]; then
  warn "No program keypair found — generating one..."
  solana-keygen new --outfile "$KEYPAIR_PATH" --no-bip39-passphrase
fi

ACTUAL_ID=$(solana-keygen pubkey "$KEYPAIR_PATH")
log "Program keypair ID: $ACTUAL_ID"

if [ "$ACTUAL_ID" != "$HARDCODED_ID" ]; then
  warn "Program ID mismatch!"
  warn "  Keypair ID : $ACTUAL_ID"
  warn "  Hardcoded  : $HARDCODED_ID"
  warn "Patching declare_id! in lib.rs and Anchor.toml..."
  sed -i.bak "s/$HARDCODED_ID/$ACTUAL_ID/g" programs/pot_vault/src/lib.rs
  sed -i.bak "s/$HARDCODED_ID/$ACTUAL_ID/g" Anchor.toml
  log "Rebuilding with corrected program ID..."
  cargo build-sbf --manifest-path programs/pot_vault/Cargo.toml || true
  if [ ! -f "$SO_FILE" ]; then
    err "Rebuild failed — $SO_FILE not found."
  fi
  ok "Rebuild successful"
  PROGRAM_ID="$ACTUAL_ID"
else
  ok "Program ID matches: $HARDCODED_ID"
  PROGRAM_ID="$HARDCODED_ID"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 6. Deploy
# ──────────────────────────────────────────────────────────────────────────────
log "Deploying to devnet..."
solana program deploy "$SO_FILE" \
  --program-id "$KEYPAIR_PATH" \
  --url https://api.devnet.solana.com
ok "Program deployed to devnet!"

# ──────────────────────────────────────────────────────────────────────────────
# 7. Write frontend .env.local
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
echo -e "${GREEN} PotBot deployed to devnet!${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo ""
echo "  Program ID : $PROGRAM_ID"
echo "  Explorer   : https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "  Next steps:"
echo "    cd ../../apps/web && npm run dev"
echo "    Open http://localhost:3000"
echo ""
