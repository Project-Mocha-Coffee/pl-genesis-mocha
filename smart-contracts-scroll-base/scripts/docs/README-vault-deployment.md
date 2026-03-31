# Vault System Deployment Script

This script deploys the MochaTreeRightsToken (MTTR) vault system with the required token addresses.

## Overview

The `deploy-vault-system.js` script deploys the main vault contract that manages farm-specific tranches and asset-backed bonds. It requires the addresses of the three main tokens in the ecosystem.

## Prerequisites

1. **Environment Setup**: Ensure your `.env` file contains:
   ```
   PRIVATE_KEY=your_private_key
   SCROLL_SEPOLIA_RPC_URL=your_rpc_url
   ```

2. **Token Addresses**: You need the deployed addresses of:
   - **MBT Token** (MochaBeanToken) - ERC20 token used for deposits/withdrawals
   - **MLT Token** (MochaLandToken) - ERC721 token representing farm ownership
   - **MTT Token** (MochaTreeToken) - ERC6960 DLT token representing individual trees

## Usage

### Configuration Setup

Before running the deployment script, update the token addresses in the script:

```javascript
// In scripts/deploy-vault-system.js
const TOKEN_ADDRESSES = {
    // MBT Token (ERC20) - Used for deposits/withdrawals
    asset: "0x1234567890123456789012345678901234567890", // Replace with actual MBT address
    
    // MochaLandToken (ERC721) - Represents farm ownership
    mochaLandToken: "0x2345678901234567890123456789012345678901", // Replace with actual MLT address
    
    // MochaTreeToken (ERC6960 DLT) - Represents individual trees
    mochaTreeToken: "0x3456789012345678901234567890123456789012"  // Replace with actual MTT address
};
```

### Command Line Usage

```bash
# Deploy vault system (addresses configured in script)
npx hardhat run scripts/deploy-vault-system.js --network scrollSepolia

# Example
npx hardhat run scripts/deploy-vault-system.js --network scrollSepolia
```

### NPM Script Usage

```bash
# Using the npm script
npm run deploy:vault
```

## Configuration

The script uses the following configuration objects defined at the top of the file:

### Token Addresses
```javascript
const TOKEN_ADDRESSES = {
    asset: "0x...",           // MBT Token (ERC20)
    mochaLandToken: "0x...",  // MLT Token (ERC721)
    mochaTreeToken: "0x..."   // MTT Token (ERC6960 DLT)
};
```

### Vault Configuration
```javascript
const VAULT_CONFIG = {
    name: "Mocha Tree Rights Token",
    symbol: "MTTR"
};
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `asset` | address | Address of the MochaBeanToken (ERC20) |
| `mochaLandToken` | address | Address of the MochaLandToken (ERC721) |
| `mochaTreeToken` | address | Address of the MochaTreeToken (ERC6960 DLT) |

## Deployment Process

### 1. Validation
- Validates deployer account and balance
- Checks that all required addresses are provided
- Validates address format using `ethers.isAddress()`

### 2. Deployment
- Deploys the `MochaTreeRightsToken` contract with constructor parameters:
  - `_asset`: MBT token address
  - `_name`: "Mocha Tree Rights Token"
  - `_symbol`: "MTTR"
  - `_mochaLandToken`: MLT token address
  - `_mochaTreeToken`: MTT token address

### 3. Verification
- Calls view functions to verify deployment
- Checks that deployed addresses match input addresses
- Validates initial vault state (0 farms, 0 TVL)

### 4. Documentation
- Generates deployment summary
- Saves deployment data to JSON file
- Provides next steps for post-deployment setup

## Output

### Console Output
```
🌱 Deploying Mocha Coffee Vault System
=====================================

📡 Network: scrollSepolia

👤 Deployer: 0x1234...
💰 Balance: 1.234 ETH

📋 Deployment Parameters:
   Asset (MBT): 0x5678...
   MochaLandToken (MLT): 0x9abc...
   MochaTreeToken (MTT): 0xdef0...

🔧 Deploying Library Contracts...
   Deploying MTTRBondLib library...
   ✅ MTTRBondLib deployed at: 0x3333...
   Deploying MTTRFarmLib library...
   ✅ MTTRFarmLib deployed at: 0x4444...
   Deploying MTTRYieldLib library...
   ✅ MTTRYieldLib deployed at: 0x5555...

🔧 Deploying MochaTreeRightsToken (MTTR) Vault...
✅ MTTR Vault deployed successfully!
   Address: 0x1111...
   Transaction: 0x2222...

🔍 Verifying deployment...
   Asset: 0x5678...
   MochaLandToken: 0x9abc...
   MochaTreeToken: 0xdef0...
   Total Farms: 0
   Total Value Locked: 0.0 MBT
✅ Address verification passed!

