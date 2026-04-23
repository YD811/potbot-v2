#!/bin/bash

# PotBot v2 Premium Features Deployment Script
# Deploys updated Anchor program with new premium instructions

set -e

echo "🚀 Deploying PotBot v2 Premium Features..."

# 1. Build the program
echo "📦 Building Anchor program..."
cd packages/program
anchor build

# 2. Generate new IDL
echo "🔧 Updating IDL..."
anchor idl init -f target/idl/pot_vault.json 2ywztkP4gaJr2HtmBvqMXrBWab3FLd3uG6TjGXvVogJL || \
anchor idl upgrade -f target/idl/pot_vault.json 2ywztkP4gaJr2HtmBvqMXrBWab3FLd3uG6TjGXvVogJL

# 3. Deploy to devnet
echo "🌐 Deploying to devnet..."
solana config set --url devnet
anchor deploy --provider.cluster devnet

# 4. Update SDK with new IDL
echo "🔄 Updating SDK..."
cp target/idl/pot_vault.json ../sdk/src/idl/
cd ../sdk
npm run build

# 5. Build frontend with new features
echo "🎨 Building frontend..."
cd ../../apps/web
npm run build

echo "✅ Deployment complete!"
echo "📋 Next steps:"
echo "   1. Test premium features on devnet"
echo "   2. Deploy API backend for metadata"
echo "   3. Update frontend with live program"
echo "   4. Create demo video"
echo "   5. Submit to Solana Frontier Hackathon"
echo ""
echo "🔗 Program ID: 2ywztkP4gaJr2HtmBvqMXrBWab3FLd3uG6TjGXvVogJL"
echo "💰 Treasury: 2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o"