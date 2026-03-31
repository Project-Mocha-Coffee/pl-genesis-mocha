# ICO Asset Withdrawal Script

This script provides comprehensive functionality to withdraw all assets from the ICO contract. It supports both regular withdrawals and emergency withdrawals for specific amounts.

## Prerequisites

- Admin role on the ICO contract
- Proper network configuration in `hardhat.config.js`
- Deployment information in `deployments/scrollSepolia-ico-deployment.json`

## Usage

### Basic Usage

```bash
# Check balances and ICO status (no withdrawals)
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia

# Withdraw all assets
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --withdraw-all

# Withdraw specific assets
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --withdraw-eth
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --withdraw-usdt
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --withdraw-usdc
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --withdraw-wbtc
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --withdraw-scr
```

### Emergency Withdrawals

For emergency withdrawals of specific amounts:

```bash
# Emergency withdraw specific amounts
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --emergency-withdraw-usdt 100
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --emergency-withdraw-usdc 50
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --emergency-withdraw-wbtc 0.1
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --emergency-withdraw-scr 1000

# Emergency withdraw all available (omit amount)
npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --emergency-withdraw-usdt
```

## Features

### 🔐 Security Checks
- Verifies admin role before allowing withdrawals
- Validates contract addresses and balances
- Comprehensive error handling

### 💰 Balance Monitoring
- Shows current contract balances for all assets
- Displays ICO status (active/inactive, tokens sold/remaining)
- Purchase statistics and volume tracking

### 🚀 Withdrawal Options
- **Regular Withdrawals**: Withdraws entire balance of specific assets
- **Emergency Withdrawals**: Withdraws specific amounts (useful for partial withdrawals)
- **Bulk Withdrawals**: Withdraws all assets in one command

### 📊 Asset Support
- **ETH**: Native Ethereum
- **USDT**: Tether USD (6 decimals)
- **USDC**: USD Coin (6 decimals)
- **WBTC**: Wrapped Bitcoin (8 decimals)
- **SCR**: Scroll Token (18 decimals)

## Output Example

```
🚀 ICO Asset Withdrawal Script
================================
📍 ICO Contract: 0x1234...5678
👤 Signer: 0xabcd...efgh
🔐 Checking admin role...
   ✅ 0xabcd...efgh has admin role

📊 ICO Status:
   Total tokens sold: 5000.0
   Max tokens to sell: 10000.0
   Remaining tokens: 5000.0
   ICO active: ✅ Yes

📈 Purchase Statistics:
   ETH volume: 10.5 ETH
   USDT volume: 25000.0 USDT
   USDC volume: 15000.0 USDC
   WBTC volume: 0.5 WBTC
   SCR volume: 100000.0 SCR

💰 Checking contract balances...
   ETH: 2.5 ETH
   USDT: 5000.0 USDT
   USDC: 3000.0 USDC
   WBTC: 0.1 WBTC
   SCR: 20000.0 SCR

💸 Withdrawing ETH...
   Withdrawing 2.5 ETH...
   📝 Transaction hash: 0x1234...5678
   ✅ ETH withdrawal successful! Gas used: 45000
   💰 New ETH balance: 0.0 ETH

💸 Withdrawing USDT...
   Withdrawing 5000.0 USDT...
   📝 Transaction hash: 0xabcd...efgh
   ✅ USDT withdrawal successful! Gas used: 65000
   💰 New USDT balance: 0.0 USDT

✅ Withdrawal script completed!
```

## Error Handling

The script handles various error scenarios:

- **No Admin Role**: Prevents execution if signer lacks admin privileges
- **No Assets**: Gracefully handles empty contract balances
- **Transaction Failures**: Provides detailed error messages and reasons
- **Network Issues**: Comprehensive error reporting with stack traces

## Safety Features

- **Dry Run Capability**: Run without arguments to check balances without withdrawing
- **Selective Withdrawals**: Withdraw specific assets only
- **Balance Verification**: Confirms withdrawal success by checking new balances
- **Gas Usage Tracking**: Reports gas consumption for each transaction

## Integration

The script can be imported and used programmatically:

```javascript
const { withdrawAllAssets, getContractBalances } = require('./withdraw-ico-assets.js');

// Get balances
const balances = await getContractBalances(ico, deployment);

// Withdraw all assets
await withdrawAllAssets(ico, signer, deployment);
```

## Troubleshooting

### Common Issues

1. **"No admin role"**: Ensure the signer has admin role on the ICO contract
2. **"Deployment file not found"**: Verify the deployment file exists in the deployments directory
3. **"No assets to withdraw"**: Contract has zero balance for all assets
4. **Transaction failures**: Check gas limits and network connectivity

### Debug Mode

For detailed debugging, check the transaction receipts and error messages provided in the output.

## Security Considerations

- Always verify the contract address before executing withdrawals
- Use emergency withdrawals only when necessary
- Monitor gas prices for large withdrawals
- Consider network congestion when timing withdrawals
- Keep private keys secure and never commit them to version control
