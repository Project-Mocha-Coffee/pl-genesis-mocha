# Base Mainnet Deployment Instructions

## ⚠️ Important: Network Check

**Your wallet needs ETH on Base Mainnet, not Ethereum Mainnet!**

If you funded on Ethereum Mainnet, you need to bridge to Base:
- **Base Bridge**: https://bridge.base.org/
- Bridge your ETH from Ethereum Mainnet → Base Mainnet

---

## 📋 Pre-Deployment Checklist

- [ ] Wallet has **0.015 ETH minimum** on **Base Mainnet**
- [ ] `.env` file has correct `PRIVATE_KEY` and `BASE_RPC_URL`
- [ ] `BASE_API_KEY` is set for contract verification (optional)

---

## 🚀 Deployment Steps

### Step 1: Verify Balance on Base Mainnet

```bash
# Check balance
curl -X POST https://mainnet.base.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795","latest"],"id":1}'
```

Or visit: https://basescan.org/address/0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795

**Required**: Minimum 0.015 ETH on Base Mainnet

---

### Step 2: Deploy All Contracts

```bash
cd /Users/mac/Documents/Work/Code/cursor/smart-contracts-erc4626
npm run deploy:base
```

This will deploy:
- All 21 contracts (tokens, facets, libraries, diamond, ICO)
- Initialize the Diamond system
- Grant necessary roles
- Configure the ICO contract

**Expected Cost**: ~0.00912 ETH (~$22.80)

**Time**: ~5-10 minutes

---

### Step 3: Verify Deployment

After deployment completes, check:
1. Deployment file created in `deployments/base/`
2. All contract addresses logged in console
3. Contracts visible on BaseScan

---

### Step 4: Mint 10 Trees

```bash
npm run add:farms:base
```

This will:
- Create 1 farm
- Mint 1 MLT (land token)
- Mint 10 MTT (tree tokens) - trees 411-420
- Register the farm in the vault

**Expected Cost**: ~0.000345 ETH (~$0.86)

**Time**: ~2-3 minutes

---

### Step 5: Verify Trees on BaseScan

1. Visit your Diamond contract on BaseScan
2. Check the farm configuration
3. Verify tree tokens are minted

---

## 📊 Expected Results

After successful deployment:

- **21 Contracts Deployed**:
  - MochaBeanToken (MBT)
  - MochaLandToken (MLT)
  - MochaTreeToken (MTT)
  - MochaTreeRightsToken (MTTR)
  - ICO Contract
  - Diamond + 10 Facets
  - Libraries and Utilities

- **1 Farm Created**:
  - Name: "Base Mainnet Farm"
  - 10 trees (IDs 411-420)
  - Ready for investment

- **Total Cost**: ~0.009465 ETH (~$23.66)

---

## 🔍 Troubleshooting

### "Insufficient funds" error
- Ensure you have ETH on **Base Mainnet**, not Ethereum Mainnet
- Bridge funds using https://bridge.base.org/

### "Nonce too low" error
- Wait a few minutes and retry
- The script includes delays to prevent this

### "Contract verification failed"
- This is optional - contracts will still work
- You can verify manually on BaseScan later

---

## 📝 Next Steps After Deployment

1. **Update Frontend Config**:
   - Add Base Mainnet addresses to `portal-main/src/lib/config.ts`

2. **Test on Portal**:
   - Connect wallet to Base Mainnet
   - Verify contracts are accessible
   - Test investment flow

3. **Add More Trees** (optional):
   - Modify `scripts/base/add-farms-base.js`
   - Change `treeCount` in `FARM_CONFIGS`
   - Run `npm run add:farms:base` again

---

**Ready to deploy?** Ensure you have 0.015 ETH on Base Mainnet, then run:

```bash
npm run deploy:base
```
