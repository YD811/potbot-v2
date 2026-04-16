import type { BotContext } from '../types.js'
import { InlineKeyboard } from 'grammy'

export async function helpCommand(ctx: BotContext) {
  const lines = [
    '⚗️ *PotBot Commands*',
    '',
    '🪴 *Pots & Trading*',
    '/start — Initialize your wallet & tamagotchi',
    '/pot — Browse & manage your pots',
    '/swap — Swap tokens inside a pot',
    '/duel — Challenge another player to a 1v1 duel',
    '/ai — AI agent settings & automation rules',
    '',
    '🏦 *Strategy Vaults*',
    '/vaults — Browse top strategy vaults by PnL',
    '/vault \\<pubkey\\> — Vault details, fees & tamagotchi',
    '/my\\_vaults — Your vault positions & portfolio PnL',
    '/join \\<pubkey\\> — Pre\\-flight check to join a vault',
    '/ref\\_stats — Your referral earnings summary',
    '',
    '🌐 [potbot\\.fun](https://potbot.fun) · [GitHub](https://github.com/YD811/potbot-v2)',
  ]

  const kb = new InlineKeyboard()
  kb.url('🏆 Top Vaults', 'https://potbot.fun/vaults').row()
  kb.url('🤖 MCP for AI Agents', 'https://potbot.fun/for-agents')

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'MarkdownV2',
    reply_markup: kb,
    link_preview_options: { is_disabled: true },
  })
}
