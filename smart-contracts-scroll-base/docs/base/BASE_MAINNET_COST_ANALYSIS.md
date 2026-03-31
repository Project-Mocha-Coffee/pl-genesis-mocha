# Base Mainnet Deployment Cost Analysis

## 📊 Deployment Cost Breakdown

### Contracts to Deploy

Based on `deployDiamond.js`, the following contracts are deployed:

#### Core Tokens (4 contracts)
1. **MochaBeanToken (MBT)** - ERC20 token
2. **MochaLandToken (MLT)** - ERC721 NFT
3. **MochaTreeToken (MTT)** - ERC6960 DLT (trees)
4. **MochaTreeRightsToken (MTTR)** - ERC4626 vault

#### ERC6551 Infrastructure (2 contracts)
5. **ERC6551Account** - Implementation contract
6. **ERC6551Registry** - Registry contract

#### Libraries (3 contracts)
7. **MTTRBondLib** - Bond management library
8. **MTTRFarmLib** - Farm management library
9. **MTTRYieldLib** - Yield calculation library

#### ICO Contract (1 contract)
10. **ICO** - Token sale contract

#### Diamond Pattern (10+ contracts)
11. **DiamondCutFacet** - Core facet
12. **DiamondLoupeFacet** - Core facet
13. **OwnershipFacet** - Core facet
14. **InitializationFacet** - Core facet
15. **FarmManagementFacet** - Business logic
16. **TreeManagementFacet** - Business logic
17. **YieldManagementFacet** - Business logic
18. **BondManagementFacet** - Business logic
19. **MultiTrancheVaultFacet** - Business logic
20. **FarmShareTokenFacet** - Business logic
21. **TreeFarmDiamond** - Main diamond contract

#### Initialization Transactions
- Grant roles on MTTR vault (3 transactions)
- Initialize Diamond facets (multiple diamondCut calls)
- Initialize vault system
- Configure ICO contract

**Total: ~21 contracts + ~10-15 initialization transactions**

---

## 💰 Gas Cost Estimates

### Base Mainnet Gas Prices
- **Current Base gas price**: ~0.1-0.5 gwei (very low!)
- **Typical transaction**: 21,000 gas (simple transfer)
- **Contract deployment**: 500,000 - 3,000,000 gas per contract
- **Complex contract (Diamond)**: 3,000,000 - 5,000,000 gas

### Estimated Deployment Costs

#### Contract Deployments
| Contract Type | Gas per Contract | Contracts | Total Gas |
|--------------|------------------|-----------|-----------|
| Simple ERC20/ERC721 | 500,000 | 2 | 1,000,000 |
| Medium Complexity | 1,500,000 | 8 | 12,000,000 |
| Complex (MTTR, Diamond) | 3,500,000 | 3 | 10,500,000 |
| Libraries | 800,000 | 3 | 2,400,000 |
| ICO Contract | 2,000,000 | 1 | 2,000,000 |
| **Subtotal** | | **17** | **27,900,000** |

#### Initialization Transactions
| Transaction Type | Gas per TX | Transactions | Total Gas |
|-----------------|------------|--------------|-----------|
| Grant roles | 50,000 | 3 | 150,000 |
| Diamond cuts | 200,000 | 10 | 2,000,000 |
| Vault initialization | 150,000 | 1 | 150,000 |
| ICO configuration | 100,000 | 2 | 200,000 |
| **Subtotal** | | **16** | **2,500,000** |

#### **Total Deployment Gas: ~30,400,000 gas**

### Cost Calculation (Base Mainnet)
- **Gas Price**: 0.3 gwei (conservative estimate)
- **Total Gas**: 30,400,000
- **Total Cost**: 30,400,000 × 0.3 gwei = 0.00912 ETH
- **USD Equivalent** (ETH @ $2,500): **~$22.80**

---

## 🌳 Tree Minting Cost Analysis

### Minting Trees (Initial: 10 Trees)

Based on `add-farms-base.js` script:

#### Per Tree Minting Operations
1. **MLT Mint** (if new farm): ~150,000 gas (one-time per farm)
2. **MTT Mint** (per tree): ~80,000 gas per tree
3. **Farm Registration**: ~200,000 gas (one-time per farm)

#### Estimated Costs for 10 Trees (Initial Deployment)

**Single Farm with 10 Trees**
- MLT Mint: 150,000 gas
- MTT Mints: 10 × 80,000 = 800,000 gas
- Farm Registration: 200,000 gas
- **Total**: 1,150,000 gas
- **Cost @ 0.3 gwei**: 0.000345 ETH ≈ **$0.86**

#### Estimated Costs for 300 Trees (Full Scale)

**Scenario 1: Single Farm with 300 Trees**
- MLT Mint: 150,000 gas
- MTT Mints: 300 × 80,000 = 24,000,000 gas
- Farm Registration: 200,000 gas
- **Total**: 24,350,000 gas
- **Cost @ 0.3 gwei**: 0.007305 ETH ≈ **$18.26**

**Scenario 2: Multiple Farms (e.g., 3 farms × 100 trees)**
- MLT Mints: 3 × 150,000 = 450,000 gas
- MTT Mints: 300 × 80,000 = 24,000,000 gas
- Farm Registrations: 3 × 200,000 = 600,000 gas
- **Total**: 25,050,000 gas
- **Cost @ 0.3 gwei**: 0.007515 ETH ≈ **$18.79**

