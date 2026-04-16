/**
 * Strategy Vault commands for PotBot Telegram bot
 *
 * /vaults           — list top strategy vaults (filterable by strategy/risk)
 * /vault <pubkey>   — vault detail: fees, tamagotchi, PnL
 * /my_vaults        — positions summary with PnL
 * /join <pubkey>    — join a vault (requires wallet)
 * /deposit <pubkey> — get unique deposit address for a pot
 * /ref_stats        — referral earnings summary
 */

import type { BotContext } from '../types.js'
import { InlineKeyboard } from 'grammy'

// ─── Mock vault data (mirrors strategy-vault-store seed data) ─────────────────

interface VaultRecord {
  pubkey: string
  name: string
  emoji: string
  strategy: string
  risk: string
  tamagotchiLevel: number
  tamagotchiEmoji: string
  tamagotchiTitle: string
  memberCount: number
  aumUsd: number
  pnl30d: number
  pnl7d: number
  entryFeeUsd: number
  performanceFeeBps: number
  isAiAgent: boolean
  creatorHandle: string
}

const TAMA_EMOJI = ['🥚', '🐣', '🐥', '🦅', '🐉', '⚡']
const TAMA_TITLE = ['Egg', 'Chick', 'Fledgling', 'Eagle', 'Dragon', 'Titan']

const MOCK_VAULTS: VaultRecord[] = [
  {
    pubkey: 'diamond_008', name: 'Diamond Hands DAO', emoji: '💎',
    strategy: 'HODL', risk: 'Conservative', tamagotchiLevel: 4,
    tamagotchiEmoji: '🐉', tamagotchiTitle: 'Dragon',
    memberCount: 891, aumUsd: 445000, pnl30d: 18.2, pnl7d: 5.1,
    entryFeeUsd: 0, performanceFeeBps: 300, isAiAgent: false, creatorHandle: 'Diamond Hands DAO',
  },
  {
    pubkey: 'ai_treasury_006', name: 'AI Treasury Manager', emoji: '🤖',
    strategy: 'AI DCA', risk: 'Balanced', tamagotchiLevel: 4,
    tamagotchiEmoji: '🐉', tamagotchiTitle: 'Dragon',
    memberCount: 567, aumUsd: 234000, pnl30d: 9.8, pnl7d: 2.5,
    entryFeeUsd: 0, performanceFeeBps: 700, isAiAgent: true, creatorHandle: 'Treasury-Mgr-1',
  },
  {
    pubkey: 'ai_dca_bot_003', name: 'Autonomous DCA Engine', emoji: '🤖',
    strategy: 'AI DCA', risk: 'Conservative', tamagotchiLevel: 3,
    tamagotchiEmoji: '🦅', tamagotchiTitle: 'Eagle',
    memberCount: 312, aumUsd: 127000, pnl30d: 6.2, pnl7d: 1.8,
    entryFeeUsd: 0, performanceFeeBps: 500, isAiAgent: true, creatorHandle: 'DCA-Bot-7',
  },
  {
    pubkey: 'yield_dao_005', name: 'Yield Farmers DAO', emoji: '🌾',
    strategy: 'Yield', risk: 'Conservative', tamagotchiLevel: 3,
    tamagotchiEmoji: '🦅', tamagotchiTitle: 'Eagle',
    memberCount: 203, aumUsd: 89500, pnl30d: 4.1, pnl7d: 0.9,
    entryFeeUsd: 0, performanceFeeBps: 800, isAiAgent: false, creatorHandle: 'Yield Farmers DAO',
  },
  {
    pubkey: 'alpha_dca_001', name: 'Alpha Squad DCA', emoji: '🎯',
    strategy: 'AI DCA', risk: 'Balanced', tamagotchiLevel: 2,
    tamagotchiEmoji: '🐥', tamagotchiTitle: 'Fledgling',
    memberCount: 127, aumUsd: 48200, pnl30d: 12.4, pnl7d: 3.2,
    entryFeeUsd: 5, performanceFeeBps: 1000, isAiAgent: false, creatorHandle: '@CryptoYDao',
  },
  {
    pubkey: 'sol_bull_002', name: 'SOL Bull Market Fund', emoji: '🐂',
    strategy: 'Trend', risk: 'Degen', tamagotchiLevel: 1,
    tamagotchiEmoji: '🐣', tamagotchiTitle: 'Chick',
    memberCount: 89, aumUsd: 31400, pnl30d: 8.7, pnl7d: 2.1,
    entryFeeUsd: 10, performanceFeeBps: 1500, isAiAgent: false, creatorHandle: 'Sensei',
  },
  {
    pubkey: 'degen_mode_004', name: 'Degen Mode', emoji: '🎰',
    strategy: 'Degen', risk: 'Degen', tamagotchiLevel: 1,
    tamagotchiEmoji: '🐣', tamagotchiTitle: 'Chick',
    memberCount: 45, aumUsd: 12800, pnl30d: 34.1, pnl7d: 18.5,
    entryFeeUsd: 20, performanceFeeBps: 2000, isAiAgent: false, creatorHandle: 'Moon_Bro',
  },
  {
    pubkey: 'contra_007', name: 'Contrarian Club', emoji: '🔄',
    strategy: 'Mean Rev', risk: 'Balanced', tamagotchiLevel: 1,
    tamagotchiEmoji: '🐣', tamagotchiTitle: 'Chick',
    memberCount: 67, aumUsd: 22100, pnl30d: 5.3, pnl7d: 1.2,
    entryFeeUsd: 5, performanceFeeBps: 1200, isAiAgent: false, creatorHandle: 'Zig_Zag',
  },
]

