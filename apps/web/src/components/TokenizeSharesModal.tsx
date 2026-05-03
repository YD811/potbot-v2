'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { PotSDK } from '@potbot/sdk';
import toast from 'react-hot-toast';

interface TokenizeSharesModalProps {
  potPubkey: PublicKey;
  potName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TokenizeSharesModal({
  potPubkey,
  potName,
  isOpen,
  onClose,
  onSuccess
}: TokenizeSharesModalProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleTokenize = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      const sdk = new PotSDK({ connection, wallet });
      
      // Build tokenization transaction
      const tx = await sdk.buildTokenizeSharesTx(potPubkey);
      
      // Get recent blockhash and sign
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = wallet.publicKey;
      
      const signedTx = await wallet.signTransaction(tx);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.success(
        <>🪙 Shares tokenized! SPL tokens created for <strong>{potName}</strong></>
      );
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Tokenization failed:', error);
      toast.error(`Failed to tokenize: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-pot-card p-6 rounded-xl border border-pot-border max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Tokenize Shares</h2>
          <button
            onClick={onClose}
            className="text-pot-muted hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-pot-dark p-4 rounded-lg border border-pot-border">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">🪙</span>
              <div>
                <h3 className="font-medium text-white">Convert to SPL Tokens</h3>
                <p className="text-sm text-pot-muted">Make shares tradeable as tokens</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-pot-muted">
              <p>✨ Shares become tradeable SPL tokens</p>
              <p>📈 1000 tokens per 1 SOL for better UX</p>
              <p>🎯 One-time conversion (cannot be reversed)</p>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-yellow-500">💰</span>
              <span className="text-yellow-400 font-medium">Tokenization Fee</span>
            </div>
            <p className="text-white text-lg font-semibold">0.1 SOL</p>
            <p className="text-pot-muted text-sm">Paid to PotBot treasury</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-pot-border rounded-lg text-pot-muted hover:text-white hover:border-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleTokenize}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-pot-green hover:bg-pot-green/90 text-black font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Tokenizing...</span>
                </div>
              ) : (
                'Tokenize for 0.1 SOL'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
