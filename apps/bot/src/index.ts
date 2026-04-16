import 'dotenv/config'
import { Bot, GrammyError, HttpError, session } from 'grammy'
import { conversations } from '@grammyjs/conversations'

import type { BotContext, SessionData } from './types.js'
import { startCommand } from './commands/start.js'
import { potCommand, handlePotCallback } from './commands/pot.js'
import { swapCommand } from './commands/swap.js'
import { duelCommand } from './commands/duel.js'
import { helpCommand } from './commands/help.js'
import { aiCommand, handleAiVoteCallback } from './commands/ai.js'
import {
  vaultsCommand,
  vaultCommand,
  myVaultsCommand,
  joinVaultCommand,
  refStatsCommand,
  handleVaultCallback,
} from './commands/vault.js'

// ── Env check ────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN
if (!BOT_TOKEN) throw new Error('BOT_TOKEN env var is required')

// ── Bot instance (typed) ─────────────────────────────────────────────────────
const bot = new Bot<BotContext>(BOT_TOKEN)

// ── Middleware ────────────────────────────────────────────────────────────────
bot.use(
  session<SessionData, BotContext>({
    initial: (): SessionData => ({
      walletAddress: null,
      activePot: null,
    }),
  })
)
bot.use(conversations())

// ── Commands ──────────────────────────────────────────────────────────────────
bot.command('start',     startCommand)
bot.command('pot',       potCommand)
bot.command('swap',      swapCommand)
bot.command('duel',      duelCommand)
bot.command('help',      helpCommand)
bot.command('ai',        aiCommand)

// Strategy Vault commands
bot.command('vaults',    vaultsCommand)
bot.command('vault',     vaultCommand)
bot.command('my_vaults', myVaultsCommand)
bot.command('join',      joinVaultCommand)
bot.command('ref_stats', refStatsCommand)

// ── Callback queries ──────────────────────────────────────────────────────────
bot.callbackQuery(/^pot_/,         handlePotCallback)
bot.callbackQuery(/^ai_vote:/,     handleAiVoteCallback)
bot.callbackQuery(/^vault_/,       handleVaultCallback)
bot.callbackQuery(/^my_vaults:/,   handleVaultCallback)

// ── Error handling ────────────────────────────────────────────────────────────
bot.catch((err) => {
  const ctx = err.ctx
  console.error(`[BotError] update_id=${ctx.update.update_id}`)
  if (err.error instanceof GrammyError) {
    console.error('  Grammy:', err.error.description)
  } else if (err.error instanceof HttpError) {
    console.error('  HTTP:', err.error.message)
  } else {
    console.error('  Unknown:', err.error)
  }
})

// ── Start ─────────────────────────────────────────────────────────────────────
bot.start({
  onStart: (info) => console.log(`🪴 @${info.username} is running`),
})

process.on('SIGTERM', () => bot.stop())
process.on('SIGINT',  () => bot.stop())
