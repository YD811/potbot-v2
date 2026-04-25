/**
 * Social-sentiment aggregation — pulls Twitter sentiment (LunarCrush) and
 * crypto news (CryptoPanic), then runs every text item through a local
 * VADER scorer for a second opinion. Returns an aggregated bullish/bearish
 * verdict the AI agent can ground proposals in.
 *
 * Sources:
 *   - LunarCrush API v4 — `LUNARCRUSH_API_KEY` env (free tier ~30 req/day).
 *     Provides pre-computed influencer sentiment + top tweets per asset.
 *   - CryptoPanic API   — `CRYPTOPANIC_API_KEY` env (free, key required).
 *     News headlines per coin with vote-derived sentiment labels.
 *   - VADER (vader-sentiment npm) — local rule-based scorer, no key. Used
 *     to validate / fall back when the keyed sources are unavailable.
 *
 * If neither key is set we degrade to "news-only via CryptoPanic public
 * endpoint" + VADER. Better than nothing, plenty for a hackathon demo.
 */

// @ts-ignore — vader-sentiment ships no types
import vader from 'vader-sentiment'

const LUNARCRUSH_BASE = 'https://lunarcrush.com/api4/public'
const CRYPTOPANIC_BASE = 'https://cryptopanic.com/api/v1'

// Symbol → LunarCrush "topic" slug. Mostly the same as ticker, lowercase.
const LC_TOPIC_MAP: Record<string, string> = {
  SOL: 'solana', USDC: 'usd-coin', USDT: 'tether',
  JUP: 'jupiter', WIF: 'dogwifhat', BONK: 'bonk',
  JITOSOL: 'jito-staked-sol', MSOL: 'marinade-staked-sol',
  BTC: 'bitcoin', ETH: 'ethereum',
}

// CryptoPanic uses uppercase tickers.
const CP_CURRENCY_MAP: Record<string, string> = {
  SOL: 'SOL', USDC: 'USDC', USDT: 'USDT',
  JUP: 'JUP', WIF: 'WIF', BONK: 'BONK',
  JITOSOL: 'SOL', MSOL: 'SOL',
  BTC: 'BTC', ETH: 'ETH',
}

// Reddit subs to scrape per token — public JSON, no key.
const REDDIT_SUBS_BY_SYMBOL: Record<string, string[]> = {
  SOL: ['solana', 'CryptoCurrency'],
  JUP: ['solana', 'jupiterexchange'],
  WIF: ['solana'],
  BONK: ['solana'],
  JITOSOL: ['solana'],
  MSOL: ['solana'],
  BTC: ['Bitcoin', 'CryptoCurrency'],
  ETH: ['ethereum', 'CryptoCurrency'],
}

export type Sentiment = 'bullish' | 'bearish' | 'neutral'

export interface ScoredText {
  text: string
  source: string
  url?: string
  author?: string
  engagement?: number
  vader_compound: number      // -1.0 .. 1.0
  vader_label: Sentiment
  external_label?: Sentiment  // pre-computed from LunarCrush / CryptoPanic
}

export interface SocialSentiment {
  topic: string
  resolved_token: string
  overall: Sentiment
  score: number               // -1.0 .. 1.0 weighted average
  confidence: 'low' | 'medium' | 'high'
  sources_used: string[]
  influencer_summary: string
  twitter: {
    sample_count: number
    bullish: number
    bearish: number
    neutral: number
    top_tweets: ScoredText[]
  }
  reddit: {
    sample_count: number
    bullish: number
    bearish: number
    neutral: number
    top_posts: ScoredText[]
  }
  news: {
    sample_count: number
    bullish: number
    bearish: number
    neutral: number
    top_headlines: ScoredText[]
  }
  warnings: string[]
}

// ── VADER helper ──────────────────────────────────────────────────────────

export function vaderScore(text: string): { compound: number; label: Sentiment } {
  // VADER's compound is in [-1, 1]; standard thresholds are ±0.05.
  const result = vader.SentimentIntensityAnalyzer.polarity_scores(text)
  const c: number = result?.compound ?? 0
  const label: Sentiment = c >= 0.05 ? 'bullish' : c <= -0.05 ? 'bearish' : 'neutral'
  return { compound: parseFloat(c.toFixed(3)), label }
}

// ── LunarCrush ────────────────────────────────────────────────────────────

interface LcInsight {
  text: string
  url?: string
  author?: string
  interactions?: number
  sentiment?: number  // 1..5 typically
}

