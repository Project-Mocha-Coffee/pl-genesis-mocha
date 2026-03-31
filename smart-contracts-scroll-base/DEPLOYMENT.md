# TreeFarm Scroll Deployment Guide

## Available NPM Scripts for Scroll Deployment

### 🚀 Deployment Commands

#### Scroll Networks
```bash
# Deploy to Scroll Mainnet
npm run deploy:scroll

# Deploy to Scroll Sepolia Testnet (Recommended for testing)
npm run deploy:scroll:sepolia

# Deploy using Scroll Alternative RPC (Ankr)
npm run deploy:scroll:ankr
```

#### Local Development
```bash
# Deploy to local Hardhat network
npm run deploy:local

# Deploy to Hardhat in-memory network
npm run deploy:hardhat
```

### 🔗 Contract Interaction Commands

```bash
# Interact with contracts on Scroll Mainnet
npm run interact:scroll

# Interact with contracts on Scroll Sepolia
npm run interact:scroll:sepolia

# Interact with contracts using alternative RPC
npm run interact:scroll:ankr
```

### ✅ Contract Verification Commands

```bash
# Verify contracts on Scroll Mainnet
npm run verify:scroll DEPLOYED_CONTRACT_ADDRESS "constructor_arg1" "constructor_arg2"

# Verify contracts on Scroll Sepolia
npm run verify:scroll:sepolia DEPLOYED_CONTRACT_ADDRESS "constructor_arg1" "constructor_arg2"
```

### 🔧 Development Tools

```bash
# Start local Hardhat node
npm run node:start

# Start Hardhat node forked from Scroll mainnet
npm run node:fork:scroll

# Check account balances
npm run accounts
npm run balance

# Analyze contract sizes
npm run size

# Run tests with gas reporting
npm run gas-report
```

### 📋 Basic Commands

```bash
# Compile contracts
npm run compile

# Clean artifacts
npm run clean

# Run tests
npm test

# Run test coverage
npm run test:coverage

# Format Solidity code
npm run prettier
```

## 🌟 Quick Start Guide

### 1. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit .env with your settings
# PRIVATE_KEY=your_wallet_private_key
# SCROLL_API_KEY=your_scrollscan_api_key
```

### 2. Deploy to Testnet First
```bash
# Deploy to Scroll Sepolia (testnet)
npm run deploy:scroll:sepolia
```

### 3. Interact with Deployed Contracts
```bash
# Check deployment status
npm run interact:scroll:sepolia
```

### 4. Deploy to Mainnet
```bash
# Deploy to Scroll Mainnet
npm run deploy:scroll
```

### 5. Verify Contracts (Optional)
```bash
# Use addresses from deployment output
npm run verify:scroll 0xYourContractAddress "constructor_arg1"
```

## 📊 Expected Output

After successful deployment, you'll see:
- ✅ All contract addresses
- 📄 Deployment summary saved to `deployments/` folder
- 🔍 Block explorer links for Scroll networks
- 💰 Gas usage summary

## 🛠 Troubleshooting

- **"Insufficient funds"**: Ensure your wallet has enough ETH
- **"Network not found"**: Check your RPC URLs in `.env`
- **"Transaction underpriced"**: Network congestion, retry with higher gas
- **"Verification failed"**: Get API key from ScrollScan

## 🔗 Useful Links

- **Scroll Explorer**: https://scrollscan.com
- **Scroll Sepolia Explorer**: https://sepolia.scrollscan.com
- **Get Testnet ETH**: Join Scroll Telegram and use `/drop YOUR_ADDRESS`
- **Scroll Documentation**: https://docs.scroll.io

Your TreeFarm system will be deployed on Scroll's high-performance zkEVM! 🎉