// Mock positions (keyed by user Telegram ID, demo only)
const MOCK_POSITIONS: Record<string, { vaultPubkey: string; depositedUsd: number; currentValueUsd: number; joinedAt: string }[]> = {
  demo: [
    { vaultPubkey: 'alpha_dca_001', depositedUsd: 84, currentValueUsd: 88.20, joinedAt: '2025-03-01' },
    { vaultPubkey: 'ai_dca_bot_003', depositedUsd: 500, currentValueUsd: 611.05, joinedAt: '2025-01-15' },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${fmt(n / 1_000_000, 1)}M`
  if (n >= 1_000) return `$${fmt(n / 1_000, 1)}K`
  return `$${fmt(n)}`
}

function pnlEmoji(pct: number) {
  return pct >= 0 ? '🟢' : '🔴'
}

function vaultCard(v: VaultRecord): string {
  const entryStr = v.entryFeeUsd === 0 ? 'Free' : `$${v.entryFeeUsd}`
  const perfStr = `${(v.performanceFeeBps / 100).toFixed(1)}% perf`
  const aiTag = v.isAiAgent ? ' 🤖 AI-managed' : ''
  return [
    `${v.emoji} *${v.name}*${aiTag}`,
    `├ Strategy: ${v.strategy} · Risk: ${v.risk}`,
    `├ Tamagotchi: ${v.tamagotchiEmoji} ${v.tamagotchiTitle} (level ${v.tamagotchiLevel})`,
    `├ Members: ${v.memberCount} · AUM: ${fmtUsd(v.aumUsd)}`,
    `├ 30d PnL: ${pnlEmoji(v.pnl30d)} *${v.pnl30d > 0 ? '+' : ''}${fmt(v.pnl30d)}%*`,
    `└ Fees: ${entryStr} entry · ${perfStr}`,
  ].join('\n')
}

// ─── /vaults — list top vaults ────────────────────────────────────────────────

export async function vaultsCommand(ctx: BotContext) {
  const sorted = [...MOCK_VAULTS].sort((a, b) => b.pnl30d - a.pnl30d).slice(0, 5)

  const lines = [
    '🏆 *Top Strategy Vaults* (30d PnL)',
    '─────────────────────────────',
    '',
    ...sorted.map((v, i) => {
      const pnlStr = `${v.pnl30d > 0 ? '+' : ''}${fmt(v.pnl30d)}%`
      const aiTag = v.isAiAgent ? ' 🤖' : ''
      return `${i + 1}\\. ${v.emoji} *${escMd(v.name)}*${aiTag} — ${pnlEmoji(v.pnl30d)} ${escMd(pnlStr)} · ${fmtUsd(v.aumUsd)} AUM`
    }),
    '',
    `_Use /vault <pubkey\\> for details_`,
    `_Use /my\\_vaults to see your positions_`,
  ]

  const kb = new InlineKeyboard()
  sorted.slice(0, 3).forEach((v) => {
    kb.text(`${v.emoji} ${v.name}`, `vault_detail:${v.pubkey}`).row()
  })
  kb.url('🌐 View All Vaults', 'https://potbot.fun/vaults')

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'MarkdownV2',
    reply_markup: kb,
  })
}

// ─── /vault <pubkey> — vault detail ──────────────────────────────────────────

export async function vaultCommand(ctx: BotContext) {
  const arg = ctx.match as string | undefined
  const pubkey = arg?.trim()

  if (!pubkey) {
    await ctx.reply(
      '⚠️ Usage: `/vault <pubkey>`\n\nExample:\n`/vault diamond_008`\n\nOr tap a vault from /vaults to see details\\.',
      { parse_mode: 'MarkdownV2' }
    )
    return
  }

  const vault = MOCK_VAULTS.find((v) => v.pubkey === pubkey)
  if (!vault) {
    await ctx.reply(`❌ Vault \`${escMd(pubkey)}\` not found\\. Try /vaults to browse available vaults\\.`, {
      parse_mode: 'MarkdownV2',
    })
    return
  }

  const swapFeeMap: Record<number, string> = { 0: '0.50%', 1: '0.45%', 2: '0.40%', 3: '0.30%', 4: '0.20%', 5: '0.10%' }
  const discountMap: Record<number, string> = { 0: '0%', 1: '5%', 2: '10%', 3: '20%', 4: '35%', 5: '50%' }
  const tamaNextReq: Record<number, string> = {
    0: '10 members or $5K AUM',
    1: '50 members or $25K AUM',
    2: '200 members or $100K AUM',
    3: '500 members or $250K AUM',
    4: '1000 members or $500K AUM',
    5: 'Max level reached',
  }

  const lines = [
    `${vault.emoji} *${escMd(vault.name)}*`,
    vault.isAiAgent ? '_🤖 AI Agent\\-Managed Vault_' : `_by ${escMd(vault.creatorHandle)}_`,
    '',
    `🐾 *Tamagotchi: ${vault.tamagotchiEmoji} ${escMd(vault.tamagotchiTitle)}* \\(level ${vault.tamagotchiLevel}\\)`,
    `├ Swap fee: ${escMd(swapFeeMap[vault.tamagotchiLevel] ?? '0.50%')}`,
    `├ Entry discount: ${escMd(discountMap[vault.tamagotchiLevel] ?? '0%')}`,
    `└ Next level: ${escMd(tamaNextReq[vault.tamagotchiLevel] ?? '—')}`,
    '',
    `📊 *Performance*`,
    `├ 7d: ${pnlEmoji(vault.pnl7d)} ${escMd(`${vault.pnl7d > 0 ? '+' : ''}${fmt(vault.pnl7d)}%`)}`,
    `├ 30d: ${pnlEmoji(vault.pnl30d)} *${escMd(`${vault.pnl30d > 0 ? '+' : ''}${fmt(vault.pnl30d)}%`)}*`,
    `└ Members: ${vault.memberCount} · AUM: ${escMd(fmtUsd(vault.aumUsd))}`,
    '',
    `💸 *Fees*`,
    `├ Entry: ${vault.entryFeeUsd === 0 ? 'Free' : `$${vault.entryFeeUsd}`}`,
    `├ Performance: ${escMd((vault.performanceFeeBps / 100).toFixed(1))}% of profit`,
    `└ Strategy: ${escMd(vault.strategy)} · Risk: ${escMd(vault.risk)}`,
  ]

  const kb = new InlineKeyboard()
  kb.text('🚀 Join Vault', `vault_join:${vault.pubkey}`)
  kb.url('📈 View on Web', `https://potbot.fun/vaults`)

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'MarkdownV2',
    reply_markup: kb,
  })
}