async function fetchLunarCrush(symbol: string): Promise<{
  posts: LcInsight[]
  warning?: string
  topic_summary?: string
}> {
  const apiKey = process.env.LUNARCRUSH_API_KEY
  if (!apiKey) return { posts: [], warning: 'LUNARCRUSH_API_KEY not set — Twitter sentiment skipped' }

  const topic = LC_TOPIC_MAP[symbol.toUpperCase()] ?? symbol.toLowerCase()
  try {
    const res = await fetch(`${LUNARCRUSH_BASE}/topic/${topic}/posts/v1?limit=20`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return { posts: [], warning: `LunarCrush ${res.status}` }
    const json = await res.json() as any
    const data = json.data ?? []

    const posts: LcInsight[] = data.slice(0, 20).map((p: any) => ({
      text: p.post_title || p.post_content || '',
      url: p.post_link,
      author: p.creator_display_name || p.creator_name,
      interactions: p.interactions_24h ?? p.interactions_total ?? 0,
      sentiment: p.post_sentiment,
    })).filter((p: LcInsight) => p.text)

    return { posts, topic_summary: `top ${posts.length} posts about ${topic}` }
  } catch (err: any) {
    return { posts: [], warning: `LunarCrush unreachable: ${err.message ?? String(err)}` }
  }
}

// ── CryptoPanic ───────────────────────────────────────────────────────────

interface CpItem {
  title: string
  url: string
  source?: string
  votes?: { positive: number; negative: number; important: number }
}

async function fetchCryptoPanic(symbol: string): Promise<{
  items: CpItem[]
  warning?: string
}> {
  const currency = CP_CURRENCY_MAP[symbol.toUpperCase()] ?? symbol.toUpperCase()
  const apiKey = process.env.CRYPTOPANIC_API_KEY
  // CryptoPanic requires auth_token; without a key we try the public endpoint
  // which is rate-limited but partially works for demo.
  const auth = apiKey ? `&auth_token=${apiKey}` : ''

  try {
    const url = `${CRYPTOPANIC_BASE}/posts/?currencies=${currency}&kind=news&public=true${auth}`
    const res = await fetch(url)
    if (!res.ok) return { items: [], warning: `CryptoPanic ${res.status}${apiKey ? '' : ' (set CRYPTOPANIC_API_KEY for higher rate limits)'}` }
    const json = await res.json() as any
    const results = json.results ?? []

    const items: CpItem[] = results.slice(0, 20).map((r: any) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      source: r.source?.title ?? r.domain,
      votes: r.votes ?? { positive: 0, negative: 0, important: 0 },
    })).filter((i: CpItem) => i.title)

    return { items }
  } catch (err: any) {
    return { items: [], warning: `CryptoPanic unreachable: ${err.message ?? String(err)}` }
  }
}

// ── Reddit (no key, public JSON) ──────────────────────────────────────────

interface RedditPost {
  title: string
  selftext: string
  url: string
  subreddit: string
  score: number
  num_comments: number
  upvote_ratio: number
}

async function fetchReddit(symbol: string): Promise<{
  posts: RedditPost[]
  warning?: string
}> {
  const subs = REDDIT_SUBS_BY_SYMBOL[symbol.toUpperCase()] ?? ['CryptoCurrency']
  const query = symbol
  const collected: RedditPost[] = []
  const warnings: string[] = []

  await Promise.all(subs.map(async sub => {
    try {
      // Reddit returns 403/429 if no User-Agent.
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=top&t=week&limit=10`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PotBotMCP/0.5 (https://github.com/YD811/potbot-v2)' },
      })
      if (!res.ok) {
        warnings.push(`Reddit r/${sub}: ${res.status}`)
        return
      }
      const json = await res.json() as any
      const children = json.data?.children ?? []
      for (const c of children) {
        const d = c.data ?? {}
        if (!d.title) continue
        collected.push({
          title: d.title,
          selftext: (d.selftext ?? '').slice(0, 500),
          url: `https://reddit.com${d.permalink ?? ''}`,
          subreddit: sub,
          score: d.score ?? 0,
          num_comments: d.num_comments ?? 0,
          upvote_ratio: d.upvote_ratio ?? 0.5,
        })
      }
    } catch (err: any) {
      warnings.push(`Reddit r/${sub}: ${err.message ?? String(err)}`)
    }
  }))

  // Dedupe and rank by score
  const seen = new Set<string>()
  const unique = collected
    .filter(p => { if (seen.has(p.url)) return false; seen.add(p.url); return true })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)

  return { posts: unique, warning: warnings.length ? warnings.join('; ') : undefined }
}

// ── Aggregator ────────────────────────────────────────────────────────────

function lcSentimentToLabel(score?: number): Sentiment | undefined {
  if (score == null) return undefined
  // LunarCrush sentiment is 1..5 (1 very bearish, 5 very bullish); 3 = neutral.
  if (score >= 4) return 'bullish'
  if (score <= 2) return 'bearish'
  return 'neutral'
}

function votesToLabel(v?: CpItem['votes']): Sentiment | undefined {
  if (!v) return undefined
  const net = (v.positive ?? 0) - (v.negative ?? 0)
  if (net >= 2) return 'bullish'
  if (net <= -2) return 'bearish'
  return undefined
}

