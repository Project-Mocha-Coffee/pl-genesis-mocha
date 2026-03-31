# Fix: "No active farms found" on Base Networks

## Problem
When trying to invest on Base Sepolia or Base Mainnet, users get the error: "No active farms found. Please check back later."

## Solution
Farms need to be created on each network separately. Use the provided script to add farms to Base networks.

## Quick Fix

### For Base Sepolia Testnet:
```bash
cd smart-contracts-erc4626
npm run add:farms:base:sepolia
```

### For Base Mainnet:
```bash
cd smart-contracts-erc4626
npm run add:farms:base
```

## What the Script Does

1. **Loads deployment info** - Finds the most recent deployment file for the network
2. **Connects to Diamond** - Uses the deployed Diamond contract address
3. **Creates test farm** - Adds a farm with:
   - 10 trees
   - 10% APY
   - 48-month maturity
   - Min investment: 0.04 MBT ($1)
   - Max investment: 80 MBT
   - Farm cap: 1000 MBT

## Prerequisites

1. ✅ Contracts deployed on target network
2. ✅ `.env` file with `PRIVATE_KEY` set
3. ✅ Deployer wallet has ETH for gas

## Verification

After running the script, verify farms exist:

1. Check the script output - it will show all active farms
2. In the portal, switch to Base Sepolia
3. Try to invest - the "No active farms found" error should be gone

## Customizing Farms

Edit `scripts/base/add-farms-base.js` and modify the `FARM_CONFIGS` array:

```javascript
const FARM_CONFIGS = [
  {
    id: 1,
    name: "Your Farm Name",
    targetAPY: 1000, // 10% in basis points
    maturityPeriod: 48, // months
    treeCount: 10,
    minInvestment: ethers.parseEther("0.04"),
    maxInvestment: ethers.parseEther("80"),
    farmCap: ethers.parseEther("1000"),
    bondValue: ethers.parseEther("100"),
    collateralRatio: 15000, // 150%
  }
];
```

## Notes

- Farms are network-specific - each network needs its own farms
- The script skips farms that already exist
- Multiple farms can be added by adding more entries to `FARM_CONFIGS`
