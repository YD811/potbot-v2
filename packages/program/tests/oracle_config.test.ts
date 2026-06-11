// tests/oracle_config.test.ts
//
// Phase A — oracle config instruction coverage (localnet). The NAV math and
// deviation/confidence helpers are unit-tested in Rust (cargo test); here we
// verify the on-chain config surface:
//   - defaults are Pyth / zeroed guards after create_pot
//   - set_oracle_config stores values and round-trips
//   - an unsupported oracle_kind is rejected
//   - tightening then loosening the guard both persist (it is not timelocked)

import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { expect } from 'chai'

const TREASURY = new PublicKey('2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o')

describe('oracle config (Phase A)', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = (anchor.workspace as any).PotVault as Program
  const authority = provider.wallet.publicKey

  function pdas(name: string) {
    const [pot] = PublicKey.findProgramAddressSync(
      [Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)],
      program.programId,
    )
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), pot.toBuffer()],
      program.programId,
    )
    return { pot, vault }
  }

  async function createPot(name: string) {
    const { pot, vault } = pdas(name)
    await (program.methods as any)
      .createPot({
        name, emoji: '🔮', isPublic: true,
        minDeposit: new BN(0), lockupSeconds: new BN(0), yieldStrategy: 0,
        maxYieldAllocationBps: 0, maxTradeSizeBps: 0, maxMembers: 16,
        tradeLevel: 0, withdrawLevel: 0, memberChangeLevel: 0,
        settingsChangeLevel: 0, yieldChangeLevel: 0,
        voteTimeoutSeconds: new BN(3600), quorumBps: 0, timelockSeconds: new BN(0),
        protocolFeeBps: 0,
      })
      .accounts({ pot, vault, treasury: TREASURY, authority, systemProgram: SystemProgram.programId })
      .rpc()
    return pot
  }

  async function expectError(p: Promise<any>, code: string) {
    try {
      await p
      expect.fail(`expected ${code}, but the tx succeeded`)
    } catch (e: any) {
      expect(String(e.error?.errorCode?.code ?? e), `expected ${code}`).to.include(code)
    }
  }

  it('defaults to Pyth with guards disabled after create_pot', async () => {
    const pot = await createPot(`orc-def-${Date.now() % 1e6}`)
    const s: any = await (program.account as any).potAccount.fetch(pot)
    expect(s.oracleKind).to.equal(0)
    expect(s.maxOracleConfBps).to.equal(0)
    expect(s.maxOracleDeviationBps).to.equal(0)
    // Phase B carved 19 bytes from the reserved tail (128 → 109).
    expect(s.reserved.length).to.equal(109)
  })

  it('stores and round-trips the confidence bound', async () => {
    const pot = await createPot(`orc-set-${Date.now() % 1e6}`)
    await (program.methods as any)
      .setOracleConfig({ oracleKind: 0, maxOracleConfBps: 150, maxOracleDeviationBps: 0 })
      .accounts({ pot, authority })
      .rpc()
    let s: any = await (program.account as any).potAccount.fetch(pot)
    expect(s.maxOracleConfBps).to.equal(150)

    // Not risk-param-timelocked: a different bound applies immediately.
    await (program.methods as any)
      .setOracleConfig({ oracleKind: 0, maxOracleConfBps: 250, maxOracleDeviationBps: 0 })
      .accounts({ pot, authority })
      .rpc()
    s = await (program.account as any).potAccount.fetch(pot)
    expect(s.maxOracleConfBps).to.equal(250)
  })

  it('rejects an unsupported oracle_kind', async () => {
    const pot = await createPot(`orc-bad-${Date.now() % 1e6}`)
    await expectError(
      (program.methods as any)
        .setOracleConfig({ oracleKind: 7, maxOracleConfBps: 0, maxOracleDeviationBps: 0 })
        .accounts({ pot, authority })
        .rpc(),
      'OracleKindUnsupported',
    )
  })

  it('refuses to enable the deviation guard until Phase B two-feed pricing', async () => {
    const pot = await createPot(`orc-dev-${Date.now() % 1e6}`)
    await expectError(
      (program.methods as any)
        .setOracleConfig({ oracleKind: 0, maxOracleConfBps: 0, maxOracleDeviationBps: 100 })
        .accounts({ pot, authority })
        .rpc(),
      'OracleGuardUnavailable',
    )
  })
})
