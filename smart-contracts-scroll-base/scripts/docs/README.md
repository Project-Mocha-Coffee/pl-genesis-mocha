# T Deployment Scripts

## Overview

This directory contains scripts for deploying and interacting with the TreeFarm Diamond system on Scroll zkEVM blockchain, a comprehensive coffee investment platform using the EIP-2535 Diamond Standard.

## Scroll zkEVM Network Support

### Supported Networks

1. **Scroll Mainnet** (`scroll`)
   - Chain ID: 534352 (0x82750)
   - RPC URL: https://rpc.scroll.io/
   - Block Explorer: https://scrollscan.com
   - Currency: ETH

2. **Scroll Sepolia Testnet** (`scrollSepolia`)
   - Chain ID: 534353 (0x82751)
   - RPC URL: https://sepolia-rpc.scroll.io/
   - Block Explorer: https://sepolia.scrollscan.com
   - Currency: ETH (testnet)

3. **Scroll (Alternative RPC)** (`scrollAnkr`)
   - Chain ID: 534352
   - RPC URL: https://rpc.ankr.com/scroll
   - Backup RPC for mainnet

### Why Scroll?

- **zkEVM Technology**: High throughput at lower costs with strong security guarantees
- **EVM Compatibility**: All existing Ethereum tools work out of the box
- **Lower Gas Fees**: Significantly reduced transaction costs compared to Ethereum mainnet
- **Fast Finality**: Quick transaction confirmations

## Environment Setup

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
cp env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your deployment settings:

```bash
# Your deployment private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Scroll network URLs (optional, defaults provided)
SCROLL_RPC_URL=https://rpc.scroll.io/
SCROLL_SEPOLIA_RPC_URL=https://sepolia-rpc.scroll.io/

# For contract verification
SCROLL_API_KEY=your_scrollscan_api_key
```

### 3. Get Test ETH (for Sepolia)

