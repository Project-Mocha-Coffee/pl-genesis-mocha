# Base Mainnet Deployment Cost Summary

## 📊 Quick Answer

### Total Cost Required (10 Trees - Initial)
- **Deployment**: 0.00912 ETH (~$22.80)
- **10 Trees**: 0.000345 ETH (~$0.86)
- **Total**: **0.009465 ETH (~$23.66)**
- **Recommended**: **0.015 ETH (~$37.50)** with buffer

### Total Cost Required (300 Trees - Full Scale)
- **Deployment**: 0.00912 ETH (~$22.80)
- **300 Trees**: 0.00731 ETH (~$18.26)
- **Total**: **0.01643 ETH (~$41.06)**
- **Recommended**: **0.03 ETH (~$75)** with buffer

---

## 💰 Current Wallet Status

**Wallet**: `0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795`  
**Current Balance**: **0.000003 ETH** (~$0.01)  
**Status**: ⚠️ **INSUFFICIENT FUNDS**

**Required (10 trees)**: 0.015 ETH (~$37.50)  
**Shortfall**: 0.014997 ETH (~$37.49)

---

## 📋 Cost Breakdown

### 1. Contract Deployment
- **21 contracts** (tokens, facets, libraries, diamond)
- **~16 initialization transactions**
- **Total Gas**: 30,400,000
- **Cost**: 0.00912 ETH (~$22.80)

### 2. Minting 10 Trees (Initial)
- **MLT mint** (per farm): 150,000 gas
- **MTT mints** (per tree): 80,000 gas × 10 = 800,000 gas
- **Farm registration**: 200,000 gas
- **Total Gas**: 1,150,000
- **Cost**: 0.000345 ETH (~$0.86)

### 3. Minting 300 Trees (Full Scale)
- **MLT mint** (per farm): 150,000 gas
- **MTT mints** (per tree): 80,000 gas × 300 = 24,000,000 gas
- **Farm registration**: 200,000 gas
- **Total Gas**: 24,350,000
- **Cost**: 0.00731 ETH (~$18.26)

---

## ✅ What You Can Do

### With Current Balance (0.000003 ETH)
- ❌ **Nothing** - Insufficient for any operation

### After Funding 0.015 ETH (~$37.50) - **FOR 10 TREES**
- ✅ Deploy all 21 contracts
- ✅ Mint 10 trees
- ✅ Contract verification (optional)
- ✅ Buffer for retries/errors

### After Funding 0.03 ETH (~$75) - **FOR 300 TREES**
- ✅ Deploy all 21 contracts
- ✅ Mint 300 trees
- ✅ Contract verification (optional)
- ✅ Buffer for retries/errors

---

## 🚀 Next Steps

1. **Fund wallet** with 0.015 ETH minimum (for 10 trees)
   - Bridge from Ethereum: https://bridge.base.org/
   - Or use Base-compatible onramp

2. **Verify balance** on BaseScan:
   https://basescan.org/address/0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795

3. **Deploy contracts**:
   ```bash
   npm run deploy:base
   ```

4. **Mint 10 trees** (script already configured for 10):
   ```bash
   npm run add:farms:base
   ```

---

## 📄 Full Analysis

See detailed cost analysis: `docs/base/BASE_MAINNET_COST_ANALYSIS.md`

---

**Last Updated**: January 23, 2025  
**Gas Price**: 0.3 gwei (conservative estimate)  
**ETH Price**: $2,500 USD
