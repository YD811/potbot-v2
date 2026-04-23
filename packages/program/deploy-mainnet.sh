#!/usr/bin/env bash
# =============================================================================
# PotBot v2 — MAINNET deploy script
# =============================================================================
# Safety-first variant of deploy.sh. Enforces:
#   - Interactive confirmation
#   - Minimum SOL balance (5 SOL)
#   - Helius RPC (public mainnet rate-limits kill deploys)
#   - Separate program keypair at target/deploy/pot_vault-mainnet.json
#   - Post-deploy verification via solana program show
#
# Usage:
#   cd packages/program
#   bash deploy-mainnet.sh
#
# Pre-requisites:
#   1. solana-cli 1.18+  (anza install)
#   2. anchor 0.30+
#   3. ~/.config/solana/id.json funded with ≥5 SOL on mainnet
#   4. $HELIUS_MAINNET_RPC env exported (or provide via prompt)
#   5. target/deploy/pot_vault-mainnet.json generated and backed up OFFLINE
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[mainnet]${NC} $1"; }
ok()   { echo -e "${GREEN}[ ok ]${NC}    $1"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $1"; }
err()  { echo -e "${RED}[err!]${NC}  $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Config ──────────────────────────────────────────────────────────────────
KEYPAIR_PATH="target/deploy/pot_vault-mainnet.json"
SO_FILE="target/deploy/pot_vault.so"
MIN_SOL=5
RPC_URL="${HELIUS_MAINNET_RPC:-}"

# ── Big red warning ─────────────────────────────────────────────────────────
cat <<'EOF'

████████████████████████████████████████████████████████████████████████████
█                                                                          █
█   ⚠️  MAINNET DEPLOYMENT — real funds, no rollback button                █
█                                                                          █
█   Before proceeding, confirm YOU:                                        █
█     (1) ran anchor tests on devnet and they pass                         █
█     (2) completed an internal code review of pot_vault                   █
█     (3) backed up target/deploy/pot_vault-mainnet.json OFFLINE           █
█     (4) have ≥ 5 SOL on your deployer wallet for rent + fees             █
█     (5) own the Squads vault that will become pot authority              █
█         (or accept raw-keypair authority as a temporary measure)         █
█                                                                          █
████████████████████████████████████████████████████████████████████████████

EOF

read -r -p "Type 'MAINNET' to confirm, anything else to abort: " CONFIRM
[[ "$CONFIRM" == "MAINNET" ]] || err "Aborted."

# ── Prereqs ────────────────────────────────────────────────────────────────
log "Checking prerequisites..."
command -v solana >/dev/null         || err "solana CLI not installed"
command -v anchor >/dev/null         || err "anchor not installed"
command -v solana-keygen >/dev/null  || err "solana-keygen not installed"

# ── Keypair ────────────────────────────────────────────────────────────────
if [[ ! -f "$KEYPAIR_PATH" ]]; then
  err "Program keypair not found at $KEYPAIR_PATH.
  Generate + back up:
    solana-keygen new -o $KEYPAIR_PATH --no-bip39-passphrase
    solana-keygen pubkey $KEYPAIR_PATH
  Then copy that pubkey into Anchor.toml [programs.mainnet] and into
  declare_id!() in src/lib.rs, rebuild, re-run this script."
fi

PROGRAM_ID=$(solana-keygen pubkey "$KEYPAIR_PATH")
ok "Program keypair ok — $PROGRAM_ID"

# Sanity: declare_id! in lib.rs matches the mainnet keypair?
DECLARED=$(grep -E 'declare_id!' programs/pot_vault/src/lib.rs | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
if [[ "$DECLARED" != "$PROGRAM_ID" ]]; then
  warn "declare_id! in lib.rs ($DECLARED) differs from mainnet keypair ($PROGRAM_ID)."
  warn "This is EXPECTED on the first mainnet build — updating lib.rs + Anchor.toml..."
  sed -i.bak -E "s|declare_id!\(\"[^\"]+\"\)|declare_id!(\"$PROGRAM_ID\")|" \
    programs/pot_vault/src/lib.rs
  sed -i.bak -E "/\[programs\.mainnet\]/,/^\[/ s|pot_vault = \"[^\"]+\"|pot_vault = \"$PROGRAM_ID\"|" \
    Anchor.toml
  ok "Synced declare_id! + Anchor.toml → $PROGRAM_ID"
fi

# ── RPC ────────────────────────────────────────────────────────────────────
if [[ -z "$RPC_URL" ]]; then
  read -r -p "Helius mainnet RPC URL (https://mainnet.helius-rpc.com/?api-key=…): " RPC_URL
  [[ -n "$RPC_URL" ]] || err "RPC required — public mainnet RPC will rate-limit the deploy."
fi

case "$RPC_URL" in
  *api.mainnet-beta.solana.com*)
    warn "Public RPC detected. This WILL fail on a 250KB program under load."
    read -r -p "Continue anyway? [y/N]: " YN
    [[ "$YN" == "y" || "$YN" == "Y" ]] || err "Aborted. Use Helius/QuickNode."
    ;;
esac

solana config set --url "$RPC_URL" >/dev/null
ok "RPC: $(solana config get | grep 'RPC URL')"

# ── Balance ────────────────────────────────────────────────────────────────
DEPLOYER=$(solana address)
BALANCE=$(solana balance --url "$RPC_URL" | awk '{print $1}' | cut -d. -f1)
log "Deployer: $DEPLOYER"
log "Balance:  ${BALANCE} SOL"

if [[ "${BALANCE:-0}" -lt "$MIN_SOL" ]]; then
  err "Need ≥ ${MIN_SOL} SOL. Fund $DEPLOYER first."
fi
ok "Balance check passed"

# ── Build ──────────────────────────────────────────────────────────────────
log "Building program..."
anchor build 2>&1 | tail -20

[[ -f "$SO_FILE" ]] || err "Build produced no $SO_FILE — check errors above."
SIZE=$(wc -c < "$SO_FILE")
ok "Build ok — ${SIZE} bytes ($(echo "scale=1; $SIZE/1024" | bc) KB)"

# ── Pre-flight summary ─────────────────────────────────────────────────────
cat <<EOF

─────────────────────────────────────────────────────────────
 READY TO DEPLOY
─────────────────────────────────────────────────────────────
 Program ID : $PROGRAM_ID
 Deployer   : $DEPLOYER
 Balance    : ${BALANCE} SOL
 Binary     : $(echo "scale=1; $SIZE/1024" | bc) KB
 RPC        : $(echo "$RPC_URL" | sed 's|api-key=[^&]*|api-key=***|')
─────────────────────────────────────────────────────────────

EOF

read -r -p "Deploy to MAINNET? Type 'yes' to proceed: " FINAL
[[ "$FINAL" == "yes" ]] || err "Aborted at final confirmation."

# ── Deploy ─────────────────────────────────────────────────────────────────
log "Deploying... this takes 30-90s"
solana program deploy "$SO_FILE" \
  --program-id "$KEYPAIR_PATH" \
  --url "$RPC_URL"

ok "Deployed!"

log "Verifying on-chain..."
solana program show "$PROGRAM_ID" --url "$RPC_URL"

# ── Copy IDL to SDK + web ──────────────────────────────────────────────────
IDL_JSON="target/idl/pot_vault.json"
if [[ -f "$IDL_JSON" ]]; then
  IDL_CONTENT=$(cat "$IDL_JSON")
  cat > "../../packages/sdk/src/idl/pot_vault.ts" <<TSEOF
// Auto-generated by deploy-mainnet.sh — do not edit manually
// Source: packages/program/target/idl/pot_vault.json
export const IDL = ${IDL_CONTENT} as const
export default IDL
export type PotVault = typeof IDL
TSEOF
  ok "IDL synced to packages/sdk/src/idl/pot_vault.ts"
fi

# ── Write mainnet env ──────────────────────────────────────────────────────
cat > ../../apps/web/.env.mainnet.local <<EOF
# Auto-generated by deploy-mainnet.sh — $(date)
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_RPC_URL=$RPC_URL
NEXT_PUBLIC_PROGRAM_ID=$PROGRAM_ID
EOF
ok "Wrote apps/web/.env.mainnet.local"

cat <<EOF

═════════════════════════════════════════════════════════════
  ✅ MAINNET DEPLOY COMPLETE
═════════════════════════════════════════════════════════════

  Program  : $PROGRAM_ID
  Explorer : https://solscan.io/account/$PROGRAM_ID
  Solana FM: https://solana.fm/address/$PROGRAM_ID

  Next steps:
    1. Commit Anchor.toml + lib.rs (declare_id! updated) + IDL
    2. Set Vercel env variables:
         NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
         NEXT_PUBLIC_RPC_URL=$RPC_URL   (in Dashboard, not vercel.json!)
         NEXT_PUBLIC_PROGRAM_ID=$PROGRAM_ID
    3. Run seed: pnpm tsx scripts/seed-mainnet-pots.ts
    4. Hand off program-upgrade authority to Squads vault:
         solana program set-upgrade-authority $PROGRAM_ID \\
           --new-upgrade-authority <SQUADS_VAULT_PDA> \\
           --url $RPC_URL

═════════════════════════════════════════════════════════════

EOF
