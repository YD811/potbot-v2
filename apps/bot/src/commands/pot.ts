import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import { fetchPotsForWallet, createPotLink, potDetailLink, depositLink } from '../lib/rpc.js'

export async function potCommand(ctx: Context) {
  const userId = ctx.from?.id
  const username = ctx.from?.username ?? 'anon'

  // We need a linked wallet address — stored in session or user DB
  // For now we use the address from /start if provided, else prompt
  const linkedWallet: string | null = (ctx as any).session?.walletAddress ?? null

  if (!linkedWallet) {
    const keyboard = new InlineKeyboard()
      .url('🔗 Connect Wallet', createPotLink())

    return ctx.reply(
      `🪴 *PotBot*\n\n` +
      `Connect your Solana wallet to manage your POTs.\n\n` +
      `Tap below to open the app and link your wallet:`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    )
  }

  // Fetch real POTs from chain
  const status = await ctx.reply('⏳ Fetching your POTs…')
  const pots = await fetchPotsForWallet(linkedWallet)

  await ctx.api.deleteMessage(ctx.chat!.id, status.message_id).catch(() => {})

  if (pots.length === 0) {
    const keyboard = new InlineKeyboard()
      .url('➕ Create your first POT', createPotLink())

    return ctx.reply(
      `🪴 *Your POTs*\n\n` +
      `You don't have any POTs yet.\n` +
      `Create one and invite your crew!`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    )
  }

  // Show POT list
  const keyboard = new InlineKeyboard()
  pots.slice(0, 5).forEach((p) => {
    keyboard.url(`🪴 ${p.name || p.pubkey.slice(0, 8) + '…'}`, potDetailLink(p.pubkey)).row()
  })
  keyboard
    .url('➕ Create POT', createPotLink())
    .url('🌐 Open App', 'https://app.potbot.fun/dashboard')

  const lines = pots.slice(0, 5).map((p, i) =>
    `${i + 1}. *${p.name || p.pubkey.slice(0, 8) + '…'}*  (${p.memberCount} members)`
  )

  await ctx.reply(
    `🪴 *Your POTs* (${pots.length} total)\n\n` +
    lines.join('\n') +
    `\n\nTap a POT to manage it:`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  )
}

// ── Callback handlers ─────────────────────────────────────────────────────

export async function handlePotCallback(ctx: Context) {
  const data = (ctx.callbackQuery as any)?.data as string
  await ctx.answerCallbackQuery()

  if (data === 'pot_create') {
    return ctx.reply(
      `➕ *Create a POT*\n\nOpen the app to set up your collective vault:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().url('Open App', createPotLink()),
      }
    )
  }
}
