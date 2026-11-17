/**
 * BAG mint check. Run before setting NEXT_PUBLIC_BAG_ANT_MINT (or any new leg).
 *
 *   npx tsx scripts/bag-check-mint.ts <mint> [--expect-symbol ANT] [--rpc <url>]
 *
 * Read-only: no keys, no transactions. Checks, in order:
 *   1. On-chain mint: token program, decimals, mint/freeze authority, Token-2022 extensions.
 *   2. Blocking extensions for a non-custodial buy into a user's own wallet:
 *      transfer hook (issuer can reject transfers to wallets it has not approved),
 *      default frozen accounts, non-transferable. Any of these → NO.
 *   3. Jupiter token data: verified flag, holders, liquidity, symbol.
 *   4. Jupiter quotes USDC → mint for $100 and $500: route found, price impact.
 *
 * A green result is necessary, not sufficient: the mint must ALSO match the
 * issuer's own official list (Backpack / Sunrise / xStocks / Ondo). Fake
 * "ANTX" tokens with a few thousand dollars of liquidity already exist.
 */

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
const MAX_IMPACT_PCT = Number(process.env.NEXT_PUBLIC_BAG_MAX_PRICE_IMPACT_PCT ?? '2')
const QUOTE_TAKER = 'FMbbcRhygSdTGgSCPv4V9GEmr3RPzehhVDFtDsG6WDw9' // any valid wallet; quotes only

type Level = 'ok' | 'warn' | 'block'
const findings: { level: Level; text: string }[] = []
const note = (level: Level, text: string) => findings.push({ level, text })

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : undefined
}

async function rpc(url: string, method: string, params: unknown[]) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })
  const j = (await r.json()) as { result?: any; error?: { message: string } }
  if (j.error) throw new Error(`RPC ${method}: ${j.error.message}`)
  return j.result
}

