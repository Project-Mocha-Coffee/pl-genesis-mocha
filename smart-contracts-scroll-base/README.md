# TreeFarm – Coffee Investment Platform (Scroll + Base)

**This folder is the EVM codebase for both Scroll and Base.** Same Solidity contracts and Hardhat project; you choose the chain via the Hardhat network. For **Starknet**, use the sibling folder [`smart-contracts-erc4626-starknet`](../smart-contracts-erc4626-starknet) (Cairo).

---

## Which chain? (Scroll vs Base)

| Chain | Network names | Key docs in this folder | Deploy / scripts |
|-------|----------------|-------------------------|-------------------|
| **Scroll** | Scroll Mainnet, Scroll Sepolia | [docs/](docs/) (e.g. Deployment Guide, Token Architecture) | `npm run deploy:scroll`, `npm run deploy:scroll:sepolia` |
| **Base** | Base Mainnet, Base Sepolia | [BASE_DEPLOYMENT_INSTRUCTIONS.md](BASE_DEPLOYMENT_INSTRUCTIONS.md), [BASE_MAINNET_DEPLOYMENT_COMPLETE.md](BASE_MAINNET_DEPLOYMENT_COMPLETE.md), [docs/base/](docs/base/), [scripts/base/](scripts/base/) | `npm run deploy:base`, `npm run deploy:base:sepolia` |

- **Scroll:** Original deployment; full Diamond + tokens (MLT, MTT, MBT, MTTR).
- **Base:** Same contracts; Base-specific deployment outputs in `deployments/base/` and scripts in `scripts/base/`.
- **Starknet:** Separate repo folder and stack; see repo root [README](../README.md) for the chain index.

---

A comprehensive DeFi platform for coffee farm investments, built on Scroll zkEVM (and deployed on Base) using the Diamond Pattern (EIP-2535).

## 🌟 Features

- **Diamond Pattern Architecture**: Modular, upgradeable smart contract system
- **Multi-Token Ecosystem**: MLT (land), MTT (trees), MBT (beans), MTTR (vault)
- **ERC-6551 Integration**: Token-bound accounts for farm management
- **Multi-Tranche Vault**: Sophisticated yield farming with bond mechanisms
- **Scroll zkEVM**: Low gas fees with full EVM compatibility
- **Token Address Management**: Flexible token address updates post-deployment

## 🏗️ Architecture

### Core Components

1. **TreeFarmDiamond**: Main contract using Diamond Pattern
2. **Token Contracts**:
   - `MochaLandToken` (MLT): ERC721 for coffee farm parcels
   - `MochaTreeToken` (MTT): DLT for individual coffee trees
   - `MochaBeanToken` (MBT): ERC20 for liquidity and rewards
   - `MochaTreeRightsToken` (MTTR): ERC4626 vault for multi-tranche bonds

3. **Diamond Facets**:
   - `FarmManagementFacet`: Farm operations and management
   - `TreeManagementFacet`: Tree planting and growth tracking
   - `YieldManagementFacet`: Yield calculation and distribution
   - `BondManagementFacet`: Bond creation and management
   - `MultiTrancheVaultFacet`: Vault operations and tranche management
   - `InitializationFacet`: System initialization and token address management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Hardhat
- Scroll Sepolia testnet access

### Installation

```bash
npm install
```

### Deployment

```bash
# Deploy to Scroll Sepolia
npx hardhat run scripts/deployDiamond.js --network scrollSepolia

# Deploy to Scroll Mainnet
npx hardhat run scripts/deployDiamond.js --network scroll
```

### Token Address Management

The system includes flexible token address management for post-deployment updates:

```bash
# View current token addresses
npx hardhat run scripts/update-diamond-token-addresses.js --network scrollSepolia --show-current

# Update specific token addresses
npx hardhat run scripts/update-diamond-token-addresses.js --network scrollSepolia --mlt 0xNewMLTAddress

# Update multiple tokens
npx hardhat run scripts/update-diamond-token-addresses.js --network scrollSepolia --mtt 0xNewMTT --mlt 0xNewMLT --mbt 0xNewMBT
```

### Testing

```bash
# Test MLT minting with new deployment
npx hardhat run scripts/test-updated-mlt-mint.js --network scrollSepolia --deploy-new

# Test MLT minting with existing deployment
npx hardhat run scripts/test-updated-mlt-mint.js --network scrollSepolia --use-existing

# Run comprehensive tests
npx hardhat test
```

### Demonstration

```bash
# Run token address update demonstration
npx hardhat run scripts/demo-token-updates.js --network scrollSepolia
```

## 📚 Documentation

- [System Overview](docs/01-SystemOverview.md)
- [Token Architecture](docs/02-TokenArchitecture.md)
- [Vault System](docs/03-VaultSystem.md)
- [Smart Contract Architecture](docs/06-SmartContractArchitecture.md)
- [Token Address Management](docs/TokenAddressManagement.md)
- [Deployment Guide](docs/08-DeploymentGuide.md)

## 🔧 Management Scripts

### Token Address Updates

- **`scripts/update-diamond-token-addresses.js`**: Comprehensive token address management
- **`scripts/test-updated-mlt-mint.js`**: MLT deployment and testing with address synchronization
- **`scripts/demo-token-updates.js`**: Demonstration of token address update functionality

### Core Scripts

- **`scripts/deployDiamond.js`**: Complete system deployment
- **`scripts/initialize-diamond.js`**: Diamond initialization
- **`scripts/set-tree-manager.js`**: Tree manager configuration

## 🏛️ Smart Contract Structure

```
contracts/
├── diamondPattern/
│   ├── facets/           # Diamond facets (business logic)
│   ├── interfaces/       # Facet interfaces
│   ├── libraries/        # Shared libraries
│   ├── storage/          # Storage layouts
│   └── TreeFarmDiamond.sol
├── tokens/               # Token contracts
├── ERC6551/             # Token-bound accounts
├── ERC6960/             # DLT implementation
└── interfaces/          # System interfaces
```

## 🔐 Security Features

- **Access Control**: Role-based permissions throughout the system
- **Diamond Pattern**: Modular, upgradeable architecture
- **Reentrancy Protection**: NonReentrant modifiers on critical functions
- **Input Validation**: Comprehensive parameter validation
- **Event Logging**: Transparent operation tracking

## 🌐 Networks

### Scroll Sepolia (Testnet)
- **Chain ID**: 534351
- **Explorer**: https://sepolia.scrollscan.com
- **RPC**: https://sepolia-rpc.scroll.io

### Scroll Mainnet
- **Chain ID**: 534352
- **Explorer**: https://scrollscan.com
- **RPC**: https://rpc.scroll.io

## 💡 Key Benefits

1. **Gas Efficiency**: ~70-90% gas savings on Scroll vs Ethereum
2. **Upgradeability**: Diamond Pattern allows seamless upgrades
3. **Modularity**: Facets can be added/removed independently
4. **Flexibility**: Token addresses can be updated post-deployment
5. **Transparency**: All operations logged with events
6. **Security**: zkEVM provides cryptographic security guarantees

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For questions and support:
- Check the [documentation](docs/)
- Review the [deployment guide](docs/08-DeploymentGuide.md)
- Examine the [token address management guide](docs/TokenAddressManagement.md)

---

**Built with ❤️ for the coffee farming community**
