import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import {
  getPotAddress,
  getVaultAddress,
  getMemberAddress,
  getProposalAddress,
  getVoterRecordAddress,
  getPrivatePotAddress,
  getSnsAddress,
  getTamagotchiNftAddress,
  getTokenMintAddress,
  getTamagotchiMintAddress,
  getMetadataAddress,
} from './pda';
import { PotVaultIDL } from './idl/pot_vault';
import { PROGRAM_ID } from './index';

export interface CreatePotParams {
  name: string;
  emoji: string;
  isPublic: boolean;
  minDeposit: number;
  yieldStrategy: 'None' | 'Conservative' | 'Balanced' | 'Aggressive';
}

export interface CreatePrivatePotParams extends CreatePotParams {
  inviteCode: string; // 6-character code
}

export interface PotSDKConfig {
  connection: Connection;
  wallet: any;
  programId?: PublicKey;
}

export class PotSDK {
  private connection: Connection;
  private wallet: any;
  private program: Program;
  private programId: PublicKey;

  constructor(config: PotSDKConfig) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.programId = config.programId || PROGRAM_ID;
    
    const provider = new AnchorProvider(this.connection, this.wallet, {});
    this.program = new Program(PotVaultIDL as any, this.programId, provider);
  }

  // ─── Premium Feature Methods ────────────────────────────────────

  /**
   * Create a private pot with invite code
   */
  async buildCreatePrivatePotTx(
    params: CreatePrivatePotParams
  ): Promise<Transaction> {
    const authority = this.wallet.publicKey;
    const [pot] = getPotAddress(params.name, authority);
    const [privatePot] = getPrivatePotAddress(pot);
    const [vault] = getVaultAddress(pot);

    const instruction = await this.program.methods
      .createPrivatePot({
        name: params.name,
        emoji: params.emoji,
        inviteCode: params.inviteCode.toUpperCase(),
        config: {
          isPublic: false, // Always false for private pots
          minDeposit: new BN(params.minDeposit),
          lockupSeconds: new BN(0),
          yieldStrategy: { [params.yieldStrategy.toLowerCase()]: {} },
          maxYieldAllocationBps: 5000, // 50% default
          maxTradeSizeBps: 2000, // 20% default
          maxMembers: 100, // Default limit
        },
        governance: {
          tradeLevel: 2, // Majority voting
          withdrawLevel: 1, // Advisory
          memberChangeLevel: 2,
          settingsChangeLevel: 3,
          yieldChangeLevel: 2,
          voteTimeoutSeconds: new BN(7 * 24 * 3600), // 7 days
          quorumBps: 5000, // 50%
        },
      })
      .accounts({
        pot,
        privatePotAccount: privatePot,
        vault,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction().add(instruction);
    return tx;
  }

  /**
   * Join a private pot with invite code
   */
  async buildJoinPrivatePotTx(
    potPubkey: PublicKey,
    inviteCode: string
  ): Promise<Transaction> {
    const member = this.wallet.publicKey;
    const [privatePot] = getPrivatePotAddress(potPubkey);
    const [memberAccount] = getMemberAddress(potPubkey, member);

    const instruction = await this.program.methods
      .joinPrivatePot(inviteCode.toUpperCase())
      .accounts({
        pot: potPubkey,
        privatePotAccount: privatePot,
        memberAccount,
        member,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  /**
   * Tokenize pot shares (convert to SPL tokens)
   */
  async buildTokenizeSharesTx(potPubkey: PublicKey): Promise<Transaction> {
    const authority = this.wallet.publicKey;
    const [vault] = getVaultAddress(potPubkey);
    const [tokenMint] = getTokenMintAddress(potPubkey);
    
    // Treasury address that receives fees
    const treasury = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');

    const instruction = await this.program.methods
      .tokenizeShares()
      .accounts({
        pot: potPubkey,
        vault,
        tokenMint,
        authority,
        treasury,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  /**
   * Create SNS subdomain for pot
   */
  async buildCreateSnsdomainTx(
    potPubkey: PublicKey,
    domainName: string
  ): Promise<Transaction> {
    const authority = this.wallet.publicKey;
    const [snsAccount] = getSnsAddress(potPubkey);
    const treasury = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');

    const instruction = await this.program.methods
      .createSnsDomain(domainName.toLowerCase())
      .accounts({
        pot: potPubkey,
        snsAccount,
        authority,
        treasury,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  /**
   * Mint soulbound Tamagotchi NFT
   */
  async buildMintTamagotchiNftTx(potPubkey: PublicKey): Promise<Transaction> {
    const authority = this.wallet.publicKey;
    const [tamagotchiNftAccount] = getTamagotchiNftAddress(potPubkey);
    const [tamagotchiMint] = getTamagotchiMintAddress(potPubkey);
    const [metadataAccount] = getMetadataAddress(tamagotchiMint);
    
    const tamagotchiTokenAccount = getAssociatedTokenAddressSync(
      tamagotchiMint,
      authority
    );
    
    const treasury = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
    const metadataProgramId = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

    const instruction = await this.program.methods
      .mintTamagotchiNft()
      .accounts({
        pot: potPubkey,
        tamagotchiNftAccount,
        tamagotchiMint,
        tamagotchiTokenAccount,
        metadataAccount,
        authority,
        treasury,
        metadataProgram: metadataProgramId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  // ─── Fetch Methods for Premium Features ─────────────────────────

  /**
   * Fetch private pot account
   */
  async fetchPrivatePot(potPubkey: PublicKey) {
    try {
      const [privatePotAddress] = getPrivatePotAddress(potPubkey);
      return await this.program.account.privatePotAccount.fetch(privatePotAddress);
    } catch (error) {
      return null; // Not a private pot
    }
  }

  /**
   * Fetch SNS domain
   */
  async fetchSnsDomain(potPubkey: PublicKey) {
    try {
      const [snsAddress] = getSnsAddress(potPubkey);
      return await this.program.account.snsAccount.fetch(snsAddress);
    } catch (error) {
      return null; // No SNS domain
    }
  }

  /**
   * Fetch Tamagotchi NFT
   */
  async fetchTamagotchiNft(potPubkey: PublicKey) {
    try {
      const [tamagotchiAddress] = getTamagotchiNftAddress(potPubkey);
      return await this.program.account.tamagotchiNftAccount.fetch(tamagotchiAddress);
    } catch (error) {
      return null; // No Tamagotchi NFT
    }
  }

  /**
   * Check if pot is tokenized
   */
  async isTokenized(potPubkey: PublicKey): Promise<boolean> {
    try {
      const pot = await this.program.account.potAccount.fetch(potPubkey);
      return pot.tokenMint.toString() !== PublicKey.default.toString();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get token mint for tokenized pot
   */
  async getTokenMint(potPubkey: PublicKey): Promise<PublicKey | null> {
    try {
      const pot = await this.program.account.potAccount.fetch(potPubkey);
      if (pot.tokenMint.toString() === PublicKey.default.toString()) {
        return null;
      }
      return pot.tokenMint;
    } catch (error) {
      return null;
    }
  }

  // ─── Existing Methods (unchanged) ───────────────────────────────
  
  async buildCreatePotTx(params: CreatePotParams): Promise<Transaction> {
    const authority = this.wallet.publicKey;
    const [pot] = getPotAddress(params.name, authority);
    const [vault] = getVaultAddress(pot);

    const instruction = await this.program.methods
      .createPot({
        name: params.name,
        emoji: params.emoji,
        config: {
          isPublic: params.isPublic,
          minDeposit: new BN(params.minDeposit),
          lockupSeconds: new BN(0),
          yieldStrategy: { [params.yieldStrategy.toLowerCase()]: {} },
          maxYieldAllocationBps: 5000,
          maxTradeSizeBps: 2000,
          maxMembers: 0,
        },
        governance: {
          tradeLevel: 2,
          withdrawLevel: 1,
          memberChangeLevel: 2,
          settingsChangeLevel: 3,
          yieldChangeLevel: 2,
          voteTimeoutSeconds: new BN(7 * 24 * 3600),
          quorumBps: 5000,
        },
      })
      .accounts({
        pot,
        vault,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  async buildDepositTx(potPubkey: PublicKey, lamports: number): Promise<Transaction> {
    const member = this.wallet.publicKey;
    const [memberAccount] = getMemberAddress(potPubkey, member);
    const [vault] = getVaultAddress(potPubkey);

    const instruction = await this.program.methods
      .deposit(new BN(lamports))
      .accounts({
        pot: potPubkey,
        vault,
        memberAccount,
        member,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  async fetchPot(potPubkey: PublicKey) {
    return this.program.account.potAccount.fetch(potPubkey);
  }

  async fetchMember(potPubkey: PublicKey, wallet: PublicKey) {
    const [memberAddress] = getMemberAddress(potPubkey, wallet);
    return this.program.account.memberAccount.fetch(memberAddress);
  }

  async fetchProposal(potPubkey: PublicKey, proposalId: number) {
    const [proposalAddress] = getProposalAddress(potPubkey, proposalId);
    return this.program.account.proposalAccount.fetch(proposalAddress);
  }
}