async function main() {
  const mint = process.argv[2]
  if (!mint || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    console.error('usage: npx tsx scripts/bag-check-mint.ts <mint> [--expect-symbol ANT] [--rpc <url>]')
    process.exit(2)
  }
  const rpcUrl = arg('--rpc') ?? process.env.BAG_RPC_URL ?? 'https://api.mainnet-beta.solana.com'
  const expectSymbol = arg('--expect-symbol')

  // 1. On-chain
  const acc = await rpc(rpcUrl, 'getAccountInfo', [mint, { encoding: 'jsonParsed' }])
  const v = acc?.value
  if (!v) throw new Error('Mint account not found on mainnet')
  const program: string = v.owner
  const info = v.data?.parsed?.info ?? {}
  if (v.data?.parsed?.type !== 'mint') note('block', `Account is not a mint (type ${v.data?.parsed?.type})`)
  const isT22 = program === TOKEN_2022
  if (program !== TOKEN && !isT22) note('block', `Unknown token program ${program}`)

  const exts: { extension: string; state?: any }[] = info.extensions ?? []
  const extNames = exts.map(e => e.extension)
  const ext = (n: string) => exts.find(e => e.extension === n)

  if (ext('transferHook')?.state?.programId) note('block', `Transfer hook (${ext('transferHook')!.state.programId}): the issuer's program can reject transfers to wallets it has not approved. A buy into a user's wallet may fail.`)
  else if (ext('transferHook')) note('warn', 'Transfer hook extension present but no program set')
  if (ext('defaultAccountState')?.state?.accountState === 'frozen') note('block', 'New token accounts start frozen: a buy into a fresh wallet fails until the issuer thaws it.')
  if (ext('nonTransferable')) note('block', 'Non-transferable token')
  if (ext('permanentDelegate')) note('warn', `Permanent delegate ${ext('permanentDelegate')!.state?.delegate}: the issuer can move or burn tokens from any wallet.`)
  if (ext('pausableConfig') || ext('pausable')) note('warn', 'Pausable: the issuer can stop all transfers.')
  if (ext('scaledUiAmountConfig') || ext('scaledUiAmount')) note('warn', 'Scaled UI amount: displayed balance = raw × multiplier (corporate actions). Check that holdings show the scaled amount.')
  const fee = ext('transferFeeConfig')?.state
  const feeBps = Math.max(Number(fee?.newerTransferFee?.transferFeeBasisPoints ?? 0), Number(fee?.olderTransferFee?.transferFeeBasisPoints ?? 0))
  if (fee && feeBps > 0) note('warn', `Transfer fee ${feeBps} bps is active`)
  else if (fee) note('ok', 'Transfer fee config present, currently 0')
  if (info.freezeAuthority) note('warn', `Freeze authority ${info.freezeAuthority}: the issuer can freeze any holder.`)
  if (info.mintAuthority) note('ok', `Mint authority ${info.mintAuthority} (expected for an issued asset)`)

  // 3. Jupiter token data
  let jt: any = null
  try {
    const r = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${mint}`)
    const list = (await r.json()) as any[]
    jt = Array.isArray(list) ? list.find(t => t.id === mint) ?? null : null
  } catch { /* no token data */ }
  if (!jt) note('warn', 'Jupiter has no token data for this mint')
  else {
    if (jt.isVerified) note('ok', 'Verified on Jupiter')
    else note('warn', 'Not verified on Jupiter (normal in the first hours; the issuer list is the source of truth)')
    if (expectSymbol && !String(jt.symbol).toUpperCase().includes(expectSymbol.toUpperCase())) note('block', `Symbol ${jt.symbol} does not match expected ${expectSymbol}`)
    if ((jt.holderCount ?? 0) < 50) note('warn', `Only ${jt.holderCount ?? 0} holders`)
  }

  // 4. Quotes
  const quotes: { usd: number; ok: boolean; impactPct?: number; out?: string; router?: string; err?: string }[] = []
  for (const usd of [100, 500]) {
    const q = new URLSearchParams({ inputMint: USDC, outputMint: mint, amount: String(usd * 1e6), taker: QUOTE_TAKER, slippageBps: '100' })
    try {
      const r = await fetch(`https://api.jup.ag/swap/v2/order?${q}`, { headers: process.env.JUPITER_API_KEY ? { 'x-api-key': process.env.JUPITER_API_KEY } : {} })
      const j = (await r.json()) as any
      if (!j.outAmount || j.outAmount === '0') { quotes.push({ usd, ok: false, err: j.error ?? j.errorMessage ?? `HTTP ${r.status}` }); continue }
      const impactPct = Math.abs(typeof j.priceImpact === 'number' ? j.priceImpact : Number(j.priceImpactPct ?? 0) * 100)
      quotes.push({ usd, ok: true, impactPct, out: j.outAmount, router: j.router })
    } catch (e) {
      quotes.push({ usd, ok: false, err: e instanceof Error ? e.message : String(e) })
    }
  }
  for (const q of quotes) {
    if (!q.ok) note('block', `No Jupiter route for $${q.usd}: ${q.err}`)
    else if ((q.impactPct ?? 0) > MAX_IMPACT_PCT) note(q.usd === 100 ? 'block' : 'warn', `$${q.usd}: price impact ${q.impactPct!.toFixed(2)}% is above the ${MAX_IMPACT_PCT}% limit`)
    else note('ok', `$${q.usd}: route via ${q.router}, price impact ${q.impactPct!.toFixed(3)}%`)
  }

  // Report
  const verdict = findings.some(f => f.level === 'block') ? 'NO' : findings.some(f => f.level === 'warn') ? 'GO WITH RISK BADGES' : 'GO'
  console.log(`\nMint     ${mint}`)
  console.log(`Name     ${jt?.name ?? '?'} (${jt?.symbol ?? '?'})`)
  console.log(`Program  ${isT22 ? 'Token-2022' : program === TOKEN ? 'SPL Token' : program}`)
  console.log(`Decimals ${info.decimals}`)
  console.log(`Extensions ${extNames.length ? extNames.join(', ') : 'none'}`)
  console.log(`Jupiter  holders=${jt?.holderCount ?? '?'} liquidity=$${Math.round(jt?.liquidity ?? 0).toLocaleString('en-US')}\n`)
  for (const f of findings) console.log(`${f.level === 'ok' ? '  ok ' : f.level === 'warn' ? ' WARN' : ' STOP'}  ${f.text}`)
  console.log(`\nVerdict: ${verdict}`)
  if (verdict !== 'NO') {
    console.log('\nIf this mint ALSO matches the issuer’s official list, set on Vercel:')
    console.log(`  NEXT_PUBLIC_BAG_ANT_MINT=${mint}`)
    console.log(`  NEXT_PUBLIC_BAG_ANT_DECIMALS=${info.decimals}`)
    if (jt?.symbol) console.log(`  NEXT_PUBLIC_BAG_ANT_SYMBOL=${jt.symbol}`)
  }
  process.exit(verdict === 'NO' ? 1 : 0)
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(2) })
