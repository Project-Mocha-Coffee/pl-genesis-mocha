# Deployments Directory

This directory contains deployment outputs from the TreeFarm Diamond system deployment script.

## Files Generated

- `deployment-{timestamp}.json` - Complete deployment information in JSON format
- `deployment-{timestamp}.txt` - Human-readable deployment summary

## Structure

Each deployment file contains:

### JSON Format
```json
{
  "deployer": "0x...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "network": "hardhat",
  "chainId": "31337",
  "tokens": {
    "MochaBeanToken": "0x...",
    "MochaTreeToken": "0x...",
    "MochaLandToken": "0x...",
    "MochaTreeRightsToken": "0x..."
  },
  "diamond": {
    "TreeFarmDiamond": "0x..."
  },
  "facets": {
    "DiamondCutFacet": "0x...",
    "DiamondLoupeFacet": "0x...",
    // ... all other facets
  },
  "utilities": {
    "YieldManager": "0x..."
  }
}
```

## Usage

After deployment, use the `interact-with-contracts.js` script to load and interact with the deployed contracts:

```bash
npx hardhat run scripts/interact-with-contracts.js --network localhost
```

The interaction script automatically loads the most recent deployment file and provides ready-to-use contract instances.