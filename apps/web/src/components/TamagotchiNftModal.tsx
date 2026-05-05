'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PotSDK } from '@potbot/sdk';
import toast from 'react-hot-toast';

interface TamagotchiNftModalProps {
  potPubkey: PublicKey;
  potName: string;
  tamagotchiLevel: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TAMAGOTCHI_IMAGES = {
  0: '🥚', // Egg
  1: '🐣', // Hatching
  2: '🐥', // Young
  3: '🐤', // Growing
  4: '🦆', // Mature
  5: '👑', // Master
};

const TAMAGOTCHI_NAMES = {
  0: 'Egg',
  1: 'Hatchling',
  2: 'Sprout',
  3: 'Grower',
  4: 'Master',
  5: 'Legend',
};

export function TamagotchiNftModal({
  potPubkey,
  potName,
  tamagotchiLevel,
  isOpen,
  onClose,
  onSuccess
}: TamagotchiNftModalProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleMintNft = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      const sdk = new PotSDK({ connection, wallet });
      
      const tx = await sdk.buildMintTamagotchiNftTx(potPubkey);
      
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = wallet.publicKey;
      
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.success(
        <>🎨 Tamagotchi NFT minted! <strong>{TAMAGOTCHI_NAMES[tamagotchiLevel as keyof typeof TAMAGOTCHI_NAMES]}</strong></>
      );
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('NFT minting failed:', error);
      toast.error(`Failed to mint NFT: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentImage = TAMAGOTCHI_IMAGES[tamagotchiLevel as keyof typeof TAMAGOTCHI_IMAGES] || '🥚';
  const currentName = TAMAGOTCHI_NAMES[tamagotchiLevel as keyof typeof TAMAGOTCHI_NAMES] || 'Egg';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-pot-card p-6 rounded-xl border border-pot-border max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Mint Tamagotchi NFT</h2>
          <button
            onClick={onClose}
            className="text-pot-muted hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-pot-dark p-4 rounded-lg border border-pot-border text-center">
            <div className="text-6xl mb-3">{currentImage}</div>
            <h3 className="text-xl font-medium text-white mb-1">
              {potName} {currentName}
            </h3>
            <p className="text-pot-muted">Level {tamagotchiLevel}</p>
          </div>

          <div className="bg-pot-dark p-4 rounded-lg border border-pot-border">
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-pot-green">✨</span>
                <span className="text-white">Soulbound NFT (non-transferable)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-pot-green">🔄</span>
                <span className="text-white">Evolves as pot grows</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-pot-green">🎨</span>
                <span className="text-white">Unique artwork per level</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-pot-green">📈</span>
                <span className="text-white">Tracks pot achievement</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2 text-center">
            {Object.entries(TAMAGOTCHI_IMAGES).map(([level, emoji]) => {
              const isCurrentLevel = parseInt(level) === tamagotchiLevel;
              return (
                <div
                  key={level}
                  className={`p-2 rounded border ${
                    isCurrentLevel
                      ? 'border-pot-green bg-pot-green/10'
                      : 'border-pot-border bg-pot-dark/50'
                  }`}
                >
                  <div className="text-2xl mb-1">{emoji}</div>
                  <div className="text-xs text-pot-muted">L{level}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-yellow-500">💰</span>
              <span className="text-yellow-400 font-medium">NFT Creation Fee</span>
            </div>
            <p className="text-white text-lg font-semibold">0.05 SOL</p>
            <p className="text-pot-muted text-sm">One-time minting fee</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-pot-border rounded-lg text-pot-muted hover:text-white hover:border-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleMintNft}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-pot-green hover:bg-pot-green/90 text-black font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Minting...</span>
                </div>
              ) : (
                'Mint for 0.05 SOL'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
