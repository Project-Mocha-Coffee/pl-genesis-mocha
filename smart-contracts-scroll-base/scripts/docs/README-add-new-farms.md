# Add New Farms Script

This script allows you to add new farms to the Mocha Coffee Tree Farm system by minting MLT (Mocha Land Token) and MTT (Mocha Tree Token) tokens, and registering farms in the vault.

## Overview

The `add-new-farms.js` script is designed to:
- Check for existing farm tokens to avoid conflicts
- Mint new MLT tokens for farm owners
- Mint new MTT tokens representing trees on each farm
- Register farms in the vault system
- Provide detailed logging and error handling

## Prerequisites

1. **Environment Setup**: Ensure you have the `DEPLOYER_PRIVATE_KEY` environment variable set
2. **Deployment Files**: The script requires:
   - Deployment file: `deployments/deployment-scrollSepolia-chain-534351-2025-08-11T14-58-45-568Z.txt`
   - Accounts file: `accounts/accounts-scrollSepolia-534351-2025-08-01T16-14-51-798Z.txt`
3. **Farm Owner Accounts**: Ensure farm owner accounts exist in the accounts file with the naming convention `FARMOWNER{id}`

## Configuration

### Adding New Farms

Edit the `NEW_FARM_CONFIGS` array in the script to define your new farms:

```javascript
const NEW_FARM_CONFIGS = [
    {
        id: 3, // Unique farm ID (must not conflict with existing farms)
        name: "Mountain Arabica Estate",
        targetAPY: 1400, // 14% APY (in basis points)
        maturityPeriod: 42, // 42 months
        treeCount: 8, // Number of trees on this farm
        minInvestment: ethers.parseEther("15"), // Minimum investment in MBT
        maxInvestment: ethers.parseEther("1500"), // Maximum investment in MBT
        location: "Ethiopia, Sidamo",
        area: "12 hectares",
        soilType: "Red clay loam",
        certifications: "Organic Certified, Fair Trade, Rainforest Alliance"
    },
    // Add more farms as needed
];
```

### Farm Configuration Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | number | Unique farm identifier | `3` |
| `name` | string | Farm name | `"Mountain Arabica Estate"` |
| `targetAPY` | number | Target annual yield in basis points | `1400` (14%) |
| `maturityPeriod` | number | Bond maturity period in months | `42` |
| `treeCount` | number | Number of trees on the farm | `8` |
| `minInvestment` | BigNumber | Minimum investment amount in MBT | `ethers.parseEther("15")` |
| `maxInvestment` | BigNumber | Maximum investment amount in MBT | `ethers.parseEther("1500")` |
| `location` | string | Geographic location | `"Ethiopia, Sidamo"` |
| `area` | string | Farm area | `"12 hectares"` |
| `soilType` | string | Type of soil | `"Red clay loam"` |
| `certifications` | string | Farm certifications | `"Organic Certified, Fair Trade"` |

## Usage

### Running the Script

```bash
# Set your deployer private key
export DEPLOYER_PRIVATE_KEY="your_private_key_here"

# Run the script
npx hardhat run scripts/add-new-farms.js --network scrollSepolia
```

### Script Flow

The script follows this process for each farm:

1. **Farm Owner Validation**: Checks if the farm owner account exists
2. **MLT Token Check**: Verifies if the MLT token already exists
3. **MLT Token Minting**: Mints new MLT token if it doesn't exist
4. **MTT Token Processing**: Checks and mints MTT tokens for each tree
5. **Vault Registration**: Checks if farm exists in vault and adds it if needed
6. **Verification**: Confirms successful addition and displays farm details

### Error Handling

The script includes comprehensive error handling:
- **Missing Accounts**: Skips farms with missing owner accounts
- **Existing Tokens**: Handles cases where tokens already exist
- **Ownership Conflicts**: Detects and reports ownership mismatches
- **Transaction Failures**: Continues processing other farms if one fails
- **Detailed Logging**: Provides clear status messages for each step

## Output

The script provides detailed output including:

```
Add New Farms Script
===================

Contract Addresses:
  MTTR (Vault): 0x...
  MLT (Land): 0x...
  MTT (Tree): 0x...

Processing 2 new farm(s)...

Processing Farm 3: Mountain Arabica Estate
==================================================
STEP 1: Checking MLT token existence...
   MLT token 3 does not exist, will mint new token
STEP 2: Minting MLT token...
   ✅ MLT token 3 minted to 0x...
STEP 3: Checking MTT tokens...
   ✅ MTT token (farm 3, tree 1) minted
   ✅ MTT token (farm 3, tree 2) minted
   ...
   8 new MTT tokens minted for farm 3
STEP 4: Checking vault for existing farm...
   Farm 3 not yet in vault, proceeding with addition
STEP 5: Adding farm to vault...
   ✅ Farm 3 added to vault successfully
   Farm Name: Mountain Arabica Estate
   Farm Owner: 0x...
   Target APY: 1400 bps
   Active: true
   Share Token: 0x...

✅ Farm 3 processing completed successfully!

Summary:
========
Farm 3 (Mountain Arabica Estate):
  MLT Owner: 0x...
  Vault Owner: 0x...
  Active: true
```

## Important Notes

1. **Farm ID Conflicts**: Ensure farm IDs don't conflict with existing farms
2. **Account Requirements**: Farm owner accounts must exist in the accounts file
3. **Gas Costs**: Each farm addition requires multiple transactions
4. **Network**: Make sure you're connected to the correct network
5. **Permissions**: The deployer account must have minting permissions

## Troubleshooting

### Common Issues

1. **"Farm owner not found"**: Add the missing farm owner account to the accounts file
2. **"MLT token already exists"**: The farm ID is already in use, choose a different ID
3. **"Insufficient funds"**: Ensure the deployer account has enough ETH for gas
4. **"Permission denied"**: Verify the deployer has minting permissions

### Debug Mode

For additional debugging, you can add console.log statements or check the transaction receipts for more details about failed operations.

## Security Considerations

- Keep your private keys secure and never commit them to version control
- Verify farm configurations before running the script
- Test on testnet before running on mainnet
- Review all transactions before confirming them











