# ICO Minimum Investment Amounts Management Scripts

This directory contains scripts to manage the minimum investment amounts for the ICO smart contract.

## Scripts Overview

### 1. `read-ico-minimums.js`
**Purpose**: Read and display current ICO minimum investment amounts and other parameters.

**Usage**:
```bash
npx hardhat run scripts/read-ico-minimums.js --network scrollSepolia
```

**Features**:
- Displays current minimum amounts for all supported assets
- Shows other ICO parameters (max tokens, slippage, etc.)
- Checks if ICO is active
- No admin role required (read-only)

### 2. `update-ico-minimums.js`
**Purpose**: Update ICO minimum investment amounts with predefined values.

**Usage**:
```bash
npx hardhat run scripts/update-ico-minimums.js --network scrollSepolia
```

**Predefined Values**:
- ETH: 0.01 ETH (increased from 0.001 ETH)
- USDT: 10 USDT (increased from 1 USDT)
- USDC: 10 USDC (increased from 1 USDC)
- WBTC: 0.001 WBTC (increased from 0.0001 WBTC)
- SCR: 10 SCR (increased from 1 SCR)

**Requirements**:
- Admin role required
- Must be run by an account with `ADMIN_ROLE`

### 3. `update-ico-minimums-custom.js`
**Purpose**: Update ICO minimum investment amounts with custom values.

**Usage**:
```bash
# Using command line arguments
npx hardhat run scripts/update-ico-minimums-custom.js --network scrollSepolia 0.005 5 5 0.0005 5

# Using environment variables
MIN_ETH=0.005 MIN_USDT=5 MIN_USDC=5 MIN_WBTC=0.0005 MIN_SCR=5 npx hardhat run scripts/update-ico-minimums-custom.js --network scrollSepolia
```

**Parameters** (in order):
1. `ETH` - Minimum ETH amount (in ETH units, e.g., "0.005")
2. `USDT` - Minimum USDT amount (in USDT units, e.g., "5")
3. `USDC` - Minimum USDC amount (in USDC units, e.g., "5")
4. `WBTC` - Minimum WBTC amount (in WBTC units, e.g., "0.0005")
5. `SCR` - Minimum SCR amount (in SCR units, e.g., "5")

**Requirements**:
- Admin role required
- Must be run by an account with `ADMIN_ROLE`

## Current Minimum Amounts

Based on the ICO contract:

| Asset | Current Minimum | Decimals |
|-------|----------------|----------|
| ETH   | 0.001 ETH      | 18       |
| USDT  | 1 USDT         | 6        |
| USDC  | 1 USDC         | 6        |
| WBTC  | 0.0001 WBTC    | 8        |
| SCR   | 1 SCR          | 18       |

## Examples

### Read Current Minimums
```bash
npx hardhat run scripts/read-ico-minimums.js --network scrollSepolia
```

### Update with Predefined Values
```bash
npx hardhat run scripts/update-ico-minimums.js --network scrollSepolia
```

### Update with Custom Values
```bash
# Set minimums: 0.01 ETH, 20 USDT, 20 USDC, 0.002 WBTC, 20 SCR
npx hardhat run scripts/update-ico-minimums-custom.js --network scrollSepolia 0.01 20 20 0.002 20
```

### Update Only Specific Assets
```bash
# Update only ETH and USDT, leave others unchanged (set to 0)
npx hardhat run scripts/update-ico-minimums-custom.js --network scrollSepolia 0.02 50 0 0 0
```

## Important Notes

1. **Admin Role Required**: Only accounts with `ADMIN_ROLE` can update minimum amounts.

2. **Zero Values**: Setting a minimum to "0" will leave that asset's minimum unchanged.

3. **Decimal Precision**: 
   - ETH and SCR use 18 decimals
   - USDT and USDC use 6 decimals
   - WBTC uses 8 decimals

4. **Gas Costs**: Updating minimum amounts requires a transaction and gas fees.

5. **Immediate Effect**: Changes take effect immediately after the transaction is confirmed.

## Error Handling

The scripts include comprehensive error handling for:
- Missing deployment info
- Invalid contract addresses
- Missing admin role
- Transaction failures
- Network connectivity issues

## Deployment Info

The scripts automatically load deployment information from:
- `deployments/{network}-ico-deployment.json`

This file contains:
- ICO contract address
- Token contract address
- Price feed addresses
- Token addresses
- Network parameters

## Security Considerations

1. **Admin Role**: Only grant admin role to trusted accounts
2. **Minimum Values**: Set reasonable minimum values to prevent dust attacks
3. **Testing**: Always test on testnet before mainnet deployment
4. **Backup**: Keep backup of original minimum values

## Troubleshooting

### "Deployer does not have admin role"
- Ensure the account running the script has `ADMIN_ROLE`
- Use `scripts/manage-mbt-minter-role.js` to check/grant roles

### "Failed to load deployment info"
- Ensure the deployment file exists for the target network
- Check the network name matches the deployment file

### "Transaction failed"
- Check gas limits and network congestion
- Ensure sufficient ETH for gas fees
- Verify all parameters are valid
