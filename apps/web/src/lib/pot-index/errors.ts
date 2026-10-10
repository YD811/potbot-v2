/** Turn wallet / RPC / program errors into one line a holder can act on. */
export function friendlyError(e: unknown, ctx: { devnet?: boolean } = {}): string {
  const raw = e instanceof Error ? e.message : String(e)
  const m = raw.toLowerCase()
  const faucet = ctx.devnet ? ' Click Get test USDC below: on devnet it also sends SOL for fees.' : ''

  if (m.includes('user rejected') || m.includes('rejected the request') || m.includes('user denied') || m.includes('cancelled') || m.includes('canceled'))
    return 'Cancelled in the wallet. Nothing was sent.'
  if (m.includes('insufficient lamports') || m.includes('insufficient funds for rent') || m.includes('found no record of a prior credit') || m.includes('debit an account but found no record'))
    return `Not enough SOL in the wallet to pay fees and the refundable rent of the price accounts.${faucet}`
  if (m.includes('blockhash not found') || m.includes('block height exceeded') || m.includes('transaction expired'))
    return 'The network dropped the transaction before it confirmed. Nothing changed, try again.'
  if (m.includes('too many requests') || m.includes('429'))
    return 'The RPC is rate-limiting right now. Wait a few seconds and try again.'

  // Program errors by name (Anchor puts the name in the message).
  const named: [string, string][] = [
    ['StalePrice', 'A price feed is older than the program allows (5 minutes). For stock POTfolios this means the market is closed; deposits reopen with live prices, redeeming for assets always works.'],
    ['OracleConfidence', 'A price feed is too uncertain right now (confidence band over 2%). Try again in a minute.'],
    ['RebalanceSlippage', 'The sale would have returned less than the on-chain minimum, so the program reverted it. Nothing left your wallet. Try again when prices settle.'],
    ['SlippageShares', 'The price moved and you would receive fewer tokens than the minimum you accepted. Try again.'],
    ['DepositBelowMinimum', 'Deposits start at 1 USDC.'],
    ['DepositCapExceeded', 'This POTfolio is at its size cap. The creator can raise it.'],
    ['PotPaused', 'The creator paused deposits on this POTfolio. Redeeming still works.'],
    ['ProtocolPaused', 'The protocol is paused for deposits. Redeeming still works.'],
    ['SelfReferral', 'A referral link cannot point to your own wallet.'],
    ['Cooldown', 'This leg was rebalanced moments ago; the cooldown has not elapsed.'],
    ['MissingClose', 'The transaction was not built as one atomic open/close pair. Reload the page and try again.'],
    ['ZeroShares', 'Nothing to redeem.'],
  ]
  for (const [name, text] of named) if (raw.includes(name)) return text

  // SPL token: insufficient funds (custom program error 0x1 from the token program)
  if (m.includes('insufficient funds') || /custom program error: 0x1\b/.test(m))
    return `Not enough USDC or tokens in the wallet for this amount.${ctx.devnet ? ' Get test USDC below.' : ''}`
  if (m.includes('simulation failed'))
    return 'The transaction would fail on-chain, so the wallet refused to send it. Reload the page and try again; if it repeats, the activity feed shows the last state.'
  return raw.length > 240 ? raw.slice(0, 240) + '…' : raw
}
