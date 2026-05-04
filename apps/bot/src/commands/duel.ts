import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy"

export async function duelCommand(ctx: Context) {
  const commandArgs = ctx.message?.text?.split(' ').slice(1) || []
  const opponent = commandArgs[0]
  
  if (!opponent) {
    await ctx.reply('Please provide a player to challenge!')
    return
  }
  
  await ctx.reply(`♽ Challenge sent to ${opponent}!`)
}
