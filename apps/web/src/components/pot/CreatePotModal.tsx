'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Modal } from '@potbot/ui'
import { Spinner } from '@potbot/ui'
import { useCreatePot } from '@/hooks/usePots'

interface CreatePotModalProps {
  open: boolean
  onClose: () => void
  onCreated?: (pubkey: string) => void
}

const YIELD_OPTIONS = [
  { value: 0, label: 'None', desc: 'No yield — pure trading vault' },
  { value: 1, label: 'Conservative', desc: 'Kamino stablecoins · 3–6% APY' },
  { value: 2, label: 'Balanced', desc: 'Mixed lending · 10–25% APY' },
  { value: 3, label: 'Aggressive', desc: 'High-risk farms · 20–50%+ APY' },
]

const GOV_OPTIONS = [
  { value: 0, label: 'Autocracy', desc: 'Owner decides everything instantly' },
  { value: 1, label: 'Advisory', desc: 'Owner leads, majority can veto' },
  { value: 2, label: 'Majority', desc: 'Democratic — 51% required (default)' },
  { value: 3, label: 'Supermajority', desc: 'High conviction — 66%+ required' },
  { value: 4, label: 'Consensus', desc: 'All members must agree' },
]

const TRADE_SIZE_OPTIONS = [
  { value: 500,  label: '5%',   desc: 'Very conservative — small bites' },
  { value: 1000, label: '10%',  desc: 'Conservative — balanced risk' },
  { value: 2000, label: '20%',  desc: 'Standard — recommended' },
  { value: 5000, label: '50%',  desc: 'Aggressive — high conviction trades' },
  { value: 0,    label: '∞',    desc: 'No limit — full vault per trade' },
]

const EMOJI_OPTIONS = ['🪴', '🐉', '🦅', '🐤', '🦊', '🐸', '🌿', '💎', '🔥', '⚡']

export function CreatePotModal({ open, onClose, onCreated }: CreatePotModalProps) {
  const { publicKey } = useWallet()
  const createPot = useCreatePot()

  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Identity
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🪴')
  const [isPublic, setIsPublic] = useState(true)
  const [minDeposit, setMinDeposit] = useState('0.1')

  // Step 2: Yield
  const [yieldStrategy, setYieldStrategy] = useState(0)

  // Step 3: Governance & Risk
  const [govLevel, setGovLevel] = useState(2)
  const [maxTradeSizeBps, setMaxTradeSizeBps] = useState(2000)

  const canProceed1 = name.trim().length >= 2 && name.trim().length <= 32

  async function handleCreate() {
    if (!publicKey) return
    setError(null)

    try {
      const result = await createPot.mutateAsync({
        name: name.trim(),
        emoji,
        isPublic,
        minDeposit: parseFloat(minDeposit) || 0.01,
        lockupSeconds: 0,
        yieldStrategy,
        tradeLevel: govLevel,
        withdrawLevel: Math.min(govLevel + 1, 4),
        maxTradeSizeBps,
        maxMembers: 0,
        protocolFeeBps: 0,
      })
      onCreated?.(result.potAddress)
      handleClose()
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed')
    }
  }

  function handleClose() {
    setStep(1)
    setName('')
    setEmoji('🪴')
    setIsPublic(true)
    setMinDeposit('0.1')
    setYieldStrategy(0)
    setGovLevel(2)
    setMaxTradeSizeBps(2000)
    setError(null)
    onClose()
  }

  const loading = createPot.isPending

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

        {/* ── Step 3: Governance & Risk ── */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Governance */}
            <div>
              <p className="text-sm text-gray-400 mb-3">
                Set the governance level for trade decisions.
              </p>
              <div className="space-y-2">
                {GOV_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setGovLevel(opt.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
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
              </div>
            </div>

            {/* Max trade size */}
            <div>
              <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <span>🛡️</span>
                <span>Max trade size per swap</span>
              </p>
              <div className="grid grid-cols-5 gap-2">
                {TRADE_SIZE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setMaxTradeSizeBps(opt.value)}
                    className={`text-center px-2 py-2.5 rounded-xl border transition-all ${
                      maxTradeSizeBps === opt.value
                        ? 'border-[#9945FF] bg-[#9945FF]/10 text-white'
                        : 'border-[#1A2332] bg-[#0D1117] text-gray-400 hover:border-[#243044]'
                    }`}
                  >
                    <div className="font-bold text-sm">{opt.label}</div>
                    <div className="text-[9px] mt-0.5 text-gray-500">{opt.desc.split('—')[0].trim()}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-2">
                Limits any single proposed swap to this % of the vault balance
              </p>
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 rounded-xl px-4 py-3">
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
            disabled={loading}
            className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-40"
          >
            <- Back
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
            Next ->
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={loading || !publicKey}
            className="btn-primary disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? <><Spinner size="sm" /> Creating...</> : '🪴 Create POT'}
          </button>
        )}
      </div>
    </Modal>
  )
}