For testnet deployment, get Sepolia ETH:
- Join the [Scroll Telegram faucet](https://t.me/scrollofficial) 
- Send `/drop YOUR_ADDRESS` to receive testnet ETH

## Scripts

### 1. `deployDiamond.js` - Main Deployment Script

**Purpose**: Comprehensive deployment of the entire Mocha system including all tokens, diamond facets, and utility contracts.

**Features**:
- ✅ Deploys all token contracts (MBT, MTT, MLT, MTTR)
- ✅ Deploys all diamond facets (12 facets total)
- ✅ Creates and configures the TreeFarm Diamond
- ✅ Sets up contract relationships and dependencies
- ✅ Outputs deployment addresses to JSON and TXT files
- ✅ Provides deployment summary and verification

**Usage for Scroll Networks**:

```bash
# Deploy to Scroll Mainnet
npx hardhat run scripts/deployDiamond.js --network scroll

# Deploy to Scroll Sepolia Testnet
npx hardhat run scripts/deployDiamond.js --network scrollSepolia

# Deploy using alternative Scroll RPC
npx hardhat run scripts/deployDiamond.js --network scrollAnkr

# Deploy to local Hardhat network (for testing)
npx hardhat run scripts/deployDiamond.js --network localhost
```

**Output Files**:
- `deployments/deployment-{timestamp}.json` - Complete deployment data
- `deployments/deployment-{timestamp}.txt` - Human-readable summary

### 2. `interact-with-contracts.js` - Contract Interaction Helper

**Purpose**: Load deployed contracts and provide ready-to-use contract instances for interaction.

**Usage for Scroll Networks**:

```bash
# Interact with contracts on Scroll Mainnet
npx hardhat run scripts/interact-with-contracts.js --network scroll

# Interact with contracts on Scroll Sepolia
npx hardhat run scripts/interact-with-contracts.js --network scrollSepolia
```

### 3. `libraries/diamond.js` - Diamond Utilities

Helper functions for diamond deployment and management specific to the EIP-2535 standard.

## System Architecture on Scroll

### Tokens Deployed
1. **MochaBeanToken (MBT)** - ERC20 liquidity/reward token
2. **MochaTreeToken (MTT)** - DLT (ERC6960) for tokenizing individual trees
3. **MochaLandToken (MLT)** - ERC721 for land parcel ownership
4. **MochaTreeRightsToken (MTTR)** - ERC4626 vault for multi-tranche bonds

### Diamond Facets Deployed
1. **DiamondCutFacet** - Diamond management
2. **DiamondLoupeFacet** - Diamond introspection
3. **OwnershipFacet** - Ownership management
4. **InitializationFacet** - System initialization
5. **FarmManagementFacet** - Farm operations
6. **TreeManagementFacet** - Tree lifecycle management
7. **YieldManagementFacet** - Yield distribution
8. **StakingFacet** - Staking mechanisms
9. **StakingRewardsFacet** - Reward distribution
10. **StakingYieldFacet** - Yield-based staking
11. **BondManagementFacet** - Bond operations
12. **MultiTrancheVaultFacet** - Multi-tranche bond management
13. **FarmShareTokenFacet** - Farm-specific token management

### Utility Contracts
- **YieldManager** - Manages yield tokenization and distribution

## Contract Verification on Scroll

After deployment, verify your contracts on ScrollScan:

```bash
# Verify contract on Scroll Mainnet
npx hardhat verify --network scroll DEPLOYED_CONTRACT_ADDRESS "constructor_arg1" "constructor_arg2"

# Verify contract on Scroll Sepolia
npx hardhat verify --network scrollSepolia DEPLOYED_CONTRACT_ADDRESS "constructor_arg1" "constructor_arg2"
```

## Example Deployment Workflow

### 1. Testnet Deployment (Recommended First)

```bash
# 1. Configure environment for testnet
echo "PRIVATE_KEY=your_testnet_private_key" > .env

# 2. Deploy to Scroll Sepolia
npx hardhat run scripts/deployDiamond.js --network scrollSepolia

# 3. Verify deployment worked
npx hardhat run scripts/interact-with-contracts.js --network scrollSepolia

# 4. Check deployed contracts on explorer
# https://sepolia.scrollscan.com
```

### 2. Mainnet Deployment

```bash
# 1. Update environment for mainnet
# Use a funded mainnet private key with sufficient ETH

# 2. Deploy to Scroll Mainnet
npx hardhat run scripts/deployDiamond.js --network scroll

# 3. Verify contracts (optional but recommended)
# Use addresses from deployment output

# 4. Interact with deployed system
npx hardhat run scripts/interact-with-contracts.js --network scroll
```

## Gas Optimization for Scroll

The configuration includes several optimizations for Scroll zkEVM:

- **Compiler Optimization**: `runs: 200` for balanced optimization
- **viaIR**: Enabled for better optimization through intermediate representation
- **Auto Gas Settings**: Automatic gas price and limit detection
- **Multiple Compilers**: Support for different Solidity versions

## Troubleshooting

### Common Issues

1. **"Insufficient funds for gas"**
   - Ensure your wallet has enough ETH for deployment
   - Check gas prices and limits in network configuration

2. **"Transaction underpriced"**
   - Increase gas price or use "auto" setting
   - Network congestion may require higher gas prices

3. **"Contract verification failed"**
   - Ensure you have the correct ScrollScan API key
   - Check constructor arguments match deployment

4. **"Network not found"**
   - Verify network name matches hardhat.config.js
   - Check RPC URL is accessible

### Getting Help

- **Scroll Discord**: [Join the community](https://discord.com/invite/scroll)
- **Documentation**: [Scroll Developer Docs](https://docs.scroll.io/)
- **Block Explorer**: [ScrollScan](https://scrollscan.com) for mainnet, [Sepolia ScrollScan](https://sepolia.scrollscan.com) for testnet

## Contract Relationships on Scroll

```
TreeFarmDiamond (Main Hub) [Deployed on Scroll]
├── All Facets (Business Logic)
├── MochaBeanToken (MBT) ←→ Diamond
├── MochaTreeToken (MTT) ←→ Diamond  
├── MochaLandToken (MLT) ←→ Diamond
├── MochaTreeRightsToken (MTTR) ←→ MBT
└── YieldManager ←→ Diamond & MBT
```

## Security Considerations for Scroll

- 🔒 All contracts use OpenZeppelin security patterns
- 🔒 Access control is properly configured
- 🔒 Diamond proxy security follows EIP-2535 standards
- 🔒 Contract relationships are validated during setup
- 🔒 zkEVM provides additional security through zero-knowledge proofs
- 🔒 Lower gas costs reduce economic attack vectors

## Post-Deployment on Scroll

After successful deployment:

1. ✅ Save deployment addresses securely
2. ✅ Verify contracts on ScrollScan
3. ✅ Set up monitoring for contract interactions
4. ✅ Configure frontend to use Scroll network
5. ✅ Test all functionality on testnet first
6. ✅ Consider setting up automatic contract monitoring

