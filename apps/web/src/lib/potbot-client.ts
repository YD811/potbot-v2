import { AnchorProvider, BN, Program } from '@coral-xyz/anchor'
import type { Idl, Wallet } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram, type Connection } from '@solana/web3.js'
import { IDL, getMemberAddress, getProposalAddress, getVaultAddress, getVoterRecordAddress } from '@potbot/sdk'

export const POTBOT_PROGRAM_ID = new PublicKey('2ywztkP4gaJr2HtmBvqMXrBWab3FLd3uG6TjGXvVogJL')

type RpcFn = { accounts: (a: Record<string, PublicKey>) => { rpc: () => Promise<string> } }

export interface ExecuteSwapArgs {
  fromMint: PublicKey
  toMint: PublicKey
  amountIn: BN
  minAmountOut: BN
}

export interface CreateStrategyArgs {
  name: string
  description: string
  entryFeeLamports: BN
  performanceFeeBps: number
  managementFeeBps: number
  referralBps: number
  strategyConfig: Record<string, unknown>
}

export interface SetAllowedMintsArgs {
  mints: PublicKey[]
}

export interface SetSpendingPolicyArgs {
  dailySpendingLamports: BN
  maxSwapBps: number
}

export interface ProposalSwapSpec {
  fromMint: PublicKey
  toMint: PublicKey
  amountIn: BN
  minAmountOut: BN
}

export type PotAccount = Record<string, unknown>
export type MemberAccount = Record<string, unknown>
export type ProposalAccount = Record<string, unknown>
export type StrategyAccount = Record<string, unknown>

export class PotbotClient {
  readonly program: Program

  constructor(connection: Connection, wallet: Wallet) {
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
    this.program = new Program(IDL as Idl, provider)
  }

  private method(name: string, args: unknown[]): RpcFn {
    const methods = this.program.methods as Record<string, (...methodArgs: unknown[]) => RpcFn>
    const fn = methods[name]
    if (!fn) throw new Error(`Instruction ${name} is missing from current IDL`)
    return fn(...args)
  }

  private async call(name: string, args: unknown[], accounts: Record<string, PublicKey>): Promise<string> {
    return this.method(name, args).accounts(accounts).rpc()
  }

  private async callAny(names: string[], args: unknown[], accounts: Record<string, PublicKey>): Promise<string> {
    const methods = this.program.methods as Record<string, (...methodArgs: unknown[]) => RpcFn>
    for (const name of names) {
      const fn = methods[name]
      if (fn) return fn(...args).accounts(accounts).rpc()
    }
    throw new Error(`None of the instructions are present in current IDL: ${names.join(', ')}`)
  }

  async createPot(args: Record<string, unknown>, accounts: { pot: PublicKey; vault: PublicKey; authority: PublicKey }) {
    return this.call('createPot', [args], { ...accounts, systemProgram: SystemProgram.programId })
  }

  async deposit(lamports: BN, accounts: { pot: PublicKey; vault: PublicKey; member: PublicKey; depositor: PublicKey }) {
    return this.call('deposit', [lamports], { ...accounts, systemProgram: SystemProgram.programId })
  }

  async withdraw(shares: BN, accounts: { pot: PublicKey; vault: PublicKey; member: PublicKey; withdrawer: PublicKey }) {
    return this.call('withdraw', [shares], { ...accounts, systemProgram: SystemProgram.programId })
  }

  async createProposal(args: Record<string, unknown>, accounts: { pot: PublicKey; proposal: PublicKey; member: PublicKey; proposer: PublicKey }) {
    return this.call('createProposal', [args], { ...accounts, systemProgram: SystemProgram.programId })
  }

  async vote(approve: boolean, accounts: { pot: PublicKey; proposal: PublicKey; member: PublicKey; voterRecord: PublicKey; voter: PublicKey }) {
    return this.call('vote', [approve], { ...accounts, systemProgram: SystemProgram.programId })
  }

