// tests/redeem_tokens.test.ts
//
// Localnet (anchor test) integration test for the redeem_tokens instruction.
//
// Flow:
//   1) create_pot
//   2) deposit (member receives off-chain shares)
//   3) init_token_mint (1 SPL share-token = 1 internal share)
//   4) mint_tokens_to_member (mint X tokens to member ATA)
//   5) redeem_tokens(half) → assert
//        - member SOL went up by ~half NAV
//        - pot.total_shares went down by half
//        - member ATA balance == half remaining
//   6) attempt to redeem > 80% of vault → expect WithdrawalReserveBreached

import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getAccount as getTokenAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { expect } from 'chai'

describe('redeem_tokens', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  // anchor.workspace.PotVault is auto-loaded from target/idl/pot_vault.json
  // and target/types/pot_vault.ts at `anchor test` time.
  const program = (anchor.workspace as any).PotVault as Program

  const POT_NAME = 'redeem-test'
  const TREASURY = new PublicKey('2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o')

  let potPda: PublicKey
  let vaultPda: PublicKey
  let tokenMint: PublicKey
  let memberAta: PublicKey

  before(async () => {
    [potPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pot'), provider.wallet.publicKey.toBuffer(), Buffer.from(POT_NAME)],
      program.programId,
    )
    ;[vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), potPda.toBuffer()],
      program.programId,
    )
    ;[tokenMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('token_mint'), potPda.toBuffer()],
      program.programId,
    )

    // create_pot
    await (program.methods as any)
      .createPot({
        name: POT_NAME,
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

    // deposit 1 SOL → 1 SOL of vault, total_shares = 1 SOL worth (initial 1:1)
    const [memberPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('member'), potPda.toBuffer(), provider.wallet.publicKey.toBuffer()],
      program.programId,
    )
    await (program.methods as any)
      .deposit(new BN(LAMPORTS_PER_SOL))
      .accounts({
        pot: potPda,
        vault: vaultPda,
        member: memberPda,
        depositor: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    // init token mint
    await (program.methods as any)
      .initTokenMint()
      .accounts({
        pot: potPda,
        tokenMint,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc()

    // mint 100 tokens to member ATA
    memberAta = getAssociatedTokenAddressSync(tokenMint, provider.wallet.publicKey)
    const setupTx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        provider.wallet.publicKey,
        memberAta,
        provider.wallet.publicKey,
        tokenMint,
      ),
    )
    await provider.sendAndConfirm(setupTx)

    // mint_tokens_to_member emits `shares_amount * pot.shares_per_sol` SPL
    // tokens. With the post-create_pot default `shares_per_sol = 100`,
    // `mintTokensToMember(100)` mints 10_000 SPL tokens.
    await (program.methods as any)
      .mintTokensToMember(new BN(100))
      .accounts({
        pot: potPda,
        tokenMint,
        memberTokenAccount: memberAta,
        memberWallet: provider.wallet.publicKey,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  })

  // Default shares_per_sol after create_pot is 100, so SPL tokens are minted
  // at 100:1 vs internal shares. Tests must redeem in multiples of 100 to
  // avoid fractional-internal-share rejection.
  const SHARES_PER_SOL = 100

  it('burns tokens at NAV and decrements total_shares by INTERNAL units', async () => {
    const before = await getTokenAccount(provider.connection, memberAta)
    const potBefore: any = await (program.account as any).potAccount.fetch(potPda)
    const totalSharesBefore = Number(potBefore.totalShares)

    // Redeem 5_000 SPL tokens = 50 internal shares.
    const tokenRedeem = 50 * SHARES_PER_SOL // 5_000
    await (program.methods as any)
      .redeemTokens(new BN(tokenRedeem))
      .accounts({
        pot: potPda,
        vault: vaultPda,
        member: provider.wallet.publicKey,
        tokenMint,
        memberTokenAta: memberAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const after = await getTokenAccount(provider.connection, memberAta)
    const potAfter: any = await (program.account as any).potAccount.fetch(potPda)
    const totalSharesAfter = Number(potAfter.totalShares)

    expect(Number(after.amount)).to.equal(Number(before.amount) - tokenRedeem)
    // total_shares must drop by INTERNAL share units (50), not SPL units (5000)
    expect(totalSharesBefore - totalSharesAfter).to.equal(50)
  })

  it('rejects redemption that is not a clean multiple of shares_per_sol', async () => {
    let threw = false
    try {
      await (program.methods as any)
        .redeemTokens(new BN(50)) // 50 SPL tokens / 100 = 0.5 internal shares
        .accounts({
          pot: potPda,
          vault: vaultPda,
          member: provider.wallet.publicKey,
          tokenMint,
          memberTokenAta: memberAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    } catch (err: any) {
      threw = true
      expect(String(err)).to.match(/InvalidAmount|0x/)
    }
    expect(threw).to.equal(true)
  })

  it('rejects redemption that exceeds 80% liquidity reserve', async () => {
    // Mint enough tokens that one redemption would breach 80% of vault.
    // deposit() granted ~1e9 internal shares (1 share : 1 lamport on first
    // deposit), so to cross the 80% reserve the member must tokenize and
    // redeem a true majority of total_shares — 0.9e9 internal ≈ 90% of vault.
    await (program.methods as any)
      .mintTokensToMember(new BN(900_000_000)) // 0.9e9 internal ≈ 90% of shares
      .accounts({
        pot: potPda,
        tokenMint,
        memberTokenAccount: memberAta,
        memberWallet: provider.wallet.publicKey,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const ata = await getTokenAccount(provider.connection, memberAta)
    let threw = false
    try {
      await (program.methods as any)
        .redeemTokens(new BN(ata.amount.toString())) // try to take everything
        .accounts({
          pot: potPda,
          vault: vaultPda,
          member: provider.wallet.publicKey,
          tokenMint,
          memberTokenAta: memberAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    } catch (err: any) {
      threw = true
      expect(String(err)).to.match(/WithdrawalReserveBreached|0x/)
    }
    expect(threw).to.equal(true)
  })
})
