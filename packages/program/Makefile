# PotBot v2 — pot_vault Anchor program build helpers.
#
# `anchor build` is intentionally NOT the canonical command — it triggers
# the IDL generator which is broken with anchor-syn 0.30.x on any rustc
# new enough to bring an edition2024-aware Cargo (see rust-toolchain.toml
# for the full story). Use `make build` instead.

.PHONY: build deploy sync-idl clean

PROGRAM_NAME := pot_vault
SDK_IDL      := ../sdk/src/idl/$(PROGRAM_NAME).json
WEB_IDL      := ../../apps/web/src/idl/$(PROGRAM_NAME).json
KEEPER_IDL   := ../../apps/keeper/src/idl/$(PROGRAM_NAME).json
TARGET_IDL   := target/idl/$(PROGRAM_NAME).json

# Build the on-chain binary via the Solana SBF toolchain (skips IDL gen,
# which is the path that explodes on modern rustc).
build:
	cargo build-sbf --manifest-path programs/$(PROGRAM_NAME)/Cargo.toml

# Devnet deploy. Set CLUSTER=mainnet-beta to override.
CLUSTER ?= devnet
deploy: build
	solana program deploy \
	  --program-id target/deploy/$(PROGRAM_NAME)-keypair.json \
	  --url $(CLUSTER) \
	  target/deploy/$(PROGRAM_NAME).so

# Copy the canonical IDL to every consumer. Run this after any
# instruction or account shape change. The source-of-truth IDL is the
# hand-vendored one in packages/sdk/src/idl/ until the toolchain dead-
# end is fixed and anchor build emits a fresh target/idl/.
sync-idl:
	@if [ -f $(TARGET_IDL) ]; then \
	  echo "syncing IDL from $(TARGET_IDL) → consumers"; \
	  cp $(TARGET_IDL) $(SDK_IDL); \
	else \
	  echo "no $(TARGET_IDL) — using hand-vendored $(SDK_IDL) as source of truth"; \
	fi
	cp $(SDK_IDL) $(WEB_IDL)
	cp $(SDK_IDL) $(KEEPER_IDL)
	@echo "done. IDL synced to sdk/web/keeper."

clean:
	cargo clean