📄 Deployment Summary:
======================
   Network: scrollSepolia
   Deployer: 0x1234...
   MTTRBondLib Library: 0x3333...
   MTTRFarmLib Library: 0x4444...
   MTTRYieldLib Library: 0x5555...
   MTTR Vault: 0x1111...
   Deployment File: deployments/deployment-vault-scrollSepolia-2025-01-15T10-30-00-000Z.json

🎉 Vault system deployment completed successfully!

📋 Next Steps:
   1. Verify the contract on block explorer
   2. Set up farm management permissions
   3. Add initial farms using add-new-farms.js
   4. Test vault functionality
```

### Deployment File
The script creates a JSON file in the `deployments/` directory with the following structure:

```json
{
  "network": "scrollSepolia",
  "deployer": "0x1234...",
  "deploymentTimestamp": "2025-01-15T10:30:00.000Z",
  "contracts": {
    "MTTRBondLib": {
      "address": "0x3333...",
      "transaction": "0x6666..."
    },
    "MTTRFarmLib": {
      "address": "0x4444...",
      "transaction": "0x7777..."
    },
    "MTTRYieldLib": {
      "address": "0x5555...",
      "transaction": "0x8888..."
    },
    "MochaTreeRightsToken": {
      "address": "0x1111...",
      "transaction": "0x2222...",
      "constructorArgs": {
        "asset": "0x5678...",
        "name": "Mocha Tree Rights Token",
        "symbol": "MTTR",
        "mochaLandToken": "0x9abc...",
        "mochaTreeToken": "0xdef0..."
      },
      "libraries": {
        "MTTRBondLib": "0x3333...",
        "MTTRFarmLib": "0x4444...",
        "MTTRYieldLib": "0x5555..."
      }
    }
  },
  "parameters": {
    "asset": "0x5678...",
    "mochaLandToken": "0x9abc...",
    "mochaTreeToken": "0xdef0..."
  },
  "configuration": {
    "tokenAddresses": {
      "asset": "0x5678...",
      "mochaLandToken": "0x9abc...",
      "mochaTreeToken": "0xdef0..."
    },
    "vaultConfig": {
      "name": "Mocha Tree Rights Token",
      "symbol": "MTTR"
    }
  }
}
```

## Post-Deployment Steps

### 1. Contract Verification
```bash
# Verify libraries first
npx hardhat verify --network scrollSepolia 0x3333...  # MTTRBondLib
npx hardhat verify --network scrollSepolia 0x4444...  # MTTRFarmLib
npx hardhat verify --network scrollSepolia 0x5555...  # MTTRYieldLib

# Verify vault contract with library linking
npx hardhat verify --network scrollSepolia 0x1111... 0x5678... "Mocha Tree Rights Token" "MTTR" 0x9abc... 0xdef0... --libraries MTTRBondLib:0x3333... MTTRFarmLib:0x4444... MTTRYieldLib:0x5555...
```

### 2. Farm Management Setup
- Grant `VAULT_MANAGER_ROLE` to farm management contracts
- Grant `BOND_MANAGER_ROLE` to bond management contracts
- Set up farm owners and operators

### 3. Add Initial Farms
```bash
# Use the add-new-farms.js script
npm run add:farms
```

### 4. Test Vault Functionality
```bash
# Check vault statistics
npm run vault:stats

# Test storage address functionality
npm run test:storage-address
```

## Error Handling

### Common Issues

1. **"Invalid asset address"**
   - Verify the MBT token address is correct in the script configuration
   - Ensure the address is in valid format

2. **"Invalid MochaLandToken address"**
   - Verify the MLT token address is correct in the script configuration
   - Ensure the address is in valid format

3. **"Invalid MochaTreeToken address"**
   - Verify the MTT token address is correct in the script configuration
   - Ensure the address is in valid format

3. **"Deployment failed"**
   - Check deployer account balance
   - Verify network configuration
   - Check RPC endpoint connectivity

4. **"Address verification failed"**
   - This indicates a serious deployment issue
   - Check constructor parameters
   - Verify contract compilation

## Gas Estimation

The deployment typically requires:
- **MTTRBondLib Library**: ~300,000 gas
- **MTTRFarmLib Library**: ~300,000 gas
- **MTTRYieldLib Library**: ~300,000 gas
- **MTTR Vault**: ~2,000,000 gas
- **Total Deployment**: ~2,900,000 gas
- **Verification**: ~50,000 gas (view calls)

## Security Considerations

1. **Admin Roles**: The deployer automatically gets all admin roles
2. **Token Validation**: Ensure token addresses point to correct contracts
3. **Network Security**: Use test networks for initial deployment
4. **Access Control**: Review and configure roles after deployment

## Integration

This deployment script integrates with:
- `add-new-farms.js` - Add farms to the deployed vault
- `update-existing-farms.js` - Update farm configurations
- `get-vault-statistics.js` - Monitor vault performance
- `test-storage-address.js` - Test storage functionality

## Support

For deployment issues:
1. Check the error logs for specific details
2. Verify all token addresses are correct
3. Ensure sufficient balance for deployment
4. Review network configuration and RPC settings
