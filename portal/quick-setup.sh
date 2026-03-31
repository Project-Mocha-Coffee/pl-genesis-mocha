#!/bin/bash

echo "🚀 Mocha Portal - Quick Setup"
echo "=============================="
echo ""

# Fix npm cache
echo "Step 1: Fixing npm cache permissions..."
echo "(You'll be asked for your Mac password)"
sudo chown -R $(whoami) "$HOME/.npm"
echo "✅ npm cache fixed"
echo ""

# Install dependencies
echo "Step 2: Installing dependencies..."
echo "(This takes 2-3 minutes)"
npm install
echo "✅ Dependencies installed"
echo ""

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo "⚠️  Creating .env.local template..."
    echo "NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here" > .env.local
    echo "✅ Created .env.local"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.local and add your WalletConnect Project ID"
    echo "   Get it from: https://cloud.walletconnect.com/sign-up"
    echo ""
else
    echo "✅ .env.local exists"
fi
echo ""

echo "=============================="
echo "✅ Setup Complete!"
echo "=============================="
echo ""
echo "To start the portal:"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""

