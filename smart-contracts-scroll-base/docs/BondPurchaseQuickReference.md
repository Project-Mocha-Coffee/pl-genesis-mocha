# Bond Purchase Quick Reference

## Essential Steps for Bond Purchase

### For Farm Owners (One-time Setup)

1. **Own MLT Token**: Must own MochaLandToken representing the farm
2. **Have MTT Tokens**: Must have MochaTreeTokens representing trees on the farm
3. **Add Farm to Vault**:
   ```solidity
   await mttr.addFarm(
       farmId,                    // MLT token ID
       "Farm Name",              // Farm name
       farmTokenBoundAccount,    // ERC6551 account
       targetAPY,                // 0-3000 basis points (0-30%)
       maturityPeriod            // 36-60 months
   );
   ```

### For Investors (Per Bond Purchase)

1. **Check Farm Status**:
   ```solidity
   const farmConfig = await mttr.getFarmConfig(farmId);
   require(farmConfig.active, "Farm not active");
   ```

2. **Approve MBT Spending**:
   ```solidity
   await mbt.approve(mttrAddress, bondAmount);
   ```

3. **Purchase Bond**:
   ```solidity
   const bondId = await mttr.purchaseBond(farmId, bondAmount);
   ```

## Key Requirements

### Farm Requirements
- **Minimum Maturity**: 36 months
- **Maximum Maturity**: 60 months
- **APY Range**: 0-30% (0-3000 basis points)
- **Minimum Trees**: At least 1 MTT token
- **Collateral Ratio**: 120% (12000 basis points)

### Investment Requirements
- **Minimum Investment**: 100 MBT
- **Maximum Investment**: 50,000 MBT
- **Tree Valuation**: 100 MBT per tree (default)

### Bond Lifecycle
1. **Purchase**: MBT → Share tokens + bond position
2. **Early Redemption**: 5% penalty, 95% principal returned
3. **Maturity Redemption**: Full principal + yield returned

## Common Functions

### View Functions
```solidity
// Get farm configuration
await mttr.getFarmConfig(farmId);

// Get bond position
await mttr.getBondPosition(investor, bondId);

// Get collateral info
await mttr.getCollateralInfo(farmId);

// Get yield distribution
await mttr.getYieldDistribution(farmId);
```

### Bond Operations
```solidity
// Purchase bond
await mttr.purchaseBond(farmId, mbtAmount);

// Early redemption
await mttr.redeemBondEarly(bondId);

// Maturity redemption
await mttr.redeemBond(bondId);
```

### Admin Functions
```solidity
// Distribute yield (VAULT_MANAGER_ROLE)
await mttr.distributeYield(farmId, yieldAmount);

// Update collateral (ORACLE_ROLE)
await mttr.updateCollateralValuation(farmId, newValuation);
```

## Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| "Farm not found in vault" | Farm not added | Add farm via `addFarm()` |
| "Insufficient MBT balance" | Low MBT balance | Get more MBT tokens |
| "Farm is not active" | Farm paused/matured | Check farm status |
| "Invalid maturity period" | Outside 36-60 months | Adjust maturity period |
| "Bond already redeemed" | Bond already redeemed | Check bond status |

## Gas Estimates

| Operation | Gas Cost |
|-----------|----------|
| Farm Addition | ~500,000 |
| Bond Purchase | ~200,000 |
| Early Redemption | ~150,000 |
| Maturity Redemption | ~180,000 |
| Yield Distribution | ~250,000 |

## Contract Addresses (Scroll Sepolia)

- **MTTR (MochaTreeRightsToken)**: `0x4b02Bada976702E83Cf91Cd0B896852099099352`
- **MBT (MochaBeanToken)**: `0xb75083585DcB841b8B04ffAC89c78a16f2a5598B`
- **MLT (MochaLandToken)**: `0x5DEbebba8a4dABCb6B6e31ee848E8B87Ea357980`
- **MTT (MochaTreeToken)**: `0xd9AB9d286F73073d770d1aA9115842e29bcA6618`

## Quick Integration Example

```javascript
// Setup
const mttr = await ethers.getContractAt("MochaTreeRightsToken", mttrAddress);
const mbt = await ethers.getContractAt("MochaBeanToken", mbtAddress);

// Purchase bond
const bondAmount = ethers.parseEther("100");
await mbt.approve(mttrAddress, bondAmount);
const bondId = await mttr.purchaseBond(farmId, bondAmount);

// Check position
const position = await mttr.getBondPosition(investorAddress, bondId);
console.log("Bond Amount:", ethers.formatEther(position.depositAmount));
```








