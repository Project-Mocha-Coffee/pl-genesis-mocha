# Add Farms to Base Networks

This script adds farms to the Base Sepolia testnet or Base Mainnet.

## Prerequisites

1. Contracts must be deployed on the target network
2. `.env` file must contain `PRIVATE_KEY` for the deployer wallet
3. Deployer wallet must have sufficient ETH for gas

## Usage

### Base Sepolia Testnet
```bash
npm run add:farms:base:sepolia
```

### Base Mainnet
```bash
npm run add:farms:base
```

## What It Does

1. Loads the most recent deployment file for the network
2. Connects to the deployed Diamond contract
3. Creates a test farm with the following configuration:
   - **Farm ID**: 1
   - **Name**: "Base Sepolia Test Farm" (or "Base Mainnet Test Farm")
   - **Tree Count**: 10
   - **Target APY**: 10% (1000 basis points)
   - **Maturity Period**: 48 months
   - **Min Investment**: 0.04 MBT ($1)
   - **Max Investment**: 80 MBT
   - **Farm Cap**: 1000 MBT

## Configuration

To modify farm settings, edit the `FARM_CONFIGS` array in `scripts/base/add-farms-base.js`:

```javascript
const FARM_CONFIGS = [
  {
    id: 1,
    name: "Your Farm Name",
    targetAPY: 1000, // 10% in basis points
    maturityPeriod: 48, // months
    treeCount: 10,
    minInvestment: ethers.parseEther("0.04"), // MBT
    maxInvestment: ethers.parseEther("80"), // MBT
    farmCap: ethers.parseEther("1000"), // MBT
    bondValue: ethers.parseEther("100"), // USD
    collateralRatio: 15000, // 150% in basis points
  }
];
```

## Notes

- The script automatically detects if a farm already exists and skips it
- The deployer address is used as the farm owner
- All farms are created as active by default
- The script will output a summary of all active farms after completion
