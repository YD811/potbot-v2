import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'

const KNOWN_TOKENS: Record<string, string> = {
  SOL:  'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  JUP:  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF:  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
}

/**
 * /swap <amount> <FROM> <TO>
 * Creates a governance proposal in the user's active POT via web app deep-link.
 * The actual swap executes on-chain after members approve.
 */
export async function swapCommand(ctx: Context) {
  const args = ctx.message?.text?.split(' ').slice(1) ?? []

  if (args.length < 3) {
    return ctx.reply(
      `⚡ *Swap Command*\n\n` +
      `Usage: \`/swap <amount> <FROM> <TO>\`\n\n` +
      `Examples:\n` +
      `\`/swap 10 SOL JUP\`\n` +
      `\`/swap 500 USDC BONK\`\n\n` +
      `Supported tokens: ${Object.keys(KNOWN_TOKENS).join(', ')}`,
      { parse_mode: 'Markdown' }
    )
  }

  const [rawAmount, rawFrom, rawTo] = args
  const amount = parseFloat(rawAmount)
  const from = rawFrom.toUpperCase()
  const to   = rawTo.toUpperCase()

  if (isNaN(amount) || amount <= 0) {
    return ctx.reply('❌ Invalid amount. Use a positive number.')
  }

  const fromMint = KNOWN_TOKENS[from]
  const toMint   = KNOWN_TOKENS[to]

  if (!fromMint) return ctx.reply(`❌ Unknown token: ${from}. Supported: ${Object.keys(KNOWN_TOKENS).join(', ')}`)
  if (!toMint)   return ctx.reply(`❌ Unknown token: ${to}. Supported: ${Object.keys(KNOWN_TOKENS).join(', ')}`)
  if (from === to) return ctx.reply('❌ FROM and TO tokens must be different.')

  // Build Jupiter quote URL for the user to preview
  const jupiterUrl = `https://jup.ag/swap/${from}-${to}`

  // Deep-link into app to create the governance proposal
  const appUrl = process.env.APP_URL ?? 'https://app.potbot.fun'
  const proposalUrl = `${appUrl}/dashboard?action=swap&from=${fromMint}&to=${toMint}&amount=${amount}`

  const keyboard = new InlineKeyboard()
    .url('🗳️ Create Swap Proposal', proposalUrl)
    .row()
    .url('📊 Preview Route (Jupiter)', jupiterUrl)

  await ctx.reply(
    `⚡ *Swap Proposal*\n\n` +
    `*${amount} ${from}* → *${to}*\n\n` +
    `This will create a governance proposal in your active POT.\n` +
    `Members must vote to approve before the swap executes.\n\n` +
    `Tap below to submit:`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  )
}
