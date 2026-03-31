# ⚡ Quick Deploy to Base - TODAY

## 🎯 Deploy in 3 Steps

### Step 1: Setup (2 minutes)

```bash
cd /Users/mac/Documents/Work/Code/cursor/smart-contracts-erc4626/smart-contracts-erc4626-scroll-base

# Create .env file
cat > .env << EOF
PRIVATE_KEY=your_private_key_without_0x
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_API_KEY=your_basescan_api_key
EOF

# Edit with your actual values
nano .env
```

### Step 2: Deploy to Base Sepolia (5 minutes)

```bash
# Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

# Compile
npm run compile

# Deploy
npm run deploy:base:sepolia
```

### Step 3: Deploy to Base Mainnet (5 minutes)

```bash
# Ensure you have Base ETH (bridge from Ethereum: https://bridge.base.org/)

# Deploy
npm run deploy:base

# Verify (optional)
npm run verify:base <CONTRACT_ADDRESS>
```

---

## ✅ That's It!

Deployment addresses saved to: `../deployments/base/`

View on Basescan:
- Mainnet: https://basescan.org
- Sepolia: https://sepolia.basescan.org

---

**Ready to deploy!** 🚀
