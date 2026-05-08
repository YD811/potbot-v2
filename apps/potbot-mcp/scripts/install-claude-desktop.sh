#!/usr/bin/env bash
# Install @potbot/mcp into Claude Desktop's claude_desktop_config.json.
#
# Usage:
#   apps/potbot-mcp/scripts/install-claude-desktop.sh [--build] [--merge] [--name NAME]
#                                                    [--config PATH] [--use-node]
#                                                    [--api-url URL] [--network NET]
#                                                    [--dry-run]
#
# Flags:
#   --build         Run `npm install && npm run build` in apps/potbot-mcp first,
#                   then register the local `dist/index.js` instead of `npx`.
#   --merge         Merge into the existing claude_desktop_config.json
#                   (default: error if a `potbot` entry already exists).
#   --name NAME     mcpServers key to register under (default: potbot).
#   --config PATH   Override claude_desktop_config.json path.
#   --use-node      Force using local `dist/index.js` via node (implied by --build).
#   --api-url URL   POTBOT_API_URL env (default: https://api.potbot.fun).
#   --network NET   SOLANA_NETWORK env: devnet | mainnet-beta (default: devnet).
#   --dry-run       Print the resulting config to stdout and exit (no write).
#
# Default behaviour (no flags) registers the published npm package via
# `npx -y @potbot/mcp`. Existing config is preserved; the script refuses to
# overwrite an existing `potbot` server entry unless --merge is passed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BUILD=0
MERGE=0
USE_NODE=0
DRY_RUN=0
SERVER_NAME="potbot"
CONFIG_PATH=""
API_URL="https://api.potbot.fun"
NETWORK="devnet"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build)     BUILD=1; USE_NODE=1; shift ;;
    --merge)     MERGE=1; shift ;;
    --use-node)  USE_NODE=1; shift ;;
    --dry-run)   DRY_RUN=1; shift ;;
    --name)      SERVER_NAME="${2:?--name requires a value}"; shift 2 ;;
    --config)    CONFIG_PATH="${2:?--config requires a value}"; shift 2 ;;
    --api-url)   API_URL="${2:?--api-url requires a value}"; shift 2 ;;
    --network)   NETWORK="${2:?--network requires a value}"; shift 2 ;;
    -h|--help)
      sed -n '2,32p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
  esac
done

log()  { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m==>\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m==>\033[0m %s\n' "$*" >&2; exit 1; }

# ── Resolve Claude Desktop config path ──────────────────────────────────────
if [[ -z "$CONFIG_PATH" ]]; then
  case "$(uname -s)" in
    Darwin)
      CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
      ;;
    Linux)
      CONFIG_PATH="${XDG_CONFIG_HOME:-$HOME/.config}/Claude/claude_desktop_config.json"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      CONFIG_PATH="${APPDATA:-$HOME/AppData/Roaming}/Claude/claude_desktop_config.json"
      ;;
    *)
      fail "Unsupported platform $(uname -s); pass --config PATH explicitly."
      ;;
  esac
fi

CONFIG_DIR="$(dirname "$CONFIG_PATH")"

# ── Build local package if requested ────────────────────────────────────────
if [[ $BUILD -eq 1 ]]; then
  log "Building @potbot/mcp in $PKG_DIR"
  ( cd "$PKG_DIR" && npm install && npm run build )
fi

# ── Decide server command ───────────────────────────────────────────────────
if [[ $USE_NODE -eq 1 ]]; then
  ENTRY="$PKG_DIR/dist/index.js"
  if [[ ! -f "$ENTRY" ]]; then
    fail "$ENTRY not found. Re-run with --build, or run 'npm run build' in $PKG_DIR."
  fi
  SERVER_CMD="node"
  SERVER_ARGS_JSON="$(printf '[%s]' "$(printf '"%s"' "$ENTRY")")"
  log "Registering local build: node $ENTRY"
else
  SERVER_CMD="npx"
  SERVER_ARGS_JSON='["-y","@potbot/mcp"]'
  log "Registering npm package: npx -y @potbot/mcp"
fi

# ── Build the server entry as JSON via node (no jq dependency) ──────────────
NEW_ENTRY_JSON="$(SERVER_CMD="$SERVER_CMD" \
                  SERVER_ARGS_JSON="$SERVER_ARGS_JSON" \
                  API_URL="$API_URL" \
                  NETWORK="$NETWORK" \
                  node -e '
  const args = JSON.parse(process.env.SERVER_ARGS_JSON);
  const entry = {
    command: process.env.SERVER_CMD,
    args,
    env: {
      POTBOT_API_URL: process.env.API_URL,
      SOLANA_NETWORK: process.env.NETWORK,
    },
  };
  process.stdout.write(JSON.stringify(entry));
')"

# ── Merge or write config ───────────────────────────────────────────────────
mkdir -p "$CONFIG_DIR"

EXISTING_JSON='{}'
if [[ -f "$CONFIG_PATH" ]]; then
  EXISTING_JSON="$(cat "$CONFIG_PATH")"
  # Tolerate empty / whitespace-only files
  if [[ -z "${EXISTING_JSON// }" ]]; then
    EXISTING_JSON='{}'
  fi
fi

MERGED_JSON="$(EXISTING_JSON="$EXISTING_JSON" \
               NEW_ENTRY_JSON="$NEW_ENTRY_JSON" \
               SERVER_NAME="$SERVER_NAME" \
               MERGE="$MERGE" \
               node -e '
  let existing;
  try {
    existing = JSON.parse(process.env.EXISTING_JSON);
  } catch (err) {
    console.error("Existing config is not valid JSON:", err.message);
    process.exit(1);
  }
  if (existing === null || typeof existing !== "object" || Array.isArray(existing)) {
    existing = {};
  }
  const entry = JSON.parse(process.env.NEW_ENTRY_JSON);
  const name = process.env.SERVER_NAME;
  const merge = process.env.MERGE === "1";

  const servers = (existing.mcpServers && typeof existing.mcpServers === "object")
    ? existing.mcpServers
    : {};

  if (servers[name] && !merge) {
    console.error(`A server named "${name}" already exists in the config.`);
    console.error("Re-run with --merge to overwrite that entry, or pass --name to register under a different key.");
    process.exit(1);
  }

  servers[name] = entry;
  existing.mcpServers = servers;
  process.stdout.write(JSON.stringify(existing, null, 2) + "\n");
')"

if [[ $DRY_RUN -eq 1 ]]; then
  log "Dry run — would write to $CONFIG_PATH:"
  printf '%s' "$MERGED_JSON"
  exit 0
fi

if [[ -f "$CONFIG_PATH" ]]; then
  BACKUP="$CONFIG_PATH.bak.$(date +%Y%m%d-%H%M%S)"
  cp "$CONFIG_PATH" "$BACKUP"
  log "Backed up existing config to $BACKUP"
fi

printf '%s' "$MERGED_JSON" > "$CONFIG_PATH"
log "Wrote $CONFIG_PATH"
log "Registered MCP server '$SERVER_NAME'. Restart Claude Desktop to pick it up."
