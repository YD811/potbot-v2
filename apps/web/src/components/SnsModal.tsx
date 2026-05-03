'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PotSDK } from '@potbot/sdk';
import { toast } from 'sonner';

interface SnsModalProps {
  potPubkey: PublicKey;
  potName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SnsModal({
  potPubkey,
  potName,
  isOpen,
  onClose,
  onSuccess
}: SnsModalProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [domainName, setDomainName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  if (!isOpen) return null;

  const isValidDomain = (domain: string) => {
    if (domain.length < 3 || domain.length > 32) return false;
    if (!/^[a-zA-Z0-9-]+$/.test(domain)) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;
    return true;
  };

  const handleCreateDomain = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!isValidDomain(domainName)) {
      toast.error('Invalid domain name');
      return;
    }

    setIsLoading(true);
    try {
      const sdk = new PotSDK({ connection, wallet });
      
      const tx = await sdk.buildCreateSnsdomainTx(potPubkey, domainName.toLowerCase());
      
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = wallet.publicKey;
      
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.success(
        <>\ud83c\udf10 SNS domain created! <strong>{domainName}.potbot.sol</strong></>
      );
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('SNS creation failed:', error);
      toast.error(`Failed to create domain: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fullDomain = `${domainName || 'yourpot'}.potbot.sol`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-pot-card p-6 rounded-xl border border-pot-border max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Create SNS Domain</h2>
          <button
            onClick={onClose}
            className="text-pot-muted hover:text-white transition-colors"
          >
            \u2715
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-pot-dark p-4 rounded-lg border border-pot-border">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">\ud83c\udf10</span>
              <div>
                <h3 className="font-medium text-white">Custom Subdomain</h3>
                <p className="text-sm text-pot-muted">Easy to remember pot address</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-pot-muted mb-1">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="mypot"
                  className="w-full p-3 bg-pot-dark border border-pot-border rounded-lg text-white placeholder:text-pot-muted focus:outline-none focus:border-pot-green"
                  maxLength={32}
                />
              </div>
              
              <div className="bg-pot-dark p-3 rounded border border-pot-border">
                <p className="text-sm font-mono text-pot-green">{fullDomain}</p>
                <p className="text-xs text-pot-muted mt-1">
                  3-32 characters, alphanumeric + hyphens only
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-yellow-500">\ud83d\udcb0</span>
              <span className="text-yellow-400 font-medium">SNS Domain Fee</span>
            </div>
            <p className="text-white text-lg font-semibold">0.25 SOL</p>
            <p className="text-pot-muted text-sm">One-time registration fee</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-pot-border rounded-lg text-pot-muted hover:text-white hover:border-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateDomain}
              disabled={isLoading || !isValidDomain(domainName)}
              className="flex-1 px-4 py-3 bg-pot-green hover:bg-pot-green/90 text-black font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Creating...</span>
                </div>
              ) : (
                'Create for 0.25 SOL'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
