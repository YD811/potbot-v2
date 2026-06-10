'use client';
import { useState } from 'react';

export type PotType = 'public' | 'private';

interface PotTypeSelectorProps {
  value: PotType;
  onChange: (type: PotType) => void;
}

export function PotTypeSelector({ value, onChange }: PotTypeSelectorProps) {
  const [pubOpen, setPubOpen] = useState(false);
  const [privOpen, setPrivOpen] = useState(false);
  const isPublic = value === 'public';

  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
        Step 1 — Choose POT type
      </p>

      {/* Slider container */}
      <div
        className="relative grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl border"
        style={{
          background: 'rgba(17,24,39,1)',
          borderColor: isPublic
            ? 'rgba(20,241,149,0.25)'
            : 'rgba(153,69,255,0.25)',
          transition: 'border-color 0.4s',
        }}
      >
        {/* Sliding pill */}
        <div
          className="absolute top-1.5 bottom-1.5 rounded-xl pointer-events-none transition-all duration-400"
          style={{
            width: 'calc(50% - 9px)',
            transform: isPublic ? 'translateX(0)' : 'translateX(calc(100% + 6px))',
            left: '6px',
            background: isPublic
              ? 'linear-gradient(135deg,rgba(20,241,149,.18),rgba(20,241,149,.08))'
              : 'linear-gradient(135deg,rgba(153,69,255,.18),rgba(153,69,255,.08))',
            border: isPublic
              ? '1px solid rgba(20,241,149,.35)'
              : '1px solid rgba(153,69,255,.35)',
            boxShadow: isPublic
              ? '0 0 32px rgba(20,241,149,.12)'
              : '0 0 32px rgba(153,69,255,.15)',
            transition: 'transform 0.4s cubic-bezier(.22,.61,.36,1), background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
            willChange: 'transform',
          }}
        />

        {/* PUBLIC card */}
        <button
          type="button"
          onClick={() => onChange('public')}
          className="relative z-10 rounded-xl p-5 text-left transition-all hover:-translate-y-0.5 cursor-pointer border"
          style={{
            borderColor: value === 'public' ? 'rgba(20,241,149,.45)' : 'transparent',
            background: value === 'public' ? 'rgba(20,241,149,.06)' : 'transparent',
            transition: 'border-color .3s, background .3s, transform .2s',
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(20,241,149,.12)', boxShadow: value === 'public' ? '0 0 24px rgba(20,241,149,.3)' : 'none', transition: 'box-shadow .3s' }}
            >
              🌐
            </div>
            <span
              className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full border"
              style={{ background: 'rgba(20,241,149,.12)', borderColor: 'rgba(20,241,149,.3)', color: '#14F195' }}
            >
              Social-Fi
            </span>
          </div>

          <div className="text-lg font-extrabold mb-1" style={{ color: '#14F195' }}>
            Public POT
          </div>
          <div className="text-sm text-gray-400 leading-snug mb-3">
            Open vault. Share strategy, earn referrals, compete on leaderboard. Community-powered alpha.
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {['🏆 Leaderboard','⚔️ Duels','🔗 Referrals','📊 Strategy Share','👥 Community'].map(f => (
              <span
                key={f}
                className="text-xs font-semibold px-2 py-1 rounded-full border transition-all"
                style={value === 'public'
                  ? { background: 'rgba(20,241,149,.08)', borderColor: 'rgba(20,241,149,.2)', color: '#14F195' }
                  : { background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.1)', color: '#8892A8' }}
              >
                {f}
              </span>
            ))}
          </div>

          {/* expand */}
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-green-400 flex items-center gap-1 transition-colors"
            onClick={e => { e.stopPropagation(); setPubOpen(v => !v); }}
          >
            {pubOpen ? 'Hide details' : 'See all features'} <span style={{ transition: 'transform .3s', display:'inline-block', transform: pubOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
          </button>

          {pubOpen && (
            <div className="mt-3 flex flex-col gap-2">
              {[
                ['🏆','Public Leaderboard','Discoverable globally — new capital finds you automatically.'],
                ['📊','Strategy Sharing','Set direction, community votes. Earn creator % of realized PnL.'],
                ['🔗','Referral Rewards','Unique link — every new depositor earns you a fee forever.'],
                ['⚔️','Public Duels','Challenge other pots to 24h PnL races.'],
                ['🌱','Tamagotchi XP','Public activity feeds your pot creature, unlocking perks.'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <div className="text-xs font-bold text-white">{title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {value === 'public' && (
            <div className="flex items-center gap-1.5 text-xs font-bold mt-3" style={{ color: '#14F195' }}>
              ✓ Selected
            </div>
          )}
          {value !== 'public' && <div className="mt-3 h-[18px]" />}
        </button>

        {/* PRIVATE card */}
        <button
          type="button"
          onClick={() => onChange('private')}
          className="relative z-10 rounded-xl p-5 text-left transition-all hover:-translate-y-0.5 cursor-pointer border"
          style={{
            borderColor: value === 'private' ? 'rgba(153,69,255,.45)' : 'transparent',
            background: value === 'private' ? 'rgba(153,69,255,.06)' : 'transparent',
            transition: 'border-color .3s, background .3s, transform .2s',
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(153,69,255,.12)', boxShadow: value === 'private' ? '0 0 24px rgba(153,69,255,.3)' : 'none', transition: 'box-shadow .3s' }}
            >
              🔒
            </div>
            <span
              className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full border"
              style={{ background: 'rgba(153,69,255,.12)', borderColor: 'rgba(153,69,255,.3)', color: '#9945FF' }}
            >
              Alpha Club
            </span>
          </div>

          <div className="text-lg font-extrabold mb-1" style={{ color: '#9945FF' }}>
            Private POT
          </div>
          <div className="text-sm text-gray-400 leading-snug mb-3">
            ZK-shielded vault. Your alpha stays yours. Invite-only. Shielded balances, private governance.
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {['🔐 ZK Shielded','🔑 Invite Link','🛡️ Umbra SDK','🧩 MagicBlock PER','🧱 Arcium'].map(f => (
              <span
                key={f}
                className="text-xs font-semibold px-2 py-1 rounded-full border transition-all"
                style={value === 'private'
                  ? { background: 'rgba(153,69,255,.08)', borderColor: 'rgba(153,69,255,.2)', color: '#9945FF' }
                  : { background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.1)', color: '#8892A8' }}
              >
                {f}
              </span>
            ))}
          </div>

          <button
            type="button"
            className="text-xs text-gray-500 hover:text-purple-400 flex items-center gap-1 transition-colors"
            onClick={e => { e.stopPropagation(); setPrivOpen(v => !v); }}
          >
            {privOpen ? 'Hide details' : 'See all features'} <span style={{ transition: 'transform .3s', display:'inline-block', transform: privOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
          </button>

          {privOpen && (
            <div className="mt-3 flex flex-col gap-2">
              {[
                ['🛡️','Shielded Balances (Umbra SDK)','Vault balance encrypted on-chain. Only members with viewing keys see financials.'],
                ['🕵️','Private Swaps (PrivacyCash ZK)','ZK-routed Jupiter swaps. Observers see proof, never the asset or amount.'],
                ['🧩','MagicBlock Private Ephemeral Rollup','Governance proposals execute inside PER — private until settled on-chain.'],
                ['🔑','Invite-Only Access','New members join exclusively via your unique invite link.'],
                ['📋','Viewing Keys for Compliance','Selective disclosure for accountants/regulators — decrypt only what\'s needed.'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <div className="text-xs font-bold text-white">{title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {['🛡️ Umbra SDK','⚙️ PrivacyCash','🧩 MagicBlock PER','🧱 Arcium'].map(p => (
                  <span key={p} className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(153,69,255,.1)', border: '1px solid rgba(153,69,255,.2)', color: '#9945FF' }}>{p}</span>
                ))}
              </div>
            </div>
          )}

          {value === 'private' && (
            <div className="flex items-center gap-1.5 text-xs font-bold mt-3" style={{ color: '#9945FF' }}>
              ✓ Selected
            </div>
          )}
          {value !== 'private' && <div className="mt-3 h-[18px]" />}
        </button>
      </div>

      {/* Alert under selector */}
      <div
        className="mt-3 relative rounded-xl text-sm min-h-[74px] overflow-hidden"
        style={isPublic
          ? { background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)', color: '#93C5FD' }
          : { background: 'rgba(153,69,255,.08)', border: '1px solid rgba(153,69,255,.2)', color: '#C4B5FD' }}
      >
        <div
          className="absolute inset-0 p-3 flex gap-2.5 transition-all duration-300"
          style={{
            opacity: isPublic ? 1 : 0,
            transform: isPublic ? 'translateY(0)' : 'translateY(6px)',
            pointerEvents: isPublic ? 'auto' : 'none',
          }}
        >
          <span>🌐</span>
          <span>
            <b>Public POT</b> — Appears in discovery feed. Anyone can join and deposit. Earn referral fees from new members.
          </span>
        </div>
        <div
          className="absolute inset-0 p-3 flex gap-2.5 transition-all duration-300"
          style={{
            opacity: isPublic ? 0 : 1,
            transform: isPublic ? 'translateY(6px)' : 'translateY(0)',
            pointerEvents: isPublic ? 'none' : 'auto',
          }}
        >
          <span>🔒</span>
          <span>
            <b>Private POT</b> — ZK-shielded vault. Invite-only via unique link. Powered by Umbra SDK + MagicBlock PER.
          </span>
        </div>
      </div>
    </div>
  );
}