export async function getSocialSentiment(token: string): Promise<SocialSentiment> {
  const [lc, cp, rd] = await Promise.all([
    fetchLunarCrush(token),
    fetchCryptoPanic(token),
    fetchReddit(token),
  ])

  const warnings: string[] = []
  const sourcesUsed: string[] = ['VADER (local)']
  if (lc.warning) warnings.push(lc.warning); else sourcesUsed.push('LunarCrush')
  if (cp.warning) warnings.push(cp.warning); else sourcesUsed.push('CryptoPanic')
  if (rd.warning) warnings.push(rd.warning)
  if (rd.posts.length > 0) sourcesUsed.push('Reddit')

  // Score Twitter (LunarCrush)
  const tweets: ScoredText[] = lc.posts.map(p => {
    const v = vaderScore(p.text)
    return {
      text: p.text.slice(0, 280),
      source: 'LunarCrush',
      url: p.url,
      author: p.author,
      engagement: p.interactions,
      vader_compound: v.compound,
      vader_label: v.label,
      external_label: lcSentimentToLabel(p.sentiment),
    }
  })
  const tweetCounts = countLabels(tweets)

  // Score Reddit
  const reddits: ScoredText[] = rd.posts.map(p => {
    const text = `${p.title}. ${p.selftext}`.slice(0, 1000)
    const v = vaderScore(text)
    return {
      text: p.title.slice(0, 280),
      source: `r/${p.subreddit}`,
      url: p.url,
      engagement: p.score + p.num_comments,
      vader_compound: v.compound,
      vader_label: v.label,
    }
  })
  const redditCounts = countLabels(reddits)

  // Score News (CryptoPanic)
  const headlines: ScoredText[] = cp.items.map(i => {
    const v = vaderScore(i.title)
    return {
      text: i.title,
      source: i.source ?? 'CryptoPanic',
      url: i.url,
      vader_compound: v.compound,
      vader_label: v.label,
      external_label: votesToLabel(i.votes),
    }
  })
  const newsCounts = countLabels(headlines)

  // Overall weighting: Twitter 50% (highest signal), Reddit 30%, news 20%.
  // Renormalised across the sources that actually returned data.
  const tweetAvg = avgCompound(tweets)
  const redditAvg = avgCompound(reddits)
  const newsAvg = avgCompound(headlines)
  let overallScore = 0
  let weight = 0
  if (tweets.length > 0) { overallScore += tweetAvg * 0.5; weight += 0.5 }
  if (reddits.length > 0) { overallScore += redditAvg * 0.3; weight += 0.3 }
  if (headlines.length > 0) { overallScore += newsAvg * 0.2; weight += 0.2 }
  if (weight > 0) overallScore = overallScore / weight
  const overall: Sentiment = overallScore >= 0.05 ? 'bullish' : overallScore <= -0.05 ? 'bearish' : 'neutral'

  const sampleSize = tweets.length + reddits.length + headlines.length
  let confidence: SocialSentiment['confidence'] = 'low'
  if (sampleSize >= 25) confidence = 'high'
  else if (sampleSize >= 10) confidence = 'medium'

  const summaryParts = []
  if (tweets.length > 0)
    summaryParts.push(`Twitter ${tweetCounts.bullish}↑/${tweetCounts.bearish}↓/${tweetCounts.neutral}→ of ${tweets.length}`)
  if (reddits.length > 0)
    summaryParts.push(`Reddit ${redditCounts.bullish}↑/${redditCounts.bearish}↓/${redditCounts.neutral}→ of ${reddits.length}`)
  if (headlines.length > 0)
    summaryParts.push(`News ${newsCounts.bullish}↑/${newsCounts.bearish}↓/${newsCounts.neutral}→ of ${headlines.length}`)
  const summary = summaryParts.length > 0 ? summaryParts.join(' · ') : 'no data from any source'

  return {
    topic: token,
    resolved_token: token.toUpperCase(),
    overall,
    score: parseFloat(overallScore.toFixed(3)),
    confidence,
    sources_used: sourcesUsed,
    influencer_summary: summary,
    twitter: {
      sample_count: tweets.length,
      ...tweetCounts,
      top_tweets: tweets
        .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
        .slice(0, 10),
    },
    reddit: {
      sample_count: reddits.length,
      ...redditCounts,
      top_posts: reddits.slice(0, 10),
    },
    news: {
      sample_count: headlines.length,
      ...newsCounts,
      top_headlines: headlines.slice(0, 10),
    },
    warnings,
  }
}

function countLabels(items: ScoredText[]) {
  let bullish = 0, bearish = 0, neutral = 0
  for (const i of items) {
    // If external label is present prefer it (signal from real engagement),
    // otherwise fall back to VADER's reading.
    const label = i.external_label ?? i.vader_label
    if (label === 'bullish') bullish++
    else if (label === 'bearish') bearish++
    else neutral++
  }
  return { bullish, bearish, neutral }
}

function avgCompound(items: ScoredText[]): number {
  if (items.length === 0) return 0
  return items.reduce((acc, i) => acc + i.vader_compound, 0) / items.length
}
