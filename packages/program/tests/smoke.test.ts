// tests/smoke.test.ts
//
// Smoke tests that the program loads, create_pot succeeds, and the new
// protocol creation fee is debited to the treasury.

import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { expect } from 'chai'

const TREASURY = new PublicKey('2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o')
const POT_CREATION_FEE = 10_000_000 // 0.01 SOL

describe('create_pot — smoke', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = (anchor.workspace as any).PotVault as Program

  it('creates a pot and transfers POT_CREATION_FEE to treasury', async () => {
    const name = `smoke-${Date.now() % 1_000_000}`
    const [potPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pot'), provider.wallet.publicKey.toBuffer(), Buffer.from(name)],
      program.programId,
    )
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), potPda.toBuffer()],
      program.programId,
    )

    const treasuryBefore = await provider.connection.getBalance(TREASURY)

    await (program.methods as any)
      .createPot({
        name,
        emoji: '🧪',
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
      })
      .accounts({
        pot: potPda,
        vault: vaultPda,
        treasury: TREASURY,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const pot: any = await (program.account as any).potAccount.fetch(potPda)
    expect(pot.name).to.equal(name)
    expect(pot.totalShares.toNumber()).to.equal(0)

    const treasuryAfter = await provider.connection.getBalance(TREASURY)
    expect(treasuryAfter - treasuryBefore).to.equal(POT_CREATION_FEE)
  })
})