  async executeProposal(accounts: { pot: PublicKey; vault: PublicKey; proposal: PublicKey; executor: PublicKey }) {
    return this.call('executeProposal', [], { ...accounts, systemProgram: SystemProgram.programId })
  }

  async executeSwap(args: ExecuteSwapArgs, accounts: { pot: PublicKey; vault: PublicKey; authority: PublicKey }) {
    return this.call('executeSwap', [{
      fromMint: args.fromMint,
      toMint: args.toMint,
      amountIn: args.amountIn,
      minAmountOut: args.minAmountOut,
    }], { ...accounts, systemProgram: SystemProgram.programId })
  }

  async createStrategy(args: CreateStrategyArgs, accounts: Record<string, PublicKey>) {
    return this.callAny(['createStrategy', 'createStrategyVault'], [args], accounts)
  }

  async closeStrategy(accounts: Record<string, PublicKey>) {
    return this.callAny(['closeStrategy', 'closeStrategyVault'], [], accounts)
  }

  async markProposalPassed(accounts: Record<string, PublicKey>) {
    return this.call('markProposalPassed', [], accounts)
  }

  async pausePot(accounts: Record<string, PublicKey>) {
    return this.call('pausePot', [], accounts)
  }

  async unpausePot(accounts: Record<string, PublicKey>) {
    return this.call('unpausePot', [], accounts)
  }

  async setAllowedMints(args: SetAllowedMintsArgs, accounts: Record<string, PublicKey>) {
    return this.call('setAllowedMints', [args], accounts)
  }

  async setSpendingPolicy(args: SetSpendingPolicyArgs, accounts: Record<string, PublicKey>) {
    return this.call('setSpendingPolicy', [args], accounts)
  }

  async fetchPotAccount(pot: PublicKey): Promise<PotAccount | null> {
    return ((this.program.account as Record<string, { fetchNullable: (k: PublicKey) => Promise<PotAccount | null> }>).potAccount).fetchNullable(pot)
  }

  async fetchMemberAccount(pot: PublicKey, memberWallet: PublicKey): Promise<MemberAccount | null> {
    const [member] = getMemberAddress(pot, memberWallet)
    return ((this.program.account as Record<string, { fetchNullable: (k: PublicKey) => Promise<MemberAccount | null> }>).memberAccount).fetchNullable(member)
  }

  async fetchProposalAccount(pot: PublicKey, proposalId: number): Promise<ProposalAccount | null> {
    const [proposal] = getProposalAddress(pot, proposalId)
    return ((this.program.account as Record<string, { fetchNullable: (k: PublicKey) => Promise<ProposalAccount | null> }>).proposalAccount).fetchNullable(proposal)
  }

  async fetchStrategyAccount(strategy: PublicKey): Promise<StrategyAccount | null> {
    const accountMap = this.program.account as Record<string, { fetchNullable: (k: PublicKey) => Promise<StrategyAccount | null> }>
    const strategyAccount = accountMap.strategyAccount ?? accountMap.strategyVaultAccount
    if (!strategyAccount) return null
    return strategyAccount.fetchNullable(strategy)
  }

  deriveVaultAddress(pot: PublicKey): PublicKey {
    const [vault] = getVaultAddress(pot)
    return vault
  }

  deriveMemberAddress(pot: PublicKey, member: PublicKey): PublicKey {
    const [memberPda] = getMemberAddress(pot, member)
    return memberPda
  }

  deriveProposalAddress(pot: PublicKey, proposalId: number): PublicKey {
    const [proposal] = getProposalAddress(pot, proposalId)
    return proposal
  }

  deriveVoterRecordAddress(proposal: PublicKey, voter: PublicKey): PublicKey {
    const [voterRecord] = getVoterRecordAddress(proposal, voter)
    return voterRecord
  }
}

export function createPotbotClient(connection: Connection, wallet: Wallet) {
  return new PotbotClient(connection, wallet)
}
