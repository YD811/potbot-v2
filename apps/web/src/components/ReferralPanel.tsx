'use client'

import { useState, useCallback, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMockStore } from '@/lib/mock-store'

interface Props {
  potPubkey: string
  potName: string
}

const APP_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.potbot.fun'

export default function ReferralPanel({ potPubkey, potName }: Props) {
  const { publicKey } = useWallet()
  const userWallet = publicKey?.toString() ?? ''

  const referrals = useMockStore((s) => s.referrals)
  const getReferralStats = useMockStore((s) => s.getReferralStats)

  const [copied, setCopied] = useState(false)

  const refLink = userWallet
    ? `${APP_URL}/pots/${potPubkey}?ref=${userWallet}`
    : ''

  const shortRef = userWallet
    ? `${userWallet.slice(0, 4)}…${userWallet.slice(-4)}`
    : '—'

  const stats = useMemo(() => {
    if (!userWallet) return null
    return getReferralStats(potPubkey, userWallet)
  }, [getReferralStats, potPubkey, userWallet, referrals])

  const copyLink = useCallback(() => {
    if (!refLink) return
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [refLink])

  const shareTwitter = useCallback(() => {
    const text = encodeURIComponent(
      `Join me in the "${potName}" vault on PotBot — group DeFi trading on Solana 🚀\n${refLink}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }, [refLink, potName])

  const shareTelegram = useCallback(() => {
    const text = encodeURIComponent(`Join "${potName}" vault on PotBot — group DeFi trading on Solana 🚀`)
    window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${text}`, '_blank')
  }, [refLink, potName])

  if (!userWallet) {
    return (
      <div className="bg-pot-card border border-pot-border rounded-2xl p-10 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h3 className="text-lg font-bold text-white mb-2">Connect wallet to get your referral link</h3>
        <p className="text-pot-muted text-sm">
          Earn 10% of every entry fee from people who join through your link.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div className="bg-gradient-to-br from-pot-accent/10 to-pot-green/5 border border-pot-accent/20 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🔗</div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Referral Program</h2>
            <p className="text-sm text-pot-muted">
              Invite members to <span className="text-white font-semibold">{potName}</span> and earn a share of every entry fee, automatically, on-chain.
            </p>
          </div>
        </div>
      </div>

      {/* Fee split */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Entry Fee Distribution</h3>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-6 rounded-full overflow-hidden flex text-[10px] font-bold">
            <div className="bg-pot-green flex items-center justify-center text-pot-dark" style={{ width: '70%' }}>70% Creator</div>
            <div className="bg-pot-accent flex items-center justify-center text-white" style={{ width: '20%' }}>20%</div>
            <div className="bg-yellow-400 flex items-center justify-center text-pot-dark" style={{ width: '10%' }}>10%</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-pot-green/10 rounded-lg p-2">
            <div className="font-bold text-pot-green text-sm">70%</div>
            <div className="text-pot-muted">Strategy Creator</div>
          </div>
          <div className="bg-pot-accent/10 rounded-lg p-2">
            <div className="font-bold text-pot-accent text-sm">20%</div>
            <div className="text-pot-muted">PotBot Protocol</div>
          </div>
          <div className="bg-yellow-400/10 rounded-lg p-2">
            <div className="font-bold text-yellow-400 text-sm">10%</div>
            <div className="text-pot-muted">You (Referrer)</div>
          </div>
        </div>
        <p className="text-xs text-pot-muted mt-3 text-center">
          ✓ Paid automatically in the same transaction · ✓ Fully on-chain · ✓ No claiming needed
        </p>
      </div>

      {/* Your referral link */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Your Referral Link</h3>
          <span className="text-xs text-pot-muted font-mono bg-pot-dark px-2 py-0.5 rounded-full">ref: {shortRef}</span>
        </div>
        <div
          className="flex items-center gap-3 bg-pot-dark border border-pot-border rounded-xl px-4 py-3 cursor-pointer hover:border-pot-green/40 transition-colors"
          onClick={copyLink}
        >
          <span className="flex-1 font-mono text-xs text-pot-muted truncate">{refLink}</span>
          <button className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            copied ? 'bg-pot-green/20 text-pot-green' : 'bg-pot-border text-pot-muted hover:text-white'
          }`}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={shareTwitter}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1d9bf0]/10 hover:bg-[#1d9bf0]/20 text-[#1d9bf0] border border-[#1d9bf0]/20 rounded-xl text-sm font-semibold transition"
          >
            𝕏 Share on X
          </button>
          <button
            onClick={shareTelegram}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#2AABEE]/10 hover:bg-[#2AABEE]/20 text-[#2AABEE] border border-[#2AABEE]/20 rounded-xl text-sm font-semibold transition"
          >
            ✈️ Telegram
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Your Stats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-pot-dark rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{stats.totalReferrals}</div>
              <div className="text-xs text-pot-muted mt-0.5">Referrals</div>
            </div>
            <div className="bg-pot-dark rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-pot-green">{stats.level1Count}</div>
              <div className="text-xs text-pot-muted mt-0.5">Level 1</div>
            </div>
            <div className="bg-pot-dark rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-pot-accent">{stats.level2Count}</div>
              <div className="text-xs text-pot-muted mt-0.5">Level 2</div>
            </div>
            <div className="bg-pot-dark rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.totalEarnings.toFixed(4)}</div>
              <div className="text-xs text-pot-muted mt-0.5">SOL Earned</div>
            </div>
          </div>
          {stats.totalEarnings > 0 && (
            <div className="border-t border-pot-border pt-4 space-y-2">
              <h4 className="text-xs font-semibold text-pot-muted uppercase tracking-wider">Earnings Breakdown</h4>
              <div className="flex justify-between text-sm">
                <span className="text-pot-muted">Level 1 (10% of entry fee)</span>
                <span className="text-pot-green font-mono font-bold">+{stats.level1Earnings.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-pot-muted">Level 2 (2% of entry fee)</span>
                <span className="text-pot-accent font-mono font-bold">+{stats.level2Earnings.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between text-sm border-t border-pot-border pt-2">
                <span className="text-white font-semibold">Total</span>
                <span className="text-yellow-400 font-mono font-bold">+{stats.totalEarnings.toFixed(4)} SOL</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2-level explained */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">2-Level Referral System</h3>
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-pot-green/20 text-pot-green flex items-center justify-center font-bold text-sm shrink-0">1</div>
            <div>
              <p className="text-sm font-semibold text-white">Direct referral — 10%</p>
              <p className="text-xs text-pot-muted mt-0.5">Someone joins using your link → you earn 10% of their entry fee instantly.</p>
            </div>
          </div>
          <div className="ml-4 text-pot-muted text-xs">└──</div>
          <div className="flex gap-3 items-start ml-4">
            <div className="w-8 h-8 rounded-full bg-pot-accent/20 text-pot-accent flex items-center justify-center font-bold text-sm shrink-0">2</div>
            <div>
              <p className="text-sm font-semibold text-white">Sub-referral — 2%</p>
              <p className="text-xs text-pot-muted mt-0.5">Your referral invites someone else → you earn 2% of their entry fee too.</p>
            </div>
          </div>
        </div>
        <div className="bg-pot-dark rounded-xl p-3 text-xs text-pot-muted space-y-1">
          <p className="text-white font-semibold mb-2">💡 Example</p>
          <p>Alice deposits 10 SOL via your link → you earn <span className="text-pot-green font-bold">0.1 SOL</span></p>
          <p>Alice refers Bob (5 SOL deposit) → you earn <span className="text-pot-accent font-bold">0.01 SOL</span> extra</p>
          <p className="text-yellow-400 font-semibold pt-1">Your total: 0.11 SOL from 2 deposits, zero effort</p>
        </div>
      </div>

      {/* Referral history */}
      {stats && stats.referralList.length > 0 && (
        <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">Referral History</h3>
          <div className="space-y-2">
            {stats.referralList.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-pot-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    r.level === 1 ? 'bg-pot-green/20 text-pot-green' : 'bg-pot-accent/20 text-pot-accent'
                  }`}>L{r.level}</span>
                  <span className="text-xs font-mono text-pot-muted">{r.referee.slice(0, 6)}…{r.referee.slice(-4)}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-yellow-400">+{r.earnings.toFixed(4)} SOL</span>
                  <div className="text-[10px] text-pot-muted">{new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {(!stats || stats.totalReferrals === 0) && (
        <div className="bg-pot-card border border-dashed border-pot-green/30 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-3">🚀</div>
          <p className="text-sm text-white font-semibold mb-1">Start earning passive SOL</p>
          <p className="text-xs text-pot-muted mb-4">
            Copy your link above and share it — every time someone joins through you, SOL lands in your wallet automatically.
          </p>
          <button
            onClick={copyLink}
            className="px-6 py-2.5 bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold rounded-xl text-sm transition"
          >
            🔗 Copy My Referral Link
          </button>
        </div>
      )}
    </div>
  )
}