// ─── /my_vaults — positions ───────────────────────────────────────────────────

export async function myVaultsCommand(ctx: BotContext) {
  // In production this uses the wallet from session; demo uses mock data
  const positions = MOCK_POSITIONS['demo'] ?? []

  if (positions.length === 0) {
    await ctx.reply(
      "💼 *My Vault Positions*\n\nYou haven't joined any vaults yet\\.\n\nBrowse with /vaults or visit [potbot\\.fun/vaults](https://potbot.fun/vaults)",
      { parse_mode: 'MarkdownV2', link_preview_options: { is_disabled: true } }
    )
    return
  }

  let totalDeposited = 0
  let totalCurrent = 0

  const posLines = positions.map((pos) => {
    const vault = MOCK_VAULTS.find((v) => v.pubkey === pos.vaultPubkey)
    const pnlUsd = pos.currentValueUsd - pos.depositedUsd
    const pnlPct = (pnlUsd / pos.depositedUsd) * 100
    totalDeposited += pos.depositedUsd
    totalCurrent += pos.currentValueUsd

    return [
      `${vault?.emoji ?? '📊'} *${escMd(vault?.name ?? pos.vaultPubkey)}*`,
      `├ Deposited: $${fmt(pos.depositedUsd)} · Current: $${fmt(pos.currentValueUsd)}`,
      `└ PnL: ${pnlEmoji(pnlPct)} *${pnlUsd >= 0 ? '+' : ''}$${fmt(Math.abs(pnlUsd))}* \\(${pnlPct >= 0 ? '+' : ''}${fmt(pnlPct)}%\\)`,
    ].join('\n')
  })

  const totalPnlUsd = totalCurrent - totalDeposited
  const totalPnlPct = (totalPnlUsd / totalDeposited) * 100

  const lines = [
    '💼 *My Vault Positions*',
    '─────────────────────────────',
    '',
    ...posLines,
    '',
    '─────────────────────────────',
    `📈 Total: $${fmt(totalDeposited)} → $${fmt(totalCurrent)}`,
    `   Portfolio PnL: ${pnlEmoji(totalPnlPct)} *${totalPnlUsd >= 0 ? '+' : ''}$${fmt(Math.abs(totalPnlUsd))}* \\(${totalPnlPct >= 0 ? '+' : ''}${fmt(totalPnlPct)}%\\)`,
  ]

  const kb = new InlineKeyboard()
  kb.url('📊 Full Portfolio', 'https://potbot.fun/vaults').row()
  kb.text('🔄 Refresh', 'my_vaults:refresh')

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'MarkdownV2',
    reply_markup: kb,
  })
}

