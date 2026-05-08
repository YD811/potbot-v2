'use client';

import { StatusBadge } from './StatusBadge';

import { useState } from 'react';
import { TokenizeSharesModal } from './TokenizeSharesModal';
import { SnsModal } from './SnsModal';
import { TamagotchiNftModal } from './TamagotchiNftModal';
import { PublicKey } from '@solana/web3.js';

interface PremiumFeaturesProps {
  potPubkey: PublicKey;
  potName: string;
  tamagotchiLevel: number;
  isTokenized: boolean;
  hasSnsdomain: boolean;
  hasTamagotchiNft: boolean;
  snsAddress?: string;
}

export function PremiumFeatures({
  potPubkey,
  potName,
  tamagotchiLevel,
  isTokenized,
  hasSnsdomain,
  hasTamagotchiNft,
  snsAddress
}: PremiumFeaturesProps) {
  const [tokenizeModal, setTokenizeModal] = useState(false);
  const [snsModal, setSnsModal] = useState(false);
  const [nftModal, setNftModal] = useState(false);

  const features = [
    {
      id: 'tokenize',
      title: 'Tokenize Shares',
      description: 'Convert shares to tradeable SPL tokens',
      icon: '\ud83e\ude99',
      price: '0.1 SOL',
      available: !isTokenized,
      status: isTokenized ? 'Active' : 'Available',
      onClick: () => setTokenizeModal(true),
    },
    {
      id: 'sns',
      title: 'SNS Domain',
      description: 'Custom potbot.sol subdomain',
      icon: '\ud83c\udf10',
      price: '0.25 SOL',
      available: !hasSnsdomain,
      status: hasSnsdomain ? snsAddress : 'Available',
      onClick: () => setSnsModal(true),
    },
    {
      id: 'nft',
      title: 'Tamagotchi NFT',
      description: 'Evolving soulbound achievement',
      icon: '\ud83c\udfa8',
      price: '0.05 SOL',
      available: !hasTamagotchiNft,
      status: hasTamagotchiNft ? 'Minted' : 'Available',
      onClick: () => setNftModal(true),
    },
  ];

  return (
    <>
      <div className="bg-pot-card p-6 rounded-xl border border-pot-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-white">Premium Features</h3>
            <StatusBadge tier="phase-3" compact />
          </div>
          <span className="text-xs px-2 py-1 bg-pot-accent/20 text-pot-accent rounded-full">
            Optional
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`p-4 rounded-lg border transition-all ${
                feature.available
                  ? 'border-pot-border hover:border-pot-green/50 cursor-pointer'
                  : 'border-pot-green/30 bg-pot-green/5'
              }`}
              onClick={feature.available ? feature.onClick : undefined}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h4 className="font-medium text-white mb-1">{feature.title}</h4>
                <p className="text-sm text-pot-muted mb-3">{feature.description}</p>
                
                {feature.available ? (
                  <>
                    <div className="text-pot-green font-medium mb-2">{feature.price}</div>
                    <button className="w-full px-3 py-2 bg-pot-green hover:bg-pot-green/90 text-black text-sm font-medium rounded transition-colors">
                      Activate
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-pot-green font-medium mb-2">\u2705 {feature.status}</div>
                    <div className="w-full px-3 py-2 bg-pot-green/20 text-pot-green text-sm font-medium rounded border border-pot-green/30">
                      Activated
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-pot-dark/50 rounded-lg border border-pot-border">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-yellow-500">\ud83d\udca1</span>
            <span className="text-sm font-medium text-white">Premium Feature Benefits</span>
          </div>
          <ul className="text-sm text-pot-muted space-y-1">
            <li>\u2022 <strong>Tokenized Shares:</strong> Trade pot shares as SPL tokens on DEXs</li>
            <li>\u2022 <strong>SNS Domain:</strong> Easy-to-remember pot address (yourpot.potbot.sol)</li>
            <li>\u2022 <strong>Tamagotchi NFT:</strong> Collectible that evolves as your pot grows</li>
          </ul>
        </div>
      </div>

      {/* Modals */}
      <TokenizeSharesModal
        potPubkey={potPubkey}
        potName={potName}
        isOpen={tokenizeModal}
        onClose={() => setTokenizeModal(false)}
      />
      
      <SnsModal
        potPubkey={potPubkey}
        potName={potName}
        isOpen={snsModal}
        onClose={() => setSnsModal(false)}
      />
      
      <TamagotchiNftModal
        potPubkey={potPubkey}
        potName={potName}
        tamagotchiLevel={tamagotchiLevel}
        isOpen={nftModal}
        onClose={() => setNftModal(false)}
      />
    </>
  );
}
