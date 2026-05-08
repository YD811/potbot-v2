#!/usr/bin/env bash
#
# apps/potbot-mcp/scripts/install-claude-desktop.sh
#
# Print a ready-to-paste claude_desktop_config.json snippet that wires the
# locally-built PotBot MCP server into Claude Desktop. By default this
# script is print-only — it never edits Claude's config without your
# consent.
#
# Usage:
#   ./apps/potbot-mcp/scripts/install-claude-desktop.sh             # print config + paste hints
#   ./apps/potbot-mcp/scripts/install-claude-desktop.sh --build     # also run npm run build first
#   ./apps/potbot-mcp/scripts/install-claude-desktop.sh --merge     # back up + merge into Claude's actual config
#
# Env override:
#   RPC_URL=<helius-or-quicknode-url>     prefer Helius over the public devnet RPC
#   AGENT_KEYPAIR=<base58-private-key>    let the server sign txns autonomously

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MCP_DIR="$REPO_ROOT/apps/potbot-mcp"
ENTRY="$MCP_DIR/dist/index.js"
DEFAULT_RPC="https://api.devnet.solana.com"
PROGRAM_ID="GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK"

case "$(uname -s)" in
  Darwin)
    CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    ;;
  Linux)
    CLAUDE_CONFIG="$HOME/.config/Claude/claude_desktop_config.json"
    ;;
  *)
    CLAUDE_CONFIG=""
    ;;
esac

# ── Optional build ────────────────────────────────────────────────────────
DO_BUILD=0
DO_MERGE=0
for arg in "$@"; do
  case "$arg" in
    --build) DO_BUILD=1 ;;
    --merge) DO_MERGE=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

if [[ "$DO_BUILD" -eq 1 ]]; then
  echo "› Building MCP server..."
  ( cd "$MCP_DIR" && npm run build )
  echo
fi

# ── Sanity check ──────────────────────────────────────────────────────────
if [[ ! -f "$ENTRY" ]]; then
  echo "ERROR: $ENTRY does not exist." >&2
  echo "Run with --build, or: cd apps/potbot-mcp && npm run build" >&2
  exit 1
fi

RPC="${RPC_URL:-$DEFAULT_RPC}"
if [[ "$RPC" == "$DEFAULT_RPC" ]]; then
  echo "⚠  Using PUBLIC devnet RPC. For the demo video set RPC_URL to a Helius/QuickNode endpoint."
  echo "    e.g. RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY $0"
  echo
fi

# Build env block. Always include core. AGENT_KEYPAIR added only if set.
ENV_BLOCK=$(cat <<EOF
        "SOLANA_RPC_URL": "$RPC",
        "SOLANA_NETWORK": "devnet",
        "PROGRAM_ID": "$PROGRAM_ID"
EOF
)
if [[ -n "${AGENT_KEYPAIR:-}" ]]; then
  ENV_BLOCK+=",
        \"AGENT_KEYPAIR\": \"$AGENT_KEYPAIR\""
fi

CONFIG_SNIPPET=$(cat <<EOF
{
  "mcpServers": {
    "potbot": {
      "command": "node",
      "args": ["$ENTRY"],
      "env": {
$ENV_BLOCK
      }
    }
  }
}
EOF
)

echo "─── claude_desktop_config.json snippet ─────────────────────────"
echo "$CONFIG_SNIPPET"
echo "─────────────────────────────────────────────────────────────────"
echo
echo "Target file: $CLAUDE_CONFIG"
echo

if [[ "$DO_MERGE" -eq 1 ]]; then
  if [[ -z "$CLAUDE_CONFIG" ]]; then
    echo "ERROR: don't know where Claude Desktop's config lives on this OS." >&2
    exit 1
  fi
  if [[ -f "$CLAUDE_CONFIG" ]]; then
    BACKUP="$CLAUDE_CONFIG.bak.$(date +%s)"
    echo "› Backing up existing config to: $BACKUP"
    cp "$CLAUDE_CONFIG" "$BACKUP"
    if command -v jq >/dev/null 2>&1; then
      MERGED=$(jq -s '.[0] * .[1]' "$CLAUDE_CONFIG" <(echo "$CONFIG_SNIPPET"))
      echo "$MERGED" > "$CLAUDE_CONFIG"
      echo "✓ Merged via jq. Restart Claude Desktop for changes to take effect."
    else
      echo "ERROR: jq not found — required for safe merge. Install via 'brew install jq' or use --print and merge manually." >&2
      exit 1
    fi
  else
    mkdir -p "$(dirname "$CLAUDE_CONFIG")"
    echo "$CONFIG_SNIPPET" > "$CLAUDE_CONFIG"
    echo "✓ Created new config at $CLAUDE_CONFIG. Restart Claude Desktop for changes to take effect."
  fi
else
  echo "Print-only mode. Add --merge to back up + merge into Claude's actual config."
  echo "Or paste the snippet above into:"
  echo "    $CLAUDE_CONFIG"
  echo "(merge with any existing mcpServers entries)."
fi
