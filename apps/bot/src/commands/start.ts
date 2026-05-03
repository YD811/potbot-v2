import { PublicKey } from '@solana/web3.js'
import { InlineKeyboard } from 'grammy'
import type { BotContext } from '../types.js'

const APP_URL = process.env.APP_URL ?? 'https://app.potbot.fun'

/**
 * /start [<wallet_address>]
 *
 * Called in two scenarios:
 *   1. Plain /start  — shows welcome with current link status
 *   2. /start <addr> — deep-link from the web app after wallet connect;
 *      validates + persists the Solana address to the session.
 *
 * The web app generates the deep-link as:
 *   https://t.me/<BOT_USERNAME>?start=<base58_wallet_address>
 * Telegram sets ctx.match to the payload after "start ".
 */
export async function startCommand(ctx: BotContext) {
  const payload = (ctx.match as string | undefined)?.trim() ?? ''

  // ── Deep-link: wallet address passed as payload ───────────────────────────
  if (payload.length > 0) {
    try {
      new PublicKey(payload) // throws if invalid base58 / wrong length
      ctx.session.walletAddress = payload

      const short = `${payload.slice(0, 6)}…${payload.slice(-6)}`
      const keyboard = new InlineKeyboard()
        .url('🪴 My POTs', `${APP_URL}/dashboard`)
        .row()
        .url('📖 Docs', 'https://docs.potbot.fun')

      return ctx.reply(
        `✅ *Wallet linked!*\n\n` +
        `Address: \`${short}\`\n\n` +
        `You're all set. Use the commands below to manage your vaults:\n\n` +
        `/pot — view & manage your POTs\n` +
        `/swap — propose a token swap\n` +
        `/duel — challenge another vault\n` +
        `/help — full command reference`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      )
    } catch {
      // Payload exists but isn't a valid Solana pubkey
      return ctx.reply(
        `❌ *Invalid wallet address.*\n\n` +
        `The link appears to be malformed. Please connect your wallet from the app again.`,
        { parse_mode: 'Markdown' }
      )
    }
  }

  // ── Plain /start — welcome screen ─────────────────────────────────────────
  const linked = ctx.session.walletAddress
  const short  = linked ? `${linked.slice(0, 6)}…${linked.slice(-6)}` : null

  const keyboard = new InlineKeyboard()
    .url(
      linked ? '🪴 My POTs' : '🔗 Connect Wallet',
      linked
        ? `${APP_URL}/dashboard`
        : `${APP_URL}/dashboard?action=connect`
    )
    .row()
    .url('📖 Docs', 'https://docs.potbot.fun')

  const statusLine = linked
    ? `🔗 Wallet: \`${short}\``
    : `🔗 No wallet linked yet — tap *Connect Wallet* below.`

  await ctx.reply(
    `🪴 *Welcome to PotBot!*\n\n` +
    `Collective trading vaults on Solana.\n` +
    `Pool funds with your crew, vote on swaps, and grow your on-chain Tamagotchi.\n\n` +
    statusLine + `\n\n` +
    `*Commands:*\n` +
    `/pot  — manage your POT vaults\n` +
    `/swap — propose a token swap\n` +
    `/duel — challenge another vault\n` +
    `/help — show all commands`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  )
}
