'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Modal } from '@potbot/ui'
import { Spinner } from '@potbot/ui'

interface CreatePotModalProps {
  open: boolean
  onClose: () => void
  onCreated?: (pubkey: string) => void
}

const YIELD_OPTIONS = [
  { value: 'none', label: 'None', desc: 'No yield — pure trading vault' },
  { value: 'conservative', label: 'Conservative', desc: 'Kamino stablecoins · 3–6% APY' },
  { value: 'balanced', label: 'Balanced', desc: 'Mixed lending · 10–25% APY' },
  { value: 'aggressive', label: 'Aggressive', desc: 'High-risk farms · 20–50%+ APY' },
]

const GOV_OPTIONS = [
  { value: 0, label: 'Autocracy', desc: 'Owner decides everything instantly' },
  { value: 1, label: 'Advisory', desc: 'Owner leads, majority can veto' },
  { value: 2, label: 'Majority', desc: 'Democratic — 51% required (default)' },
  { value: 3, label: 'Supermajority', desc: 'High conviction — 66%+ required' },
  { value: 4, label: 'Consensus', desc: 'All members must agree' },
]

const EMOJI_OPTIONS = ['🪴', '🐉', '🦅', '🐤', '🦊', '🐸', '🌿', '💎', '🔥', '⚡']

