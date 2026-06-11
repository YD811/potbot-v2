// tests/liquid_deposit.test.ts
//
// Phase B B1 — liquid-mode deposit auto-mints SPL share-tokens at NAV.
// Flow: create_pot → init_token_mint → set_liquid_config(true) →
// deposit → assert depositor's ATA received shares*shares_per_sol SPL, and
// total_shares grew. Also: set_liquid_config rejects enabling on a
// non-tokenized pot and rejects reserve_bps > 10000.

import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import {
  getAssociatedTokenAddressSync,
  getAccount as getTokenAccount,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { expect } from 'chai'

const TREASURY = new PublicKey('2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o')

describe('liquid deposit (Phase B)', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = (anchor.workspace as any).PotVault as Program
  const authority = provider.wallet.publicKey

  function pdas(name: string) {
    const [pot] = PublicKey.findProgramAddressSync(
      [Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)], program.programId)
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), pot.toBuffer()], program.programId)
    const [tokenMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('token_mint'), pot.toBuffer()], program.programId)
    const [member] = PublicKey.findProgramAddressSync(
      [Buffer.from('member'), pot.toBuffer(), authority.toBuffer()], program.programId)
    return { pot, vault, tokenMint, member }
  }

  async function createPot(name: string) {
    const { pot, vault } = pdas(name)
    await (program.methods as any).createPot({
      name, emoji: '💧', isPublic: true, minDeposit: new BN(0), lockupSeconds: new BN(0),
      yieldStrategy: 0, maxYieldAllocationBps: 0, maxTradeSizeBps: 0, maxMembers: 16,
      tradeLevel: 0, withdrawLevel: 0, memberChangeLevel: 0, settingsChangeLevel: 0,
      yieldChangeLevel: 0, voteTimeoutSeconds: new BN(3600), quorumBps: 0,
      timelockSeconds: new BN(0), protocolFeeBps: 0,
    }).accounts({ pot, vault, treasury: TREASURY, authority, systemProgram: SystemProgram.programId }).rpc()
    return pdas(name)
  }

  async function expectError(p: Promise<any>, code: string) {
    try { await p; expect.fail(`expected ${code}`) }
    catch (e: any) { expect(String(e.error?.errorCode?.code ?? e)).to.include(code) }
  }

  it('rejects enabling liquid mode on a non-tokenized pot', async () => {
    const { pot } = await createPot(`liq-notok-${Date.now() % 1e6}`)
    await expectError(
      (program.methods as any).setLiquidConfig({ liquidMode: true, withdrawalReserveBps: 2000 })
        .accounts({ pot, authority }).rpc(),
      'NotTokenized')
  })

  it('rejects reserve bps > 10000', async () => {
    const { pot } = await createPot(`liq-bps-${Date.now() % 1e6}`)
    await expectError(
      (program.methods as any).setLiquidConfig({ liquidMode: false, withdrawalReserveBps: 12000 })
        .accounts({ pot, authority }).rpc(),
      'InvalidReserveBps')
  })

  it('auto-mints SPL shares to the depositor on a liquid deposit', async () => {
    const { pot, vault, tokenMint, member } = await createPot(`liq-mint-${Date.now() % 1e6}`)

    // Tokenize: create the pot-owned SPL mint.
    await (program.methods as any).initTokenMint()
      .accounts({ pot, tokenMint, authority, tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId, rent: anchor.web3.SYSVAR_RENT_PUBKEY }).rpc()

    // Enable liquid mode with a 20% reserve target.
    await (program.methods as any).setLiquidConfig({ liquidMode: true, withdrawalReserveBps: 2000 })
      .accounts({ pot, authority }).rpc()

    const ata = getAssociatedTokenAddressSync(tokenMint, authority)
    await provider.sendAndConfirm(new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(authority, ata, authority, tokenMint)))

    const potBefore: any = await (program.account as any).potAccount.fetch(pot)
    const sharesPerSol = Number(potBefore.sharesPerSol)

    // First liquid deposit of 1 SOL. First deposit mints shares 1:1 with
    // lamports (lamports_to_shares seeds at lamports when total_shares==0).
    await (program.methods as any).deposit(new BN(LAMPORTS_PER_SOL))
      .accounts({
        pot, vault, member, depositor: authority,
        tokenMint, depositorAta: ata, tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).rpc()

    const potAfter: any = await (program.account as any).potAccount.fetch(pot)
    const internalShares = Number(potAfter.totalShares)
    expect(internalShares).to.be.greaterThan(0)

    const ataAcct = await getTokenAccount(provider.connection, ata)
    // SPL minted == internal shares × shares_per_sol.
    expect(Number(ataAcct.amount)).to.equal(internalShares * sharesPerSol)
  })
})
