'use client'

import { useCallback } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

/**
 * Plain-English mapping for non-crypto users. Active only in light
 * (Normie) mode — dark mode is unaffected and keeps every term as-is.
 */
const TRANSLATIONS: Record<string, string> = {
  'Vault':            'POT',
  'Governance':       'Group decisions',
  'Governance Settings': 'Group decisions',
  'Proposal':         'Trade idea',
  'Proposals':        'Trade ideas',
  'TVL':              'Total in the pot',
  'PnL':              'Your result',
  'Execute swap':     'Make trade',
  'Shares':           'Your part',
  'Strategy':         'Plan',
  'Quorum':           'Votes needed',
  'Yield':            'Earnings',
  'AI Agent':         'Auto-pilot',
  'Members':          'People',
  'Authority':        'Creator',
  'Wallet':           'Account',
  'Deposit':          'Add money',
  'Withdraw':         'Take money',
  'Swap':             'Trade',
  'Vote':             'Decide',
  'On-chain':         'Live',
  'Onchain':          'Live',
  'Tokenized':        'Owned by everyone',
  'NAV':              'Pot value',
  'APY':              'Yearly return',
  'Liquidity':        'Pot money',
  'Slippage':         'Price wobble',
}

export type HumanTextFn = (key: string) => string

/**
 * `t(key)` returns the human-friendly label in light mode and the
 * original term in dark mode. Use it for any string that is also a DeFi
 * term — labels, headers, tab titles, button text.
 *
 * Example:
 *   const t = useHumanText()
 *   <h2>{t('Governance')}</h2>
 *   // dark mode → "Governance"
 *   // light mode → "Group decisions"
 */
export function useHumanText(): HumanTextFn {
  const { isLight } = useTheme()
  return useCallback(
    (key: string) => (isLight ? (TRANSLATIONS[key] ?? key) : key),
    [isLight],
  )
}