const TOKEN_GATE_EXAMPLES = [
  { label: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u' },
  { label: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7' },
  { label: 'WIF', mint: 'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ' },
]

export function CreatePotModal({ open, onClose, onCreated }: CreatePotModalProps) {
  const { publicKey } = useWallet()
  const { connection } = useConnection()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🪴')
  const [isPublic, setIsPublic] = useState(true)
  const [minDeposit, setMinDeposit] = useState('0.1')
  const [tokenGate, setTokenGate] = useState('')
  const [requireTokenGate, setRequireTokenGate] = useState(false)
  const [yieldStrategy, setYieldStrategy] = useState('none')
  const [govLevel, setGovLevel] = useState(2)

  const canProceed1 = name.trim().length >= 2 && name.trim().length <= 32

  async function handleCreate() {
    if (!publicKey) return
    setLoading(true)
    setError(null)

    try {
      // TODO: replace with real SDK call once program IDs are deployed
      // const sdk = new PotSDK({ rpcUrl: process.env.NEXT_PUBLIC_RPC_URL! })
      // await sdk.createPot({ name, isPublic, minDeposit: ..., yieldStrategy, govLevel })

      // Mock success for now
      await new Promise(r => setTimeout(r, 1500))
      const mockPubkey = 'pot' + Math.random().toString(36).slice(2, 14).padEnd(40, '1')
      onCreated?.(mockPubkey)
      handleClose()
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep(1)
    setName('')
    setEmoji('🪴')
    setIsPublic(true)
    setMinDeposit('0.1')
    setTokenGate('')
    setRequireTokenGate(false)
    setYieldStrategy('none')
    setGovLevel(2)
    setError(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} className="max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#1A2332]">
        <div>
          <h2 className="text-xl font-display font-bold">Create a POT</h2>
          <p className="text-xs text-gray-400 mt-0.5">Step {step} of 3</p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex px-6 pt-4 gap-2">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-[#9945FF]' : 'bg-[#1A2332]'
            }`}
          />
        ))}
      </div>

      <div className="p-6 space-y-5">
        {/* ── Step 1: Identity ── */}
        {step === 1 && (
          <>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">POT Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Alpha Fund, Degen Vault…"
                maxLength={32}
                className="w-full bg-[#0D1117] border border-[#1A2332] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#9945FF] transition-colors"
              />
              <div className="text-xs text-gray-600 mt-1 text-right">{name.length}/32</div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Mascot Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                      emoji === e
                        ? 'bg-[#9945FF]/30 ring-2 ring-[#9945FF]'
                        : 'bg-[#1A2332] hover:bg-[#243044]'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Public / Private toggle */}
            <div className={`rounded-xl border transition-all ${isPublic ? 'border-[#9945FF]/40 bg-[#9945FF]/5' : 'border-[#1A2332] bg-[#1A2332]/50'}`}>
              <div className="flex items-center justify-between py-3 px-4">
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    {isPublic ? '🌍 Public POT' : '🔒 Private POT'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {isPublic
                      ? 'Visible on the leaderboard — anyone can request to join'
                      : 'Hidden from leaderboard — invite-only access'}
                  </div>
                </div>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                    isPublic ? 'bg-[#9945FF]' : 'bg-[#1A2332]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      isPublic ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {isPublic && (
                <div className="flex items-center gap-2 px-4 py-2 border-t border-[#9945FF]/20 text-[10px] text-[#9945FF]/70">
                  <span>🏆</span>
                  <span>This pot will appear in the public leaderboard and can attract new members</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Min Deposit (SOL)</label>
              <input
                type="number"
                value={minDeposit}
                onChange={e => setMinDeposit(e.target.value)}
                min="0"
                step="0.1"
                className="w-full bg-[#0D1117] border border-[#1A2332] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#9945FF] transition-colors"
              />
            </div>

            {/* Token Gate Section */}
            <div className="border-t border-[#1A2332] pt-5">
              <div className="flex items-center justify-between py-3 px-4 bg-[#1A2332]/50 rounded-xl mb-4">
                <div>
                  <div className="text-sm font-medium">Require Token to Join</div>
                  <div className="text-xs text-gray-400">Only wallets holding this token can join your POT</div>
                </div>
                <button
                  onClick={() => setRequireTokenGate(!requireTokenGate)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    requireTokenGate ? 'bg-[#9945FF]' : 'bg-[#1A2332]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      requireTokenGate ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {requireTokenGate && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Token Mint Address</label>
                    <input
                      type="text"
                      value={tokenGate}
                      onChange={e => setTokenGate(e.target.value)}
                      placeholder="e.g. TokenkegQfeZyiNwAJsyFbPVwwQnoxwUUKHVrCqFb..."
                      className="w-full bg-[#0D1117] border border-[#1A2332] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#9945FF] transition-colors text-xs"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-2">Quick select:</p>
                    <div className="flex flex-wrap gap-2">
                      {TOKEN_GATE_EXAMPLES.map(token => (
                        <button
                          key={token.mint}
                          onClick={() => setTokenGate(token.mint)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            tokenGate === token.mint
                              ? 'bg-[#9945FF] text-white'
                              : 'bg-[#1A2332] text-gray-300 hover:text-white'
                          }`}
                        >
                          {token.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Step 2: Yield Strategy ── */}
        {step === 2 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-4">
              Choose how idle SOL in the vault earns yield between trades.
            </p>
            {YIELD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setYieldStrategy(opt.value)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                  yieldStrategy === opt.value
                    ? 'border-[#9945FF] bg-[#9945FF]/10'
                    : 'border-[#1A2332] bg-[#0D1117] hover:border-[#243044]'
                }`}
              >
                <div className="font-semibold text-sm">{opt.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* ── Step 3: Governance ── */}
        {step === 3 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-4">
              Set the governance level for trade decisions. You can configure per-action later.
            </p>
            {GOV_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGovLevel(opt.value)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                  govLevel === opt.value
                    ? 'border-[#9945FF] bg-[#9945FF]/10'
                    : 'border-[#1A2332] bg-[#0D1117] hover:border-[#243044]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-[#9945FF]/20 text-[#9945FF] px-1.5 py-0.5 rounded">
                    L{opt.value}
                  </span>
                  <span className="font-semibold text-sm">{opt.label}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
              </button>
            ))}

            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 rounded-xl px-4 py-3 mt-2">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t border-[#1A2332]">
        {step > 1 ? (
          <button
            onClick={() => setStep(s => s - 1)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && !canProceed1}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={loading}
            className="btn-primary disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? <><Spinner size="sm" /> Creating…</> : '🪴 Create POT'}
          </button>
        )}
      </div>
    </Modal>
  )
}