// ─── /join <pubkey> — join a vault ───────────────────────────────────────────

export async function joinVaultCommand(ctx: BotContext) {
  const arg = ctx.match as string | undefined
  const pubkey = arg?.trim()

  if (!pubkey) {
    await ctx.reply(
      '⚠️ Usage: `/join <pubkey>`\n\nExample: `/join diamond_008`\n\nFind a vault with /vaults first\\.',
      { parse_mode: 'MarkdownV2' }
    )
    return
  }

  const vault = MOCK_VAULTS.find((v) => v.pubkey === pubkey)
  if (!vault) {
    await ctx.reply(`❌ Vault \`${escMd(pubkey)}\` not found\\. Try /vaults to browse\\.`, {
      parse_mode: 'MarkdownV2',
    })
    return
  }

  const entryFeeStr = vault.entryFeeUsd === 0 ? 'Free \\(no entry fee\\)' : `$${vault.entryFeeUsd}`
  const perfFeeStr = `${(vault.performanceFeeBps / 100).toFixed(1)}%`

  const lines = [
    `🚀 *Join ${escMd(vault.name)}*`,
    '',
    `📋 *Pre\\-flight check:*`,
    `├ Entry fee: ${escMd(entryFeeStr)}`,
    `├ Performance fee: ${escMd(perfFeeStr)} of profit on exit`,
    `├ Risk level: ${escMd(vault.risk)}`,
    `├ Current 30d return: ${pnlEmoji(vault.pnl30d)} ${escMd(`${vault.pnl30d > 0 ? '+' : ''}${fmt(vault.pnl30d)}%`)}`,
    `└ Members: ${vault.memberCount}`,
    '',
    '⚡ To join, connect your wallet and deposit on the web app:',
  ]

  const kb = new InlineKeyboard()
  kb.url(`🌐 Open ${vault.emoji} ${vault.name}`, `https://potbot.fun/vaults`)

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'MarkdownV2',
    reply_markup: kb,
  })
}

