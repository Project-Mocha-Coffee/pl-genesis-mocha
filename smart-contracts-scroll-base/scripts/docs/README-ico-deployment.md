# ICO Contract Deployment Guide

This guide explains how to deploy and configure the ICO contract for the Mocha Coffee project.

## Overview

The ICO contract allows users to purchase MTTR (Mocha Tree Rights Token) using various payment methods:
- ETH (Ethereum)
- USDT (Tether USD)
- USDC (USD Coin)
- WBTC (Wrapped Bitcoin)
- SCR (Scroll)

## Prerequisites

1. **Node.js and npm** installed
2. **Hardhat** configured with your network settings
3. **Private key** for deployment (set in `.env` file)
4. **Network-specific addresses** for price feeds and tokens

## Network Configuration

### Scroll Mainnet
- Chain ID: 534352
- RPC URL: `https://rpc.scroll.io/`
- Block Explorer: `https://scrollscan.com/`

### Scroll Sepolia Testnet
- Chain ID: 534351
- RPC URL: `https://sepolia-rpc.scroll.io/`
- Block Explorer: `https://sepolia.scrollscan.com/`

## Required Addresses

Before deploying to mainnet or testnet, you need to update the following addresses in `scripts/config/ico-deployment-config.js`:

### Chainlink Price Feeds
- ETH/USD
- USDT/USD
- USDC/USD
- BTC/USD
- SCR/USD

### ERC20 Token Addresses
- USDT
- USDC
- WBTC
- SCR

### MTTR Token Address
- The address of the deployed MochaTreeRightsToken contract

## Deployment Steps

### 1. Local Development Deployment

For local development, the script will automatically deploy mock contracts:

```bash
# Start local Hardhat node
npx hardhat node

# In another terminal, deploy to localhost
npx hardhat run scripts/deploy-ico.js --network localhost
```

### 2. Testnet Deployment

```bash
# Deploy to Scroll Sepolia testnet
npx hardhat run scripts/deploy-ico.js --network scrollSepolia
```

### 3. Mainnet Deployment

```bash
# Deploy to Scroll mainnet
npx hardhat run scripts/deploy-ico.js --network scroll
```

## Configuration

After deployment, configure the contract:

```bash
# Configure the deployed ICO contract
npx hardhat run scripts/configure-ico.js --network <network-name>
```

This will:
- Set minimum purchase amounts
- Configure slippage protection (5% default)
- Configure price deviation protection (10% default)
- Record initial prices for deviation protection

## Environment Variables

Create a `.env` file with the following variables:

```env
# Private key for deployment
PRIVATE_KEY=your_private_key_here

# RPC URLs (optional, defaults are provided)
SCROLL_RPC_URL=https://rpc.scroll.io/
SCROLL_SEPOLIA_RPC_URL=https://sepolia-rpc.scroll.io/

# API keys for verification (optional)
SCROLL_API_KEY=your_scroll_api_key

# MTTR token address for production deployment
MTTR_TOKEN_ADDRESS=0x...
```

## Deployment Output

The deployment script will:

1. **Deploy contracts** (ICO + mock contracts for local development)
2. **Verify deployment** by testing price feeds and token calculations
3. **Save deployment info** to `deployments/<network>-ico-deployment.json`
4. **Display summary** with contract addresses and next steps

## Contract Interaction Examples

### Get Current Prices
```javascript
const prices = await ico.getCurrentPrices();
console.log('ETH Price:', ethers.formatEther(prices.ethPrice));
```

### Preview Token Purchase
```javascript
const preview = await ico.previewTokenPurchase('ETH', ethers.parseEther('0.1'));
console.log('Tokens to receive:', ethers.formatEther(preview.tokensToReceive));
```

### Buy Tokens with ETH
```javascript
await ico.buyTokensWithEth(userAddress, 0, { value: ethers.parseEther('0.1') });
```

### Buy Tokens with USDT
```javascript
// First approve the ICO contract to spend USDT
await usdtToken.approve(icoAddress, ethers.parseUnits('100', 6));
// Then buy tokens
await ico.buyTokensWithUsdt(ethers.parseUnits('100', 6), 0);
```

## Security Considerations

1. **Verify all addresses** before mainnet deployment
2. **Test thoroughly** on testnet first
3. **Set appropriate minimum purchase amounts** to prevent dust attacks
4. **Monitor price feeds** for accuracy and staleness
5. **Implement proper access controls** for admin functions

## Troubleshooting

### Common Issues

1. **"No configuration found for network"**
   - Check that the network name matches the configuration
   - Ensure the network is properly configured in `hardhat.config.js`

2. **"MTTR_TOKEN_ADDRESS environment variable not set"**
   - Set the `MTTR_TOKEN_ADDRESS` environment variable for production deployment
   - Or deploy the MochaTreeRightsToken contract first

3. **"Invalid price feed address"**
   - Verify that the price feed addresses are correct for the target network
   - Check that the price feeds are active and returning valid data

4. **"Token transfer failed"**
   - Ensure the user has sufficient token balance
   - Check that the ICO contract has been approved to spend the tokens

### Verification

After deployment, verify the contract on the block explorer:

```bash
# Verify on Scroll mainnet
npx hardhat verify --network scroll <contract-address> <constructor-args>

# Verify on Scroll Sepolia
npx hardhat verify --network scrollSepolia <contract-address> <constructor-args>
```

## Next Steps

After successful deployment and configuration:

1. **Update frontend** with the new contract address
2. **Set up monitoring** for price feeds and contract events
3. **Implement proper testing** with real token amounts
4. **Document the deployment** for team members
5. **Set up backup procedures** for emergency situations

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the contract source code and tests
3. Consult the Hardhat documentation
4. Contact the development team

## Files

- `scripts/deploy-ico.js` - Main deployment script
- `scripts/configure-ico.js` - Post-deployment configuration script
- `scripts/config/ico-deployment-config.js` - Network configuration
- `contracts/ico/ICO.sol` - ICO contract source code
- `test/ico/ICOTest.js` - Comprehensive test suite