---

## 💵 Total Cost Summary

### Complete Deployment + 10 Trees (Initial)

| Item | Gas | ETH Cost | USD Cost (@ $2,500/ETH) |
|------|-----|----------|--------------------------|
| Contract Deployments | 27,900,000 | 0.00837 | $20.93 |
| Initialization | 2,500,000 | 0.00075 | $1.88 |
| **Deployment Subtotal** | **30,400,000** | **0.00912** | **$22.80** |
| Tree Minting (10 trees) | 1,150,000 | 0.000345 | $0.86 |
| **GRAND TOTAL** | **31,550,000** | **0.009465** | **$23.66** |

### Complete Deployment + 300 Trees (Full Scale)

| Item | Gas | ETH Cost | USD Cost (@ $2,500/ETH) |
|------|-----|----------|--------------------------|
| Contract Deployments | 27,900,000 | 0.00837 | $20.93 |
| Initialization | 2,500,000 | 0.00075 | $1.88 |
| **Deployment Subtotal** | **30,400,000** | **0.00912** | **$22.80** |
| Tree Minting (300 trees) | 24,350,000 | 0.00731 | $18.26 |
| **GRAND TOTAL** | **54,750,000** | **0.01643** | **$41.06** |

### Recommended Balance
- **Minimum (10 trees)**: 0.01 ETH (~$25) - covers deployment + 10 trees with small buffer
- **Recommended (10 trees)**: 0.015 ETH (~$37.50) - includes buffer for verification and retries
- **Full Scale (300 trees)**: 0.02 ETH (~$50) - covers deployment + 300 trees with buffer
- **Safe**: 0.03 ETH (~$75) - comfortable margin for all operations

---

## 🔍 Current Wallet Balance Check

**Wallet Address**: `0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795`

**Current Balance**: **0.000003 ETH** (~$0.01 USD)

**Status**: ⚠️ **INSUFFICIENT FUNDS** - Cannot proceed with deployment

**Required Balance (10 trees)**: 0.015 ETH (~$37.50) recommended

**Shortfall**: 0.014997 ETH (~$37.49) needed

View on BaseScan: https://basescan.org/address/0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795

---

## ✅ What Can Be Accomplished

### ⚠️ CURRENT BALANCE: 0.000003 ETH (~$0.01)
- ❌ **Cannot deploy any contracts** (insufficient funds)
- ❌ **Cannot mint trees** (insufficient funds)
- **Action Required**: Fund wallet with minimum 0.015 ETH for 10 trees

### With 0.01 ETH (~$25) - **MINIMUM FOR 10 TREES**
- ✅ Deploy all contracts
- ✅ Mint 10 trees
- ⚠️ Very tight budget, minimal buffer

### With 0.015 ETH (~$37.50) - **RECOMMENDED FOR 10 TREES**
- ✅ Deploy all contracts
- ✅ Mint 10 trees
- ✅ Buffer for contract verification
- ✅ Buffer for retries/errors

### With 0.02 ETH (~$50) - **FOR 300 TREES**
- ✅ Deploy all contracts
- ✅ Mint 300 trees
- ⚠️ Tight budget, minimal buffer

### With 0.03 ETH (~$75) - **SAFE FOR FULL SCALE**
- ✅ Deploy all contracts
- ✅ Mint 300+ trees
- ✅ Multiple farms
- ✅ Contract verification
- ✅ Comfortable buffer for all operations

---

## 📝 Notes

1. **Base Mainnet has very low gas fees** - typically 0.1-0.5 gwei
2. **Gas prices fluctuate** - current estimates use 0.3 gwei (conservative)
3. **Contract verification** - Additional ~0.001 ETH per contract (optional but recommended)
4. **Tree minting can be batched** - More efficient than individual mints
5. **Farm creation** - One-time cost per farm, then trees are minted to that farm

---

## 🚀 Next Steps

### ⚠️ IMMEDIATE ACTION REQUIRED

**Current Status**: Wallet has insufficient funds (0.000003 ETH)

**Required Action**: Fund wallet with **0.015 ETH minimum** (~$37.50 USD) for deployment + 10 trees

### Funding Options

1. **Bridge from Ethereum Mainnet**
   - Use Base Bridge: https://bridge.base.org/
   - Send ETH from Ethereum Mainnet to Base Mainnet
   - Typical bridge time: 1-2 minutes

2. **Use Base Onramp**
   - Coinbase (if available in your region)
   - Other Base-compatible onramps

3. **Transfer from Exchange**
   - Withdraw ETH directly to Base Mainnet network
   - Ensure you select "Base" network, not Ethereum

### After Funding

1. ✅ **Verify balance** on BaseScan: https://basescan.org/address/0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795
2. ✅ **Deploy contracts** using `npm run deploy:base`
3. ✅ **Verify contracts** on BaseScan (optional but recommended)
4. ✅ **Mint trees** using `npm run add:farms:base`

---

**Last Updated**: January 23, 2025
**Gas Price Assumption**: 0.3 gwei (conservative)
**ETH Price Assumption**: $2,500 USD
