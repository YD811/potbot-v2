/**
 * /ai <question> — Claude-powered trading advisor for the POT.
 *
 * Works in private chats AND in Telegram group chats (invite @PotBotV2Bot to your group).
 * In groups: anyone can ask, all members see the analysis + can vote inline.
 * After enough "I'm in" votes the bot surfaces the on-chain proposal link.
 *
 * This is a HYBRID model: AI proposes → humans vote → on-chain executes.
 * Not autonomous — governance always has final say.
 */
import Anthropic from '@anthropic-ai/sdk'
import { InlineKeyboard } from 'grammy'
import type { BotContext } from '../types.js'

const APP_URL = process.env.APP_URL ?? 'https://app.potbot.fun'

// Lazy-init so missing key doesn't crash at import time
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

// In-memory vote tracker per message (resets on bot restart — fine for hackathon)
interface VoteState {
  yes: Set<number>
  no: Set<number>
  total: number   // expected members (defaults to 3 for groups)
  query: string
}
const votes = new Map<string, VoteState>()
const QUORUM = 2  // votes needed to surface the proposal link

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `You are an AI trading advisor embedded inside PotBot — a collective DeFi vault on Solana.
You help friend groups make smart, informed trading decisions through on-chain governance.

Your role:
- Analyze the question or trade idea clearly and concisely
- Provide relevant market context (sentiment, technicals, risk)
- Give a clear RECOMMENDATION at the end: Approve / Reject / More research needed
- Remind users that any trade requires a majority governance vote from POT members

Format rules:
- Keep response under 280 words (Telegram-friendly)
- Use *bold* for key points
- End with a clear "📊 Recommendation:" section
- Don't use disclaimers like "I'm not a financial advisor" — be direct
- You're not autonomous: humans always have final governance say

Current context: Solana ecosystem, April 2026.`

export async function aiCommand(ctx: BotContext) {
  const query = (ctx.match as string | undefined)?.trim() ?? ''

  if (!query) {
    return ctx.reply(
      `🤖 *AI Trading Advisor*\n\n` +
      `Ask anything about your POT's strategy:\n\n` +
      `\`/ai should we swap SOL to JUP right now?\`\n` +
      `\`/ai what's the best yield strategy for idle USDC?\`\n` +
      `\`/ai analyze the risk of adding BONK to our vault\`\n\n` +
      `_Works in group chats too — invite me to your crew's group!_`,
      { parse_mode: 'Markdown' }
    )
  }

  const thinking = await ctx.reply('🤖 Analyzing market conditions…')

  try {
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM,
      messages: [{ role: 'user', content: query }],
    })

    const analysis =
      response.content[0].type === 'text'
        ? response.content[0].text
        : 'Analysis unavailable — try again.'

    await ctx.api
      .deleteMessage(ctx.chat!.id, thinking.message_id)
      .catch(() => {})

    // Build vote keyboard
    const msgKey = `${ctx.chat!.id}:pending`
    votes.set(msgKey, { yes: new Set(), no: new Set(), total: 3, query })

    const keyboard = new InlineKeyboard()
      .text(`✅ I'm in (0/${QUORUM})`, `ai_vote:yes:${ctx.chat!.id}`)
      .text(`❌ Pass`, `ai_vote:no:${ctx.chat!.id}`)
      .row()
      .url('🗳️ Create Proposal', `${APP_URL}/dashboard?action=propose&query=${encodeURIComponent(query)}`)

    await ctx.reply(
      `🤖 *AI Advisor*\n\n${analysis}\n\n` +
      `_Should your POT act on this? Vote below — ${QUORUM} votes needed._`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    )
  } catch (err: any) {
    await ctx.api
      .deleteMessage(ctx.chat!.id, thinking.message_id)
      .catch(() => {})
    await ctx.reply(
      `⚠️ Advisor unavailable right now. Check your ANTHROPIC_API_KEY.\n\`${err?.message ?? err}\``,
      { parse_mode: 'Markdown' }
    )
  }
}

// ── Vote callback handler ─────────────────────────────────────────────────────
export async function handleAiVoteCallback(ctx: BotContext) {
  const data = (ctx.callbackQuery as any)?.data as string
  await ctx.answerCallbackQuery()

  const [, direction, chatIdStr] = data.split(':')
  const chatId = Number(chatIdStr)
  const userId = ctx.from?.id
  if (!userId) return

  const key = `${chatId}:pending`
  const state = votes.get(key)
  if (!state) return ctx.answerCallbackQuery({ text: 'Vote expired.' })

  if (direction === 'yes') {
    state.no.delete(userId)
    state.yes.add(userId)
  } else {
    state.yes.delete(userId)
    state.no.add(userId)
  }

  const yesCount = state.yes.size
  const noCount  = state.no.size

  // Update button label
  const keyboard = new InlineKeyboard()
    .text(`✅ I'm in (${yesCount}/${QUORUM})`, `ai_vote:yes:${chatId}`)
    .text(`❌ Pass (${noCount})`, `ai_vote:no:${chatId}`)
    .row()
    .url('🗳️ Create Proposal', `${APP_URL}/dashboard?action=propose&query=${encodeURIComponent(state.query)}`)

  await ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {})

  // Quorum reached
  if (yesCount >= QUORUM) {
    votes.delete(key)
    const proposalUrl = `${APP_URL}/dashboard?action=propose&query=${encodeURIComponent(state.query)}`
    await ctx.reply(
      `🎉 *Quorum reached!* ${yesCount} members approved.\n\n` +
      `Tap below to submit the on-chain governance proposal:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().url('⚡ Submit On-Chain Proposal', proposalUrl),
      }
    )
  }
}
