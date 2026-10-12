#!/usr/bin/env bash
# Build pot_index for SBPF v0 (what LiteSVM 0.10 can load) and run the full test suite twice:
# with `--features mainnet` (mainnet USDC pinned), then with the default devnet build last, so the
# .so left in target/deploy matches a plain `cargo test`.
# Deployable artifacts use the default `anchor build` (SBPF v3).
set -euo pipefail
cd "$(dirname "$0")"
for features in mainnet ""; do
  args=()
  if [ -n "$features" ]; then args=(--features "$features"); fi
  cargo build-sbf --arch v0 --manifest-path programs/pot_index/Cargo.toml --sbf-out-dir target/deploy ${args[@]+"${args[@]}"}
  cargo test ${args[@]+"${args[@]}"} "$@"
done
