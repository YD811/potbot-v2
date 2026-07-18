// tests/index_vault.test.ts
//
// Index-vault layer (flagship POT-1) — localnet coverage:
//   - init_allowlist / init_strategy_config bootstrap
//   - deposit_base: bootstrap 1:1, second deposit at NAV, caps
//   - redeem_instant from the idle buffer
//   - deploy_to_strategy: keeper auth + idle-buffer floor
//   - request_redeem → settle_redeem queue roundtrip
//   - update_nav_snapshot: keeper allowlist + deviation guard
//
// Base mint is a local fake USDC (6 decimals) minted by the test wallet.

import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  getMint,
  mintTo,
} from '@solana/spl-token'
import { expect } from 'chai'

const TREASURY = new PublicKey('2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o')
const USDC = (n: number) => new BN(Math.round(n * 1e6))

describe('index vault (flagship POT-1)', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = (anchor.workspace as any).PotVault as Program
  const authority = provider.wallet.publicKey
  const payer = (provider.wallet as any).payer as Keypair

  let baseMint: PublicKey
  let authorityBaseAta: PublicKey
  let pot: PublicKey
  let vault: PublicKey
  let config: PublicKey
  let indexMint: PublicKey
  let vaultBaseAta: PublicKey
  let vaultIndexAta: PublicKey
  let allowlist: PublicKey
  const keeper = Keypair.generate()

  function findPda(seeds: (Buffer | Uint8Array)[]) {
    return PublicKey.findProgramAddressSync(seeds, program.programId)[0]
  }

  async function expectError(p: Promise<any>, code: string) {
    try {
      await p
      expect.fail(`expected ${code}, but the tx succeeded`)
    } catch (e: any) {
      expect(String(e.error?.errorCode?.code ?? e), `expected ${code}`).to.include(code)
    }
  }

  async function navUpdate(valueBase: BN, signer: Keypair | null = null) {
    const m = (program.methods as any)
      .updateNavSnapshot(valueBase)
      .accounts({ pot, config, keeper: signer ? signer.publicKey : authority })
    if (signer) m.signers([signer])
    return m.rpc()
  }

  before(async () => {
    // fund the keeper for its cranks
    await provider.connection.requestAirdrop(keeper.publicKey, 2e9)

    // local fake USDC
    baseMint = await createMint(provider.connection, payer, authority, null, 6)
    authorityBaseAta = (
      await getOrCreateAssociatedTokenAccount(provider.connection, payer, baseMint, authority)
    ).address
    await mintTo(provider.connection, payer, baseMint, authorityBaseAta, payer, 1_000_000e6)

    // pot
    const name = `idx-${Date.now() % 1e6}`
    pot = findPda([Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)])
    vault = findPda([Buffer.from('vault'), pot.toBuffer()])
    await (program.methods as any)
      .createPot({
        name, emoji: '🏦', isPublic: true,
        minDeposit: new BN(0), lockupSeconds: new BN(0), yieldStrategy: 0,
        maxYieldAllocationBps: 0, maxTradeSizeBps: 0, maxMembers: 16,
        tradeLevel: 0, withdrawLevel: 0, memberChangeLevel: 0,
        settingsChangeLevel: 0, yieldChangeLevel: 0,
        voteTimeoutSeconds: new BN(3600), quorumBps: 0, timelockSeconds: new BN(0),
        protocolFeeBps: 0,
      })
      .accounts({ pot, vault, treasury: TREASURY, authority, systemProgram: SystemProgram.programId })
      .rpc()

    config = findPda([Buffer.from('strategy'), pot.toBuffer()])
    indexMint = findPda([Buffer.from('index_mint'), pot.toBuffer()])
    allowlist = findPda([Buffer.from('allowlist')])
    vaultBaseAta = getAssociatedTokenAddressSync(baseMint, vault, true)
    vaultIndexAta = getAssociatedTokenAddressSync(indexMint, vault, true)
  })

  it('bootstraps allowlist + strategy config + index mint', async () => {
    // global allowlist may survive across suite runs on a shared validator
    const existing = await provider.connection.getAccountInfo(allowlist)
    if (!existing) {
      await (program.methods as any)
        .initAllowlist([{ mint: baseMint, class: { stable: {} } }])
        .accounts({ allowlist, authority, systemProgram: SystemProgram.programId })
        .rpc()
    } else {
      await (program.methods as any)
        .setAllowlist([{ mint: baseMint, class: { stable: {} } }])
        .accounts({ allowlist, authority })
        .rpc()
    }

    await (program.methods as any)
      .initIndexMint()
      .accounts({
        pot, vault, indexMint, authority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    await (program.methods as any)
      .initStrategyConfig({
        keeper: keeper.publicKey,
        weights: [{ mint: baseMint, weightBps: 10000, route: { hold: {} } }],
        bandBps: 500,
        maxSlippageBps: 100,
        idleBufferBps: 1000, // 10%
        tvlCap: USDC(50_000),
        depositMin: USDC(1),
        depositMax: USDC(5_000),
        navStalenessSlots: new BN(10_000),
        maxNavDeviationBps: 2000, // 20%
        isFlagship: true,
      })
      .accounts({
        pot, config, indexMint, baseMint, allowlist, authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    // vault ATAs are created client-side (owner is a PDA → off-curve)
    await getOrCreateAssociatedTokenAccount(provider.connection, payer, baseMint, vault, true)
    await getOrCreateAssociatedTokenAccount(provider.connection, payer, indexMint, vault, true)

    const c: any = await (program.account as any).strategyConfig.fetch(config)
    expect(c.keeper.toBase58()).to.equal(keeper.publicKey.toBase58())
    expect(c.weightsCount).to.equal(1)
    expect(c.idleBufferBps).to.equal(1000)

    const p: any = await (program.account as any).potAccount.fetch(pot)
    expect(p.indexMint.toBase58()).to.equal(indexMint.toBase58())
    expect(p.isFlagship).to.equal(true)

    const mintInfo = await getMint(provider.connection, indexMint)
    expect(mintInfo.decimals).to.equal(6)
    expect(mintInfo.mintAuthority?.toBase58()).to.equal(vault.toBase58())
  })

  it('rejects weights that do not sum to 100%', async () => {
    await expectError(
      (program.methods as any)
        .updateStrategyConfig({
          keeper: null, weights: [{ mint: baseMint, weightBps: 9000, route: { hold: {} } }],
          bandBps: null, maxSlippageBps: null, idleBufferBps: null,
          tvlCap: null, depositMin: null, depositMax: null,
          navStalenessSlots: null, maxNavDeviationBps: null,
        })
        .accounts({ pot, config, allowlist, authority })
        .rpc(),
      'WeightsMustSumTo100',
    )
  })

  const depositorIndexAta = () => getAssociatedTokenAddressSync(indexMint, authority)

  async function deposit(amount: BN, minShares: BN = new BN(0)) {
    return (program.methods as any)
      .depositBase(amount, minShares)
      .accounts({
        pot, config, vault, vaultBaseAta, indexMint, baseMint,
        depositor: authority,
        depositorBaseAta: authorityBaseAta,
        depositorIndexAta: depositorIndexAta(),
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }

  it('bootstrap deposit mints 1 share per base unit', async () => {
    await deposit(USDC(1_000))
    const bal = await getAccount(provider.connection, depositorIndexAta())
    expect(bal.amount.toString()).to.equal(USDC(1_000).toString())

    const p: any = await (program.account as any).potAccount.fetch(pot)
    expect(p.navSnapshot.valueBase.toString()).to.equal(USDC(1_000).toString())
  })

  it('enforces deposit min/max caps', async () => {
    await expectError(deposit(USDC(0.5)), 'DepositBelowMin')
    await expectError(deposit(USDC(5_001)), 'DepositAboveCap')
  })

  it('second deposit at unchanged NAV keeps price 1:1', async () => {
    await deposit(USDC(500))
    const bal = await getAccount(provider.connection, depositorIndexAta())
    expect(bal.amount.toString()).to.equal(USDC(1_500).toString())
  })

  it('keeper NAV bump reprices the next deposit', async () => {
    // NAV 1500 → 1650 (+10%, inside the 20% deviation cap)
    await navUpdate(USDC(1_650), keeper)
    await deposit(USDC(110)) // 110 / 1.1 = 100 shares
    const bal = await getAccount(provider.connection, depositorIndexAta())
    expect(bal.amount.toString()).to.equal(USDC(1_600).toString())
  })

  it('rejects NAV updates from a non-keeper', async () => {
    const rando = Keypair.generate()
    await provider.connection.requestAirdrop(rando.publicKey, 1e9)
    await new Promise((r) => setTimeout(r, 800))
    await expectError(navUpdate(USDC(9_999), rando), 'UnauthorizedKeeper')
  })

  it('rejects a NAV jump beyond the deviation cap', async () => {
    await expectError(navUpdate(USDC(3_000), keeper), 'NavDeviationTooHigh')
  })

  it('redeem_instant pays from the idle buffer at NAV', async () => {
    const before = await getAccount(provider.connection, authorityBaseAta)
    await (program.methods as any)
      .redeemInstant(USDC(100), USDC(100))
      .accounts({
        pot, config, vault, vaultBaseAta, indexMint, baseMint,
        member: authority,
        memberIndexAta: depositorIndexAta(),
        memberBaseAta: authorityBaseAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc()
    const after = await getAccount(provider.connection, authorityBaseAta)
    // NAV/share is 1.1 → 100 shares pay 110 base
    expect((after.amount - before.amount).toString()).to.equal(USDC(110).toString())
  })

  it('deploy_to_strategy: non-keeper is rejected, keeper works, buffer floor holds', async () => {
    const rando = Keypair.generate()
    await provider.connection.requestAirdrop(rando.publicKey, 1e9)
    await new Promise((r) => setTimeout(r, 800))

    const position = findPda([
      Buffer.from('position'), pot.toBuffer(), baseMint.toBuffer(), Buffer.from([0]),
    ])
    const positionVault = findPda([
      Buffer.from('position_vault'), pot.toBuffer(), baseMint.toBuffer(), Buffer.from([0]),
    ])
    // one-time leg bootstrap (keeper): position record, then escrow
    await (program.methods as any)
      .initPosition({ hold: {} })
      .accounts({
        pot, config, vault, baseMint, legMint: baseMint, position,
        keeper: keeper.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([keeper])
      .rpc()
    await (program.methods as any)
      .initPositionVault({ hold: {} })
      .accounts({
        pot, config, vault, baseMint, legMint: baseMint, positionVault,
        keeper: keeper.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([keeper])
      .rpc()

    const accounts = {
      pot, config, allowlist, vault, vaultBaseAta, baseMint,
      legMint: baseMint, position, positionVault,
      keeper: keeper.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    }

    await expectError(
      (program.methods as any)
        .deployToStrategy({ hold: {} }, USDC(100))
        .accounts({ ...accounts, keeper: rando.publicKey })
        .signers([rando])
        .rpc(),
      'UnauthorizedKeeper',
    )

    // vault base ≈ 1500+110-110 = 1500; NAV 1650 → floor 10% = 165.
    // Deploying everything must trip the buffer guard…
    await expectError(
      (program.methods as any)
        .deployToStrategy({ hold: {} }, USDC(1_450))
        .accounts(accounts)
        .signers([keeper])
        .rpc(),
      'InsufficientIdleBuffer',
    )

    // …while a sized deploy passes.
    await (program.methods as any)
      .deployToStrategy({ hold: {} }, USDC(1_000))
      .accounts(accounts)
      .signers([keeper])
      .rpc()

    const pos: any = await (program.account as any).strategyPosition.fetch(position)
    expect(pos.deployedBase.toString()).to.equal(USDC(1_000).toString())
    const pv = await getAccount(provider.connection, positionVault)
    expect(pv.amount.toString()).to.equal(USDC(1_000).toString())

    // withdraw half back
    await (program.methods as any)
      .withdrawFromStrategy({ hold: {} }, USDC(500))
      .accounts({
        pot, config, vault, vaultBaseAta, baseMint,
        legMint: baseMint, position, positionVault,
        keeper: keeper.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([keeper])
      .rpc()
    const pos2: any = await (program.account as any).strategyPosition.fetch(position)
    expect(pos2.deployedBase.toString()).to.equal(USDC(500).toString())
  })

  it('request_redeem escrows shares; settle_redeem pays the member', async () => {
    const c: any = await (program.account as any).strategyConfig.fetch(config)
    const request = findPda([
      Buffer.from('redeem'), pot.toBuffer(), authority.toBuffer(),
      Buffer.from(new BN(c.nextRedeemId).toArrayLike(Buffer, 'le', 8)),
    ])

    const sharesBefore = await getAccount(provider.connection, depositorIndexAta())

    await (program.methods as any)
      .requestRedeem(USDC(200), USDC(0))
      .accounts({
        pot, config, vault, vaultIndexAta, indexMint, request,
        member: authority,
        memberIndexAta: depositorIndexAta(),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const sharesAfter = await getAccount(provider.connection, depositorIndexAta())
    expect((sharesBefore.amount - sharesAfter.amount).toString()).to.equal(USDC(200).toString())

    const r1: any = await (program.account as any).redeemRequest.fetch(request)
    expect(r1.status).to.deep.equal({ pending: {} })

    // permissionless crank (keeper settles here)
    const baseBefore = await getAccount(provider.connection, authorityBaseAta)
    await (program.methods as any)
      .settleRedeem()
      .accounts({
        pot, config, vault, vaultBaseAta, vaultIndexAta, indexMint, baseMint,
        request, member: authority, memberBaseAta: authorityBaseAta,
        cranker: keeper.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([keeper])
      .rpc()

    const baseAfter = await getAccount(provider.connection, authorityBaseAta)
    // price/share still 1.1 → 200 shares pay 220 base
    expect((baseAfter.amount - baseBefore.amount).toString()).to.equal(USDC(220).toString())

    // request account is closed after settlement
    const gone = await provider.connection.getAccountInfo(request)
    expect(gone).to.equal(null)
  })

  it('pause blocks deposits but never redemptions', async () => {
    await (program.methods as any)
      .setStrategyPaused(true)
      .accounts({ pot, config, signer: authority })
      .rpc()

    await expectError(deposit(USDC(10)), 'StrategyPaused')

    // redemption still works while paused
    await (program.methods as any)
      .redeemInstant(USDC(10), new BN(0))
      .accounts({
        pot, config, vault, vaultBaseAta, indexMint, baseMint,
        member: authority,
        memberIndexAta: depositorIndexAta(),
        memberBaseAta: authorityBaseAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc()

    await (program.methods as any)
      .setStrategyPaused(false)
      .accounts({ pot, config, signer: authority })
      .rpc()
  })
})
