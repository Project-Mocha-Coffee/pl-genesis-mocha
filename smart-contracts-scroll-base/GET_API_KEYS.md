# 🔑 How to Get API Keys for Base Deployment

## 1. Basescan API Key (Recommended)

**Step 1**: Go to https://basescan.org/apis

**Step 2**: Sign in or create an account (free)

**Step 3**: Click **"Add"** or **"Create API Key"**

**Step 4**: Give it a name (e.g., "Project Mocha Base")

**Step 5**: Copy the API key

**Step 6**: Add to your `.env` file:
```env
BASE_API_KEY=your_copied_key_here
```

---

## 2. Etherscan API Key (Alternative - Also Works)

**Step 1**: Go to https://etherscan.io/apis

**Step 2**: Sign in or create an account (free)

**Step 3**: Click **"Add"** to create a new API key

**Step 4**: Copy the API key

**Step 5**: Add to your `.env` file:
```env
ETHERSCAN_API_KEY=your_copied_key_here
```

**Note**: You can use either Basescan or Etherscan API key - both work for Base networks.

---

## 3. Private Key (Your Wallet)

**Option A: Export from Rabby Wallet** (Recommended if using Rabby)
1. Open Rabby Wallet extension
2. Click account icon → Settings → Security
3. Click "Export Private Key" or "Show Private Key"
4. Enter password
5. Copy the key (remove `0x` prefix if present)
6. See `EXPORT_RABBY_PRIVATE_KEY.md` for detailed instructions

**Option B: Export from MetaMask**
1. Open MetaMask
2. Click account icon → Settings → Security & Privacy
3. Click "Show Private Key"
4. Enter password
5. Copy the key (remove `0x` prefix if present)

**Option C: Export from Hardware Wallet**
- Use your hardware wallet's export function
- ⚠️ **Never share this key!**

**Option D: Generate New Wallet**
```bash
# Using Hardhat (from parent directory)
cd ..
npx hardhat accounts
# Or use the generate-wallet script
npx hardhat run scripts/generate-wallet.js
```

**Add to `.env`**:
```env
PRIVATE_KEY=your_private_key_without_0x_prefix
```

⚠️ **SECURITY WARNING**: 
- Never commit `.env` file to git
- Never share your private key
- Use a dedicated deployment wallet (not your main wallet)
- Ensure the wallet has Base ETH for gas fees

---

## 📝 Complete .env File Example

```env
# Your wallet private key (without 0x prefix)
PRIVATE_KEY=abc123def456...

# Base RPC URLs
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# API Keys (get from links above)
BASE_API_KEY=your_basescan_api_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

---

## ✅ Quick Checklist

- [ ] Got Basescan API key from https://basescan.org/apis
- [ ] Got Etherscan API key (optional) from https://etherscan.io/apis
- [ ] Have wallet private key ready
- [ ] Wallet has Base ETH (for mainnet) or Base Sepolia ETH (for testnet)
- [ ] Created `.env` file with all values
- [ ] Verified `.env` is in `.gitignore` (should not be committed)

---

## 🔗 Direct Links

- **Basescan API**: https://basescan.org/apis
- **Etherscan API**: https://etherscan.io/apis
- **Base Sepolia Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Base Bridge** (for mainnet ETH): https://bridge.base.org

---

**Once you have all keys, you're ready to deploy!** 🚀
