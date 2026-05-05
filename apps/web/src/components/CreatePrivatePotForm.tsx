'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PotSDK } from '@potbot/sdk';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { StatusBadge } from '@/components/StatusBadge'

interface CreatePrivatePotFormProps {
  onSuccess?: () => void;
}

export function CreatePrivatePotForm({ onSuccess }: CreatePrivatePotFormProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    emoji: '🚀',
    inviteCode: '',
    minDeposit: '0.1',
    yieldStrategy: 'Conservative' as 'Conservative' | 'Balanced' | 'Aggressive' | 'None'
  });

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, inviteCode: result }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    if (formData.inviteCode.length !== 6) {
      toast.error('Invite code must be 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const sdk = new PotSDK({ connection, wallet });
      
      const tx = await sdk.buildCreatePrivatePotTx({
        name: formData.name,
        emoji: formData.emoji,
        inviteCode: formData.inviteCode,
        isPublic: false, // Always false for private pots
        minDeposit: Math.floor(parseFloat(formData.minDeposit) * 1e9), // SOL to lamports
        yieldStrategy: formData.yieldStrategy,
      });
      
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = wallet.publicKey;
      
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.success(
        <>🔐 Private pot created! Invite code: <strong>{formData.inviteCode}</strong></>
      );
      
      onSuccess?.();
      
      // Navigate to the new pot
      const potPubkey = sdk.getPotAddress(formData.name, wallet.publicKey)[0];
      router.push(`/pots/${potPubkey.toString()}`);
      
    } catch (error: any) {
      console.error('Private pot creation failed:', error);
      toast.error(`Failed to create pot: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-pot-card p-6 rounded-xl border border-pot-border">
        <div className="flex items-center space-x-3 mb-6">
          <span className="text-3xl">🔐</span>
          <div>
            <h2 className="text-xl font-semibold text-white">Create Private Pot</h2> <StatusBadge tier="phase-3" compact />
            <p className="text-pot-muted">Invite-only trading vault</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-pot-muted mb-2">
                Pot Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Elite Traders"
                className="w-full p-3 bg-pot-dark border border-pot-border rounded-lg text-white placeholder:text-pot-muted focus:outline-none focus:border-pot-green"
                maxLength={32}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-pot-muted mb-2">
                Emoji
              </label>
              <select
                value={formData.emoji}
                onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                className="w-full p-3 bg-pot-dark border border-pot-border rounded-lg text-white focus:outline-none focus:border-pot-green"
              >
                <option value="🚀">🚀 Rocket</option>
                <option value="💎">💎 Diamond</option>
                <option value="👑">👑 Crown</option>
                <option value="🔥">🔥 Fire</option>
                <option value="⚡">⚡ Lightning</option>
                <option value="🌟">🌟 Star</option>
                <option value="🏆">🏆 Trophy</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-pot-muted mb-2">
              Invite Code
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.inviteCode}
                onChange={(e) => setFormData(prev => ({ ...prev, inviteCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                placeholder="ELITE1"
                className="flex-1 p-3 bg-pot-dark border border-pot-border rounded-lg text-white placeholder:text-pot-muted focus:outline-none focus:border-pot-green font-mono"
                maxLength={6}
                required
              />
              <button
                type="button"
                onClick={generateInviteCode}
                className="px-4 py-3 bg-pot-accent hover:bg-pot-accent/90 text-white rounded-lg transition-colors"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-pot-muted mt-1">
              6 characters, alphanumeric only. Share this with members to invite them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-pot-muted mb-2">
                Minimum Deposit (SOL)
              </label>
              <input
                type="number"
                value={formData.minDeposit}
                onChange={(e) => setFormData(prev => ({ ...prev, minDeposit: e.target.value }))}
                step="0.1"
                min="0"
                className="w-full p-3 bg-pot-dark border border-pot-border rounded-lg text-white placeholder:text-pot-muted focus:outline-none focus:border-pot-green"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-pot-muted mb-2">
                Yield Strategy
              </label>
              <select
                value={formData.yieldStrategy}
                onChange={(e) => setFormData(prev => ({ ...prev, yieldStrategy: e.target.value as any }))}
                className="w-full p-3 bg-pot-dark border border-pot-border rounded-lg text-white focus:outline-none focus:border-pot-green"
              >
                <option value="None">None - No yield</option>
                <option value="Conservative">Conservative - 3-5% APY</option>
                <option value="Balanced">Balanced - 5-8% APY</option>
                <option value="Aggressive">Aggressive - 8-15% APY</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-400">🔐</span>
              <span className="text-blue-400 font-medium">Private Pot Features</span>
            </div>
            <ul className="text-sm text-pot-muted space-y-1">
              <li>• Only invited members can join</li>
              <li>• Share invite code with trusted traders</li>
              <li>• Same trading & governance features</li>
              <li>• Maximum 100 invites per pot</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading || !formData.name || formData.inviteCode.length !== 6}
            className="w-full px-6 py-3 bg-pot-green hover:bg-pot-green/90 text-black font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Creating Private Pot...</span>
              </div>
            ) : (
              'Create Private Pot'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
