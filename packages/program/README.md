# pot_vault — PotBot Anchor program

Solana on-chain program that owns every PotBot vault: members, deposits,
proposals, votes, swap execution, yield routing.

## Build

```bash
make build       # → target/deploy/pot_vault.so
make deploy      # devnet by default; CLUSTER=mainnet-beta to override
make sync-idl    # copy IDL to sdk/, web/, keeper/
```

`make build` calls `cargo build-sbf` directly. Do **not** run
`anchor build` — it triggers the broken IDL generator (see toolchain
note below).

## IDL workflow

The IDL is currently **hand-vendored** in
`packages/sdk/src/idl/pot_vault.json` and copied to consumers by
`make sync-idl`. The hand-vendored copy includes the `treasury` account
on `create_pot` that the deployed program requires (see PR #57); a
straight regen from `target/idl/` would lose that patch until the
upstream IDL drift is fixed.

After any instruction or account shape change:

1. Update the SDK IDL by hand to match the program.
2. Run `make sync-idl` so web/ and keeper/ pick up the same JSON.
3. Bump the SDK version (consumers pin by version).

## Toolchain dead-end

`anchor build` calls into the IDL generator (`anchor-syn 0.30.x`),
which uses `proc_macro2::Span::source_file()`. That bottoms out into
the unstable `proc_macro::Span::source_file` stdlib API, removed in
rustc 1.83+.

Pinning the toolchain backwards is not viable either — recent
dependencies require the `edition2024` Cargo feature, only available in
1.83+. There is no rustc that satisfies both ends simultaneously. The
clean fix is to bump `anchor-lang` past 0.30.x, but that needs a
program redeploy and is out of scope mid-hackathon.

For now, `cargo build-sbf` produces the on-chain binary correctly,
which is all the runtime needs. The IDL stays vendored.