// ─── /deposit <pubkey> — get deposit address ────────────────────────────────

export async function depositCommand(ctx: BotContext) {
  const arg = ctx.match as string | undefined
  const pubkey = arg?.trim()

  if (!pubkey) {
    // Show list of vaults if no pubkey provided
    const sorted = [...MOCK_VAULTS].sort((a, b) => b.aumUsd - a.aumUsd).slice(0, 5)
    const lines = [
      '💸 *Deposit to a Pot*',
      '',
      'Which pot would you like to deposit to?',
      '',
      ...sorted.map((v) => `${v.emoji} ${escMd(v.name)} — \`${escMd(v.pubkey)}\``),
      '',
      '_Use: `/deposit <pubkey>`_',
    ]
    await ctx.reply(lines.join('\n'), { parse_mode: 'MarkdownV2' })
    return
  }

  const vault = MOCK_VAULTS.find((v) => v.pubkey === pubkey)
  if (!vault) {
    await ctx.reply(`❌ Pot \`${escMd(pubkey)}\` not found\\.`, {
      parse_mode: 'MarkdownV2',
    })
    return
  }

  // Mock deposit address (in production, call GET /api/deposit-address/{pubkey})
  const depositAddress = `deposit_${pubkey}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  const lines = [
    `💸 *Deposit to ${escMd(vault.name)}*`,
    '',
    '📬 *Your unique deposit address:*',
    '',
    `\`${depositAddress}\``,
    '',
    '_Send SOL to this address to deposit into the pot\._',
    '_Your deposit will be credited automatically within 1-2 minutes\._',
    '',
    `🔗 [View on Solscan](https://solscan.io/address/${escMd(depositAddress)})`,
  ]

  const kb = new InlineKeyboard()
  kb.url('🌐 Deposit on Web', `https://potbot.fun/pots/${pubkey}`)

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'MarkdownV2',
    reply_markup: kb,
  })
}

// ─── /ref_stats — referral earnings ──────────────────────────────────────────

export async function refStatsCommand(ctx: BotContext) {
  // In production: query ReferralAccount PDAs for user's wallet
  const stats = {
    totalReferrals: 3,
    totalEarnedUsd: 12.50,
    activeVaults: 2,
    referralLink: `https://potbot.fun/vaults?ref=${ctx.from?.id ?? 'demo'}`,
  }

  const lines = [
    '🔗 *Referral Stats*',
    '─────────────────────────────',
    '',
    `├ Total referrals: ${stats.totalReferrals}`,
    `├ Vaults with active refs: ${stats.activeVaults}`,
    `└ Total earned: *$${fmt(stats.totalEarnedUsd)}*`,
    '',
    '📢 *How referrals work:*',
    'When someone joins a vault through your link, you receive 10% of the entry fee\\. This is split atomically on\\-chain — no claiming needed\\.',
    '',
    `🔗 *Your referral link:*`,
    `\`${escMd(stats.referralLink)}\``,
  ]

  const kb = new InlineKeyboard()
  kb.url('🌐 Share Your Link', stats.referralLink)

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'MarkdownV2',
    reply_markup: kb,
  })
}

