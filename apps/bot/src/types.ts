import type { Context, SessionFlavor } from 'grammy'

/**
 * Bot session data persisted per Telegram user.
 * Stored in-memory by default; swap storage adapter for Redis/Supabase in prod.
 */
export interface SessionData {
  /** Linked Solana wallet address (base58). Null until user connects via app. */
  walletAddress: string | null
  /** Last POT pubkey the user interacted with — used as default for /swap, /duel. */
  activePot: string | null
}

/**
 * Flavored grammY Context that carries the typed session.
 * Import this in every command file instead of bare `Context`.
 */
export type BotContext = Context & SessionFlavor<SessionData>
