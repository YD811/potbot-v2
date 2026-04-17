/**
 * Helius Webhook Processor
 * 
 * Receives real-time on-chain events from Helius and routes them to handlers.
 * Far more efficient than polling — handles thousands of events per second.
 * 
 * Setup:
 *   1. Get API key from https://dev.helius.xyz
 *   2. Register webhook: POST https://api.helius.xyz/v0/webhooks
 *   3. Set HELIUS_WEBHOOK_SECRET in env for signature verification
 * 
 * Events we process:
 *   - DEPOSIT:   member deposited SOL → update member record
 *   - WITHDRAW:  member withdrew SOL → update member record
 *   - SWAP:      proposal executed (swap authorized) → trigger Jupiter executor
 *   - PROPOSAL:  new proposal created → notify members (future: push notifications)
 *   - VOTE:      member voted → update proposal state
 */
import { createHmac } from 'crypto'
import type { JupiterExecutor } from './jupiter-executor.js'

export interface HeliusWebhookEvent {
  accountData: Array<{
    account: string
    nativeBalanceChange: number
    tokenBalanceChanges: Array<{
      mint: string
      rawTokenAmount: { tokenAmount: string; decimals: number }
      userAccount: string
    }>
  }>
  description: string
  events: Record<string, unknown>
  fee: number
  feePayer: string
  instructions: Array<{
    accounts: string[]
    data: string
    innerInstructions: unknown[]
    programId: string
  }>
  logs: string[]
  nativeTransfers: Array<{ amount: number; fromUserAccount: string; toUserAccount: string }>
  signature: string
  slot: number
  source: string
  timestamp: number
  tokenTransfers: unknown[]
  transactionError: null | { error: string }
  type: string
}

export class HeliusProcessor {
  private secret: string
  private executor: JupiterExecutor
  private PROGRAM_ID: string

  constructor(executor: JupiterExecutor, programId: string, secret?: string) {
    this.executor = executor
    this.PROGRAM_ID = programId
    this.secret = secret ?? ''
  }

  verifySignature(rawBody: string, signature: string): boolean {
    if (!this.secret) return true // Skip in dev
    const expected = createHmac('sha256', this.secret)
      .update(rawBody)
      .digest('hex')
    return expected === signature
  }

  async processEvents(events: HeliusWebhookEvent[]): Promise<void> {
    for (const event of events) {
      if (event.transactionError) continue  // Skip failed txs

      try {
        await this.routeEvent(event)
      } catch (e) {
        console.error(`[helius] Error processing event ${event.signature}:`, e)
      }
    }
  }

  private async routeEvent(event: HeliusWebhookEvent): Promise<void> {
    const logs = event.logs ?? []

    // Check for swap authorization
    const swapLog = logs.find(l => l.includes('Swap authorised:'))
    if (swapLog) {
      await this.handleSwapAuthorized(event, swapLog)
      return
    }

    // Check for proposal execution
    if (logs.some(l => l.includes('Proposal #') && l.includes('executed in POT'))) {
      await this.handleProposalExecuted(event, logs)
      return
    }

    // Check for deposits
    if (logs.some(l => l.includes('Deposited') && l.includes('lamports'))) {
      await this.handleDeposit(event, logs)
      return
    }

    // Check for withdrawals
    if (logs.some(l => l.includes('Withdrew') && l.includes('lamports'))) {
      await this.handleWithdraw(event, logs)
      return
    }
  }

  private async handleSwapAuthorized(
    event: HeliusWebhookEvent,
    swapLog: string
  ): Promise<void> {
    // Parse: "Swap authorised: 1000000 lamports <from> -> <to> (min out: 0). Jupiter CPI: Phase 2."
    const match = swapLog.match(
      /Swap authorised: (\d+) lamports ([\w]+) -> ([\w]+) \(min out: (\d+)\)/
    )
    if (!match) return

    const [, amountIn, fromMint, toMint, minAmountOut] = match

    // Find pot pubkey from the accounts in the transaction
    const potPubkey = this.findPotPubkey(event)
    if (!potPubkey) {
      console.warn('[helius] Could not identify pot pubkey for swap event', event.signature)
      return
    }

    console.log(`[helius] Swap authorized: ${amountIn} ${fromMint} → ${toMint} for pot ${potPubkey.slice(0, 8)}`)

    // Trigger Jupiter executor
    await this.executor.executeSwap({
      potPubkey,
      fromMint,
      toMint,
      amountIn: Number(amountIn),
      minAmountOut: Number(minAmountOut),
      proposalId: this.extractProposalId(event.logs),
      txSignature: event.signature,
    })
  }

  private async handleProposalExecuted(
    event: HeliusWebhookEvent,
    logs: string[]
  ): Promise<void> {
    const executedLog = logs.find(l => l.includes('executed in POT'))
    if (!executedLog) return
    const match = executedLog.match(/Proposal #(\d+) executed in POT (.+)/)
    if (!match) return
    console.log(`[helius] Proposal #${match[1]} executed in pot ${match[2]}, tx: ${event.signature}`)
  }

  private async handleDeposit(event: HeliusWebhookEvent, logs: string[]): Promise<void> {
    const depositLog = logs.find(l => l.includes('Deposited'))
    if (!depositLog) return
    const match = depositLog.match(/Deposited (\d+) lamports.*shares=(\d+)/)
    if (!match) return
    console.log(`[helius] Deposit: ${match[1]} lamports, tx: ${event.signature}`)
    // TODO: update member record in Supabase + recalculate NAV
  }

  private async handleWithdraw(event: HeliusWebhookEvent, logs: string[]): Promise<void> {
    const withdrawLog = logs.find(l => l.includes('Withdrew'))
    if (!withdrawLog) return
    console.log(`[helius] Withdraw event, tx: ${event.signature}`)
    // TODO: update member record in Supabase
  }

  private findPotPubkey(event: HeliusWebhookEvent): string | null {
    // The pot account will be in the accountData array
    // It's typically the first non-fee-payer account involved with our program
    const instructions = event.instructions ?? []
    const programIx = instructions.find(ix => ix.programId === this.PROGRAM_ID)
    if (!programIx || !programIx.accounts.length) return null
    // First account in pot instructions is typically the pot PDA
    return programIx.accounts[0] ?? null
  }

  private extractProposalId(logs: string[]): number {
    const proposalLog = logs.find(l => l.includes('Proposal #'))
    const match = proposalLog?.match(/Proposal #(\d+)/)
    return match ? Number(match[1]) : 0
  }
}

/**
 * Register webhook with Helius API
 * Call this once during setup to point Helius at your API URL
 */
export async function registerHeliusWebhook(params: {
  apiKey: string
  webhookUrl: string
  programId: string
}): Promise<void> {
  const { apiKey, webhookUrl, programId } = params

  const res = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      webhookURL: webhookUrl,
      transactionTypes: ['Any'],
      accountAddresses: [programId],
      webhookType: 'enhanced',
      txnStatus: 'success',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Helius webhook registration failed: ${err}`)
  }

  const data = await res.json()
  console.log('[helius] Webhook registered:', data.webhookID)
}
