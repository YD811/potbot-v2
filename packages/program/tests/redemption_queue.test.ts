// tests/redemption_queue.test.ts
//
// Phase B B3 — redemption queue (Variant α: payout fixed at request NAV).
// Sets a 100% withdrawal reserve so instant redeem can't pay, forcing the
// queue path. Covers: request burns shares + earmarks SOL; fulfill pays the
// recorded member and only that member; cancel re-mints shares; a stranger
// cannot redirect a fulfilment.

import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import {
  getAssociatedTokenAddressSync, getAccount as getTokenAccount,
  createAssociatedTokenAccountIdempotentInstruction, TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { expect } from 'chai'

const TREASURY = new PublicKey('2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o')

describe('redemption queue (Phase B)', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = (anchor.workspace as any).PotVault as Program
  const authority = provider.wallet.publicKey
  const stranger = Keypair.generate()

  function pdas(name: string) {
    const [pot] = PublicKey.findProgramAddressSync(
      [Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)], program.programId)
    const [vault] = PublicKey.findProgramAddressSync([Buffer.from('vault'), pot.toBuffer()], program.programId)
    const [tokenMint] = PublicKey.findProgramAddressSync([Buffer.from('token_mint'), pot.toBuffer()], program.programId)
    const [member] = PublicKey.findProgramAddressSync(
      [Buffer.from('member'), pot.toBuffer(), authority.toBuffer()], program.programId)
    return { pot, vault, tokenMint, member }
  }
  function requestPda(pot: PublicKey, id: number) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('redemption'), pot.toBuffer(), new BN(id).toArrayLike(Buffer, 'le', 8)], program.programId)[0]
  }

  async function expectError(p: Promise<any>, code: string) {
    try { await p; expect.fail(`expected ${code}`) }
    catch (e: any) { expect(String(e.error?.errorCode?.code ?? e)).to.include(code) }
  }

  // Build a liquid pot, deposit 1 SOL, return handles + the member ATA.
  async function liquidPotWithDeposit(name: string, reserveBps: number) {
    const { pot, vault, tokenMint, member } = pdas(name)
    await (program.methods as any).createPot({
      name, emoji: '🌊', isPublic: true, minDeposit: new BN(0), lockupSeconds: new BN(0),
      yieldStrategy: 0, maxYieldAllocationBps: 0, maxTradeSizeBps: 0, maxMembers: 16,
      tradeLevel: 0, withdrawLevel: 0, memberChangeLevel: 0, settingsChangeLevel: 0,
      yieldChangeLevel: 0, voteTimeoutSeconds: new BN(3600), quorumBps: 0,
      timelockSeconds: new BN(0), protocolFeeBps: 0,
    }).accounts({ pot, vault, treasury: TREASURY, authority, systemProgram: SystemProgram.programId }).rpc()

    await (program.methods as any).initTokenMint().accounts({
      pot, tokenMint, authority, tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId, rent: anchor.web3.SYSVAR_RENT_PUBKEY }).rpc()
    await (program.methods as any).setLiquidConfig({ liquidMode: true, withdrawalReserveBps: reserveBps })
      .accounts({ pot, authority }).rpc()

    const ata = getAssociatedTokenAddressSync(tokenMint, authority)
    await provider.sendAndConfirm(new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(authority, ata, authority, tokenMint)))

    await (program.methods as any).deposit(new BN(LAMPORTS_PER_SOL)).accounts({
      pot, vault, member, depositor: authority,
      tokenMint, depositorAta: ata, tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId }).rpc()

    return { pot, vault, tokenMint, member, ata }
  }

  before(async () => {
    const sig = await provider.connection.requestAirdrop(stranger.publicKey, LAMPORTS_PER_SOL)
    await provider.connection.confirmTransaction(sig)
  })

  it('queues a redemption (burn + earmark), fulfils it to the member, and blocks fund redirection', async () => {
    const { pot, vault, tokenMint, member, ata } = await liquidPotWithDeposit(`rq-fill-${Date.now() % 1e6}`, 0)

    const potState: any = await (program.account as any).potAccount.fetch(pot)
    const id = potState.nextRedemptionId.toNumber()
    const sharesPerSol = Number(potState.sharesPerSol)
    const ataBefore = await getTokenAccount(provider.connection, ata)
    // Queue half the holding.
    const tokenAmount = Math.floor(Number(ataBefore.amount) / 2 / sharesPerSol) * sharesPerSol

    const request = requestPda(pot, id)
    await (program.methods as any).requestRedemption(new BN(tokenAmount)).accounts({
      pot, vault, request, tokenMint, memberTokenAta: ata,
      member: authority, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).rpc()

    // Shares burned; SOL earmarked.
    const ataAfter = await getTokenAccount(provider.connection, ata)
    expect(Number(ataAfter.amount)).to.equal(Number(ataBefore.amount) - tokenAmount)
    let reqState: any = await (program.account as any).redemptionRequest.fetch(request)
    expect(Object.keys(reqState.status)[0]).to.equal('pending')
    expect(reqState.owedLamports.toNumber()).to.be.greaterThan(0)
    let ps: any = await (program.account as any).potAccount.fetch(pot)
    expect(ps.pendingRedemptionLamports.toNumber()).to.equal(reqState.owedLamports.toNumber())

    // A stranger cannot redirect the payout to itself (address constraint).
    await expectError(
      (program.methods as any).fulfillRedemption().accounts({
        pot, vault, request, member: stranger.publicKey, cranker: stranger.publicKey,
        systemProgram: SystemProgram.programId }).signers([stranger]).rpc(),
      'UnauthorizedAccess')

    // Permissionless crank pays the recorded member. Assert the VAULT delta
    // (the vault never pays tx fees, unlike the provider-wallet member).
    const vaultBefore = await provider.connection.getBalance(vault)
    await (program.methods as any).fulfillRedemption().accounts({
      pot, vault, request, member: authority, cranker: stranger.publicKey,
      systemProgram: SystemProgram.programId }).signers([stranger]).rpc()
    const vaultAfter = await provider.connection.getBalance(vault)
    expect(vaultBefore - vaultAfter).to.equal(reqState.owedLamports.toNumber())

    reqState = await (program.account as any).redemptionRequest.fetch(request)
    expect(Object.keys(reqState.status)[0]).to.equal('fulfilled')
    ps = await (program.account as any).potAccount.fetch(pot)
    expect(ps.pendingRedemptionLamports.toNumber()).to.equal(0)
  })

  it('blocks the member.shares-based withdraw on a tokenized pot (no double-exit)', async () => {
    const { pot, vault, member } = await liquidPotWithDeposit(`rq-wd-${Date.now() % 1e6}`, 0)
    // withdraw uses member.shares; on a tokenized/liquid pot the only exit is
    // redeem/queue, so this must revert — otherwise a holder could redeem the
    // SPL AND withdraw the shares (CRITICAL double-exit found in audit).
    await expectError(
      (program.methods as any).withdraw(new BN(1)).accounts({
        pot, vault, member, withdrawer: authority, systemProgram: SystemProgram.programId,
      }).rpc(),
      'TokenizedUseRedeem')
  })

  it('cancels a Pending redemption and re-mints the shares', async () => {
    const { pot, vault, tokenMint, member, ata } = await liquidPotWithDeposit(`rq-cxl-${Date.now() % 1e6}`, 0)
    const potState: any = await (program.account as any).potAccount.fetch(pot)
    const id = potState.nextRedemptionId.toNumber()
    const sharesPerSol = Number(potState.sharesPerSol)
    const ataBefore = await getTokenAccount(provider.connection, ata)
    const tokenAmount = Math.floor(Number(ataBefore.amount) / 4 / sharesPerSol) * sharesPerSol

    const request = requestPda(pot, id)
    await (program.methods as any).requestRedemption(new BN(tokenAmount)).accounts({
      pot, vault, request, tokenMint, memberTokenAta: ata,
      member: authority, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).rpc()

    await (program.methods as any).cancelRedemption().accounts({
      pot, request, tokenMint, memberTokenAta: ata,
      member: authority, tokenProgram: TOKEN_PROGRAM_ID }).rpc()

    const ataAfter = await getTokenAccount(provider.connection, ata)
    expect(Number(ataAfter.amount)).to.equal(Number(ataBefore.amount)) // re-minted
    const reqState: any = await (program.account as any).redemptionRequest.fetch(request)
    expect(Object.keys(reqState.status)[0]).to.equal('cancelled')
    const ps: any = await (program.account as any).potAccount.fetch(pot)
    expect(ps.pendingRedemptionLamports.toNumber()).to.equal(0)
  })
})
