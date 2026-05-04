# Squads v4 multisig — pot authority handoff

**Why:** mainnet pot `authority` must not be a raw keypair. If YD's laptop is
lost, stolen, or compromised, every pot becomes unrecoverable. Squads v4
provides multi-sig control with proposal-based execution.

**When:** BEFORE first mainnet pot creation. (Task #15 from roadmap.)

## Prereqs

```bash
npm install -g @sqds/cli@latest
solana config set --url mainnet-beta
solana balance   # need ≥ 1 SOL for vault creation + first tx
```

Install the CLI globally; you'll use it a handful of times, not daily.

## 1. Create the Squads vault

```bash
sqds create \
  --name "PotBot Protocol v1" \
  --members YD_PUBKEY:1,COFOUNDER_PUBKEY:1,YDAO_OPS_PUBKEY:1 \
  --threshold 2
```

- **3 members, 2-of-3 threshold** — standard for small teams. Any 2 can
  approve a tx; any single loss does not brick the vault.
- Replace the three pubkeys with real ones. Back up seed phrases
  offline (paper / steel).
- The CLI prints the **vault PDA** (not multisig account — vault). Copy it.
  This is what `authority` will become.

Reference: https://docs.squads.so/main/v/multisig-program-development-docs/getting-started

## 2. Hand off **program upgrade authority**

```bash
solana program set-upgrade-authority \
  <PROGRAM_ID> \
  --new-upgrade-authority <SQUADS_VAULT_PDA> \
  --url mainnet-beta
```

After this, only Squads proposals can upgrade `pot_vault`. Protects against
malicious deploy from a stolen deployer keypair.

## 3. Decide per-pot `authority` policy

Two options:

### Option A — Each pot is its own "mini-Squads"
Pot creator is one member; Y-DAO ops is a second; pot `authority` field is a
pot-specific Squads multisig (2-of-2).

**Pros:** no single point of compromise per pot.
**Cons:** Y-DAO has to co-sign every admin action (pause, allowlist, agent
rotate). Adds friction.

### Option B — Pot `authority` = the protocol Squads vault from step 1
All admin actions go through one Squads for the whole protocol.

**Pros:** one place to manage.
**Cons:** pot creators depend on protocol team to approve admin actions.

**Recommended for v1:** Option B. Pot creators still fully control members /
shares / voting via standard governance; `authority` is only used for
emergency pause + allowlist changes.

## 4. Test on devnet first

```bash
# On devnet, run the same flow with a throwaway 2-of-2 Squads
sqds create --name "PotBot devnet test" --members A:1,B:1 --threshold 2 --cluster devnet

# Create a pot with this vault PDA as authority
# Try to propose + execute a pot_ops action (pause)
# Confirm Squads flow: 1 member proposes → other approves → executes
```

Only after this passes, repeat on mainnet.

## 5. Wire into our code

`packages/program/programs/pot_vault/src/instructions/pot_ops.rs` already
uses `#[account(has_one = authority)]` — works with any signer, including
a Squads vault PDA (Squads signs as the vault via CPI).

No program changes needed. Pot authority is literally "whoever signs as that
pubkey." Squads IS that signer.

## 6. Verify

After handoff, `solana program show <PROGRAM_ID>` should list the Squads
vault PDA as `ProgramData Address upgrade_authority`.

Per-pot: `potAccount.authority` field in our dApp should render the Squads
vault with a 🛡️ badge (safeguarded via Squads).

## Rollback

**You cannot revert program upgrade authority once set.** If Squads vault is
lost (2-of-3 keys gone), the program becomes immutable. This is the correct
trade-off for trustless deployment — judges and users want to see immutable
authority on mainnet.

For the emergency `pause` path, pot_vault has a circuit breaker that works
even if authority is dead: see `EMERGENCY_PAUSE_AUTHORITY` in constants.rs.
Configure before deploy.
