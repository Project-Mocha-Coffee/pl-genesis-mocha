# Base Deployment Outputs

This directory contains deployment outputs and logs for Base Mainnet and Base Sepolia deployments.

## Directory Structure

```
deployments/base/
├── README.md (this file)
├── base-8453-*.json (Base Mainnet deployments)
└── base-84532-*.json (Base Sepolia deployments)
```

## Deployment Files

Deployment files are automatically generated with the following naming convention:
- `base-{networkName}-{chainId}-{timestamp}.json`

Example:
- `base-base-8453-2024-01-15T10-30-00-000Z.json` (Base Mainnet)
- `base-baseSepolia-84532-2024-01-15T10-30-00-000Z.json` (Base Sepolia)

## File Contents

Each deployment file contains:
- Deployer address
- Network information (name, chain ID)
- All deployed contract addresses (tokens, diamond, facets, ICO)
- Base-specific configuration (price feeds, token addresses)
- Timestamp and deployment metadata
- Explorer URLs

## Viewing Deployments

### Base Mainnet
- Explorer: https://basescan.org
- View contract: `https://basescan.org/address/{CONTRACT_ADDRESS}`

### Base Sepolia
- Explorer: https://sepolia.basescan.org
- View contract: `https://sepolia.basescan.org/address/{CONTRACT_ADDRESS}`

## Notes

- Keep deployment files secure - they contain sensitive information
- Do not commit private keys or sensitive data
- Use these files to track deployment history and contract addresses
