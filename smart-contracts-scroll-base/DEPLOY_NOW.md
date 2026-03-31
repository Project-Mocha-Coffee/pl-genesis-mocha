# 🚀 Deploy to Base - Quick Start

## ⚡ Fast Deployment (5 Minutes)

### Step 1: Setup Environment

```bash
cd /Users/mac/Documents/Work/Code/cursor/smart-contracts-erc4626/smart-contracts-erc4626-scroll-base

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env  # or use your preferred editor
```

**Required in `.env`**:
```env
PRIVATE_KEY=your_private_key_without_0x
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_API_KEY=your_basescan_api_key  # Optional, for verification
```

### Step 2: Install Dependencies (if not done)

```bash
# Go to parent directory to install
cd ..
npm install
```

### Step 3: Compile Contracts

```bash
# From Base folder
cd smart-contracts-erc4626-scroll-base
npm run compile
```

### Step 4: Deploy to Base Sepolia (TEST FIRST!)

```bash
# Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
npm run deploy:base:sepolia
```

**Expected Output**:
- Contract addresses will be saved to `../deployments/base/`
- View on Basescan Sepolia: https://sepolia.basescan.org

### Step 5: Test on Base Sepolia

```bash
# Test ICO deployment
npm run test:ico:base:sepolia

# Configure ICO
npm run configure:ico:base:sepolia
```

### Step 6: Deploy to Base Mainnet

```bash
# Ensure you have Base ETH for gas fees
# Bridge from Ethereum: https://bridge.base.org/
npm run deploy:base
```

### Step 7: Verify Contracts (Optional)

```bash
# Verify on Base Mainnet
npm run verify:base <CONTRACT_ADDRESS> "constructor_arg1" "constructor_arg2"
```

---

## 📋 Quick Commands

```bash
# Deploy
npm run deploy:base              # Mainnet
npm run deploy:base:sepolia      # Testnet

# Verify
npm run verify:base              # Mainnet
npm run verify:base:sepolia      # Testnet

# ICO
npm run deploy:ico:base          # Deploy ICO to Mainnet
npm run configure:ico:base       # Configure ICO
npm run test:ico:base            # Test ICO
```

---

## 🔗 Important Links

- **Base Explorer**: https://basescan.org
- **Base Sepolia Explorer**: https://sepolia.basescan.org
- **Base Bridge**: https://bridge.base.org
- **Base Sepolia Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Base API Keys**: https://basescan.org/apis

---

## ⚠️ Important Notes

1. **Always test on Base Sepolia first!**
2. **Ensure sufficient Base ETH** for gas fees
3. **Save deployment addresses** after successful deployment
4. **Never commit `.env` file** - it's in `.gitignore`

---

## 📁 Deployment Outputs

Deployment files are saved to:
- `../deployments/base/base-*.json`

Each file contains:
- All contract addresses
- Network information
- Base configuration used
- Timestamp

---

**Ready to deploy! Start with Base Sepolia, then proceed to Mainnet!** 🚀
