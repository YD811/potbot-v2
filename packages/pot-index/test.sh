#!/usr/bin/env bash
# Build pot_index for SBPF v0 (what LiteSVM 0.10 can load) and run the full test suite.
# Deployable artifacts use the default `anchor build` (SBPF v3).
set -euo pipefail
cd "$(dirname "$0")"
cargo build-sbf --arch v0 --manifest-path programs/pot_index/Cargo.toml --sbf-out-dir target/deploy
cargo test "$@"