// ─── Callback handlers ────────────────────────────────────────────────────────

export async function handleVaultCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data ?? ''

  if (data.startsWith('vault_detail:')) {
    const pubkey = data.replace('vault_detail:', '')
    const vault = MOCK_VAULTS.find((v) => v.pubkey === pubkey)
    if (!vault) { await ctx.answerCallbackQuery('Vault not found'); return }

    await ctx.answerCallbackQuery()
    // Reuse vaultCommand logic by calling vaultCommand with synthesized ctx
    const swapFeeMap: Record<number, string> = { 0: '0.50%', 1: '0.45%', 2: '0.40%', 3: '0.30%', 4: '0.20%', 5: '0.10%' }
    const lines = [
      `${vault.emoji} *${escMd(vault.name)}*`,
      vault.isAiAgent ? '_🤖 AI Agent\\-Managed_' : `_by ${escMd(vault.creatorHandle)}_`,
      '',
      `${vault.tamagotchiEmoji} Tamagotchi: *${escMd(vault.tamagotchiTitle)}* \\(level ${vault.tamagotchiLevel}\\) · swap fee: ${escMd(swapFeeMap[vault.tamagotchiLevel] ?? '0.50%')}`,
      `📊 30d: ${pnlEmoji(vault.pnl30d)} *${escMd(`${vault.pnl30d > 0 ? '+' : ''}${fmt(vault.pnl30d)}%`)}* · Members: ${vault.memberCount} · AUM: ${escMd(fmtUsd(vault.aumUsd))}`,
      `💸 Entry: ${vault.entryFeeUsd === 0 ? 'Free' : `$${vault.entryFeeUsd}`} · Perf: ${escMd((vault.performanceFeeBps / 100).toFixed(1))}%`,
    ]
    const kb = new InlineKeyboard()
    kb.url('🚀 Join on Web', 'https://potbot.fun/vaults')
    kb.text('← Back', 'vault_list')

    await ctx.editMessageText(lines.join('\n'), { parse_mode: 'MarkdownV2', reply_markup: kb })
    return
  }

  if (data === 'vault_list') {
    await ctx.answerCallbackQuery()
    // Re-render list
    const sorted = [...MOCK_VAULTS].sort((a, b) => b.pnl30d - a.pnl30d).slice(0, 5)
    const lines = [
      '🏆 *Top Strategy Vaults* \\(30d PnL\\)',
      '─────────────────────────────',
      '',
      ...sorted.map((v, i) => {
        const pnlStr = `${v.pnl30d > 0 ? '+' : ''}${fmt(v.pnl30d)}%`
        return `${i + 1}\\. ${v.emoji} *${escMd(v.name)}* — ${pnlEmoji(v.pnl30d)} ${escMd(pnlStr)}`
      }),
    ]
    const kb = new InlineKeyboard()
    sorted.slice(0, 3).forEach((v) => {
      kb.text(`${v.emoji} ${v.name}`, `vault_detail:${v.pubkey}`).row()
    })
    kb.url('🌐 View All', 'https://potbot.fun/vaults')
    await ctx.editMessageText(lines.join('\n'), { parse_mode: 'MarkdownV2', reply_markup: kb })
    return
  }

  if (data.startsWith('vault_join:')) {
    await ctx.answerCallbackQuery('Opening vault on web app...')
    return
  }

  if (data === 'my_vaults:refresh') {
    await ctx.answerCallbackQuery('Portfolio refreshed ✓')
    return
  }

  await ctx.answerCallbackQuery()
}

// ─── Escape MarkdownV2 ────────────────────────────────────────────────────────

function escMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&')
}
