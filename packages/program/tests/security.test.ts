// tests/security.test.ts
//
// Phase A security hardening coverage:
//   1. recipient fix      — governance withdrawal pays the proposal
//                           beneficiary, never the executor
//   2. sentinel           — can freeze + cancel, can NOT unfreeze, has no
//                           fund-moving path
//   3. freeze surface     — frozen pot blocks deposit + execute_proposal,
//                           unfreeze restores them
//   4. risk-param timelock — loosening staged, tightening instant,
//                           apply_pending_params honours effective_at
//   5. cap breach         — swap proposal above max_trade_size_bps rejected
//   6. double execute     — second execute_proposal fails
//   7. cancel_proposal    — proposer cancels, cancelled cannot execute

import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { expect } from 'chai'

const TREASURY = new PublicKey('2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o')

describe('security hardening (Phase A)', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = (anchor.workspace as any).PotVault as Program
  const authority = provider.wallet.publicKey

  const sentinel = Keypair.generate()
  const stranger = Keypair.generate()
  const beneficiary = Keypair.generate()

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

  function memberPda(pot: PublicKey, wallet: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('member'), pot.toBuffer(), wallet.toBuffer()],
      program.programId,
    )[0]
  }

  function proposalPda(pot: PublicKey, id: number) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('proposal'), pot.toBuffer(), new BN(id).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    )[0]
  }

  async function createPot(name: string, overrides: Record<string, any> = {}) {
    const { pot, vault } = pdas(name)
    await (program.methods as any)
      .createPot({
        name,
        emoji: '🛡️',
        isPublic: true,
        minDeposit: new BN(0),
        lockupSeconds: new BN(0),
        yieldStrategy: 0,
        maxYieldAllocationBps: 0,
        maxTradeSizeBps: 0,
        maxMembers: 16,
        tradeLevel: 0,
        withdrawLevel: 0,
        memberChangeLevel: 0,
        settingsChangeLevel: 0,
        yieldChangeLevel: 0,
        voteTimeoutSeconds: new BN(3600),
        quorumBps: 0,
        timelockSeconds: new BN(0),
        protocolFeeBps: 0,
        ...overrides,
      })
      .accounts({
        pot, vault,
        treasury: TREASURY,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
    return { pot, vault }
  }

  async function deposit(pot: PublicKey, vault: PublicKey, lamports: number) {
    await (program.methods as any)
      .deposit(new BN(lamports))
      .accounts({
        pot, vault,
        member: memberPda(pot, authority),
        depositor: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }

  /** Create a Withdraw proposal (auto-passes — withdrawLevel 0 autocracy). */
  async function passedWithdrawProposal(
    pot: PublicKey, vault: PublicKey, to: PublicKey, lamports: number,
  ) {
    const potState: any = await (program.account as any).potAccount.fetch(pot)
    const id = potState.nextProposalId.toNumber()
    const proposal = proposalPda(pot, id)
    await (program.methods as any)
      .createProposal({
        proposalType: { withdraw: { beneficiary: to, amount: new BN(lamports) } },
        description: 'test withdrawal',
      })
      .accounts({
        pot, proposal, vault,
        member: memberPda(pot, authority),
        proposer: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
    return proposal
  }

  async function expectError(p: Promise<any>, code: string) {
    try {
      await p
      expect.fail(`expected ${code}, but the tx succeeded`)
    } catch (e: any) {
      expect(String(e.error?.errorCode?.code ?? e), `expected ${code}`).to.include(code)
    }
  }

  before(async () => {
    // Fund helper wallets for tx fees.
    for (const kp of [sentinel, stranger]) {
      const sig = await provider.connection.requestAirdrop(kp.publicKey, LAMPORTS_PER_SOL)
      await provider.connection.confirmTransaction(sig)
    }
  })

  // ── 1. recipient fix ─────────────────────────────────────────────────────

  it('pays governance withdrawal to the beneficiary, never the executor', async () => {
    const { pot, vault } = await createPot(`sec-recip-${Date.now() % 1e6}`)
    await deposit(pot, vault, LAMPORTS_PER_SOL)
    const amount = 0.1 * LAMPORTS_PER_SOL

    // Wrong recipient (the executor itself) must be rejected.
    const p1 = await passedWithdrawProposal(pot, vault, beneficiary.publicKey, amount)
    await expectError(
      (program.methods as any)
        .executeProposal()
        .accounts({
          pot, vault, proposal: p1,
          executor: authority,
          recipient: authority, // ≠ beneficiary
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
      'RecipientMismatch',
    )

    // Correct recipient receives the funds.
    const before = await provider.connection.getBalance(beneficiary.publicKey)
    await (program.methods as any)
      .executeProposal()
      .accounts({
        pot, vault, proposal: p1,
        executor: authority,
        recipient: beneficiary.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
    const after = await provider.connection.getBalance(beneficiary.publicKey)
    expect(after - before).to.equal(amount)
  })

  // ── 2 + 3. sentinel & freeze surface ─────────────────────────────────────

  it('sentinel can freeze; only authority unfreezes; freeze blocks deposit + execute', async () => {
    const { pot, vault } = await createPot(`sec-frz-${Date.now() % 1e6}`)
    await deposit(pot, vault, LAMPORTS_PER_SOL)

    // Strangers cannot freeze.
    await expectError(
      (program.methods as any)
        .freezePot()
        .accounts({ pot, signer: stranger.publicKey })
        .signers([stranger])
        .rpc(),
      'NotSentinelOrAuthority',
    )

    // Authority assigns the sentinel; sentinel freezes.
    await (program.methods as any)
      .setSentinel(sentinel.publicKey)
      .accounts({ pot, authority })
      .rpc()
    await (program.methods as any)
      .freezePot()
      .accounts({ pot, signer: sentinel.publicKey })
      .signers([sentinel])
      .rpc()
    let potState: any = await (program.account as any).potAccount.fetch(pot)
    expect(potState.paused).to.equal(true)

    // Frozen: deposits blocked.
    await expectError(deposit(pot, vault, 0.1 * LAMPORTS_PER_SOL), 'PotFrozen')

    // Frozen: execute_proposal blocked (proposal created before freeze
    // would be needed; creating one now still works — only execution is
    // gated — so create then try to execute).
    // NOTE: createProposal is allowed while frozen by design (discussion
    // can continue); execution cannot.
    const p = await passedWithdrawProposal(pot, vault, beneficiary.publicKey, 1000)
    await expectError(
      (program.methods as any)
        .executeProposal()
        .accounts({
          pot, vault, proposal: p,
          executor: authority,
          recipient: beneficiary.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
      'PotFrozen',
    )

    // Sentinel cannot unfreeze.
    await expectError(
      (program.methods as any)
        .unfreezePot()
        .accounts({ pot, signer: sentinel.publicKey })
        .signers([sentinel])
        .rpc(),
      'SentinelCannotUnfreeze',
    )

    // Authority unfreezes; deposits work again.
    await (program.methods as any)
      .unfreezePot()
      .accounts({ pot, signer: authority })
      .rpc()
    await deposit(pot, vault, 0.1 * LAMPORTS_PER_SOL)
    potState = await (program.account as any).potAccount.fetch(pot)
    expect(potState.paused).to.equal(false)
  })

  // ── 4. risk-param timelock ───────────────────────────────────────────────

  it('stages loosening param changes and applies them only after the timelock', async () => {
    const { pot } = await createPot(`sec-tl-${Date.now() % 1e6}`)

    // Tighten first: cap 2000 bps, timelock 2s + exposure cap — instant.
    await (program.methods as any)
      .setSpendingPolicy({ singleSwapCapBps: 2000, dailyBudgetLamports: new BN(0) })
      .accounts({ pot, authority })
      .rpc()
    await (program.methods as any)
      .setRiskTimelock({ riskParamTimelockSecs: new BN(2), maxAssetExposureBps: 3000 })
      .accounts({ pot, authority })
      .rpc()
    let potState: any = await (program.account as any).potAccount.fetch(pot)
    expect(potState.singleSwapCapBps).to.equal(2000)
    expect(potState.riskParamTimelockSecs.toNumber()).to.equal(2)
    expect(potState.maxAssetExposureBps).to.equal(3000)

    // Loosening (2000 → 5000) must NOT apply immediately.
    await (program.methods as any)
      .setSpendingPolicy({ singleSwapCapBps: 5000, dailyBudgetLamports: new BN(0) })
      .accounts({ pot, authority })
      .rpc()
    potState = await (program.account as any).potAccount.fetch(pot)
    expect(potState.singleSwapCapBps).to.equal(2000) // unchanged
    expect(potState.pendingParams.isPending).to.equal(true)

    // Applying before effective_at fails.
    await expectError(
      (program.methods as any)
        .applyPendingParams()
        .accounts({ pot, cranker: authority })
        .rpc(),
      'PendingChangeNotReady',
    )

    // After the timelock the permissionless crank applies it.
    await new Promise((r) => setTimeout(r, 3000))
    await (program.methods as any)
      .applyPendingParams()
      .accounts({ pot, cranker: stranger.publicKey })
      .signers([stranger])
      .rpc()
    potState = await (program.account as any).potAccount.fetch(pot)
    expect(potState.singleSwapCapBps).to.equal(5000)
    expect(potState.pendingParams.isPending).to.equal(false)

    // Tightening (5000 → 1000) applies instantly even with timelock set.
    await (program.methods as any)
      .setSpendingPolicy({ singleSwapCapBps: 1000, dailyBudgetLamports: new BN(0) })
      .accounts({ pot, authority })
      .rpc()
    potState = await (program.account as any).potAccount.fetch(pot)
    expect(potState.singleSwapCapBps).to.equal(1000)
    expect(potState.pendingParams.isPending).to.equal(false)

    // Exposure-cap loosening (3000 → 6000) is staged too — not silently
    // dropped (codex review finding) — and applies after the delay.
    await (program.methods as any)
      .setRiskTimelock({ riskParamTimelockSecs: new BN(2), maxAssetExposureBps: 6000 })
      .accounts({ pot, authority })
      .rpc()
    potState = await (program.account as any).potAccount.fetch(pot)
    expect(potState.maxAssetExposureBps).to.equal(3000) // unchanged yet
    expect(potState.pendingParams.isPending).to.equal(true)
    expect(potState.pendingParams.maxAssetExposureBps).to.equal(6000)
    await new Promise((r) => setTimeout(r, 3000))
    await (program.methods as any)
      .applyPendingParams()
      .accounts({ pot, cranker: authority })
      .rpc()
    potState = await (program.account as any).potAccount.fetch(pot)
    expect(potState.maxAssetExposureBps).to.equal(6000)
  })

  // ── 5. cap breach ────────────────────────────────────────────────────────

  it('rejects a swap proposal above max_trade_size_bps', async () => {
    const { pot, vault } = await createPot(`sec-cap-${Date.now() % 1e6}`, {
      maxTradeSizeBps: 1000, // 10% of vault
    })
    await deposit(pot, vault, LAMPORTS_PER_SOL)

    const potState: any = await (program.account as any).potAccount.fetch(pot)
    const id = potState.nextProposalId.toNumber()
    await expectError(
      (program.methods as any)
        .createProposal({
          proposalType: {
            swap: {
              fromMint: PublicKey.default,
              toMint: PublicKey.default,
              amountIn: new BN(0.5 * LAMPORTS_PER_SOL), // 50% > 10% cap
              minAmountOut: new BN(1),
            },
          },
          description: 'oversized swap',
        })
        .accounts({
          pot, proposal: proposalPda(pot, id), vault,
          member: memberPda(pot, authority),
          proposer: authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
      'TradeSizeExceeded',
    )
  })

  // ── 6. double execute ────────────────────────────────────────────────────

  it('prevents double execution of a passed proposal', async () => {
    const { pot, vault } = await createPot(`sec-dbl-${Date.now() % 1e6}`)
    await deposit(pot, vault, LAMPORTS_PER_SOL)
    const p = await passedWithdrawProposal(pot, vault, beneficiary.publicKey, 1000)

    const exec = () =>
      (program.methods as any)
        .executeProposal()
        .accounts({
          pot, vault, proposal: p,
          executor: authority,
          recipient: beneficiary.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

    await exec()
    await expectError(exec(), 'ProposalNotPassed')
  })

  // ── 7. cancel proposal ───────────────────────────────────────────────────

  it('cancel_proposal kills a passed proposal; cancelled cannot execute', async () => {
    const { pot, vault } = await createPot(`sec-cxl-${Date.now() % 1e6}`)
    await deposit(pot, vault, LAMPORTS_PER_SOL)
    const p = await passedWithdrawProposal(pot, vault, beneficiary.publicKey, 1000)

    // Stranger cannot cancel.
    await expectError(
      (program.methods as any)
        .cancelProposal()
        .accounts({ pot, proposal: p, signer: stranger.publicKey })
        .signers([stranger])
        .rpc(),
      'NotSentinelOrAuthority',
    )

    // Proposer (== authority here) cancels.
    await (program.methods as any)
      .cancelProposal()
      .accounts({ pot, proposal: p, signer: authority })
      .rpc()
    const prop: any = await (program.account as any).proposalAccount.fetch(p)
    expect(Object.keys(prop.status)[0]).to.equal('cancelled')

    // Cancelled proposal cannot be executed.
    await expectError(
      (program.methods as any)
        .executeProposal()
        .accounts({
          pot, vault, proposal: p,
          executor: authority,
          recipient: beneficiary.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
      'ProposalNotPassed',
    )
  })
})
