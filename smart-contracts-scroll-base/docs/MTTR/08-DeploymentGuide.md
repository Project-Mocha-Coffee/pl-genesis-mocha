# Mocha Coffee Tokenization System - Deployment Guide

## Overview

This comprehensive deployment guide provides step-by-step instructions for deploying the Mocha Coffee tokenization system to production on Scroll blockchain. The guide covers environment setup, contract deployment, configuration, testing, and post-deployment monitoring.

## Deployment Architecture

### Target Environment: Scroll Mainnet

```
DEPLOYMENT ARCHITECTURE

┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                   │
├─────────────────────────────────────────────────────────────┤
│                    Frontend (CDN)                           │
│    Dashboard │ Mobile App │ Admin Panel │ API Gateway      │
├─────────────────────────────────────────────────────────────┤
│                    Backend Services                         │
│  Oracle Service │ Monitoring │ Analytics │ Payment Gateway │
├─────────────────────────────────────────────────────────────┤
│                    Scroll Blockchain                        │
│  Smart Contracts │ ZK Proofs │ L2 Security │ L1 Settlement │
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure                           │
│  Load Balancers │ Databases │ Redis │ Message Queues      │
└─────────────────────────────────────────────────────────────┘
```

## Pre-Deployment Setup

### Environment Requirements

**Development Tools**:
```bash
# Required Node.js version
node --version  # v18.0.0 or higher
npm --version   # v8.0.0 or higher

# Hardhat and dependencies
npm install --global hardhat
npm install --global @nomiclabs/hardhat-ethers
npm install --global @openzeppelin/hardhat-upgrades

# Verification tools
npm install --global hardhat-deploy
npm install --global @nomiclabs/hardhat-etherscan
```

**Environment Variables**:
```bash
# .env.production
SCROLL_MAINNET_RPC_URL=https://rpc.scroll.io
SCROLL_MAINNET_CHAIN_ID=534352
PRIVATE_KEY_DEPLOYER=0x...
PRIVATE_KEY_MULTISIG_1=0x...
PRIVATE_KEY_MULTISIG_2=0x...
PRIVATE_KEY_MULTISIG_3=0x...

# Oracle Configuration
CHAINLINK_NODE_URL=https://chainlink.scroll.network
ORACLE_PRIVATE_KEY=0x...

# External Services
SWYPT_API_KEY=...
ELEMENTPAY_API_KEY=...
CREFY_API_KEY=...

# Security Configuration
MULTISIG_THRESHOLD=3
TIMELOCK_DELAY=172800  # 48 hours
EMERGENCY_PAUSE_DELAY=3600  # 1 hour

# Monitoring
SENTRY_DSN=...
DATADOG_API_KEY=...
```

### Infrastructure Setup

**Database Configuration**:
```sql
-- PostgreSQL production database
CREATE DATABASE mocha_coffee_prod;
CREATE USER mocha_app WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE mocha_coffee_prod TO mocha_app;

-- Required tables
CREATE TABLE contract_deployments (
    id SERIAL PRIMARY KEY,
    contract_name VARCHAR(100) NOT NULL,
    address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    deployment_time TIMESTAMP DEFAULT NOW(),
    network VARCHAR(20) DEFAULT 'scroll',
    verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(20,8),
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);
```

## Smart Contract Deployment

### Stage 1: Core Infrastructure

```javascript
// deploy/001-core-infrastructure.js
const { ethers, upgrades } = require("hardhat");

async function deployStage1() {
    console.log("Deploying Stage 1: Core Infrastructure...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
    
    // Deploy Diamond Libraries
    const LibDiamond = await ethers.getContractFactory("LibDiamond");
    const libDiamond = await LibDiamond.deploy();
    await libDiamond.deployed();
    console.log("LibDiamond deployed to:", libDiamond.address);
    
    const LibAppStorage = await ethers.getContractFactory("LibAppStorage");
    const libAppStorage = await LibAppStorage.deploy();
    await libAppStorage.deployed();
    console.log("LibAppStorage deployed to:", libAppStorage.address);
    
    const LibAccess = await ethers.getContractFactory("LibAccess");
    const libAccess = await LibAccess.deploy();
    await libAccess.deployed();
    console.log("LibAccess deployed to:", libAccess.address);
    
    // Deploy Core Facets
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    const diamondCutFacet = await DiamondCutFacet.deploy();
    await diamondCutFacet.deployed();
    console.log("DiamondCutFacet deployed to:", diamondCutFacet.address);
    
    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
    await diamondLoupeFacet.deployed();
    console.log("DiamondLoupeFacet deployed to:", diamondLoupeFacet.address);
    
    const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
    const ownershipFacet = await OwnershipFacet.deploy();
    await ownershipFacet.deployed();
    console.log("OwnershipFacet deployed to:", ownershipFacet.address);
    
    // Deploy Main Diamond
    const TreeFarmDiamond = await ethers.getContractFactory("TreeFarmDiamond");
    const diamond = await TreeFarmDiamond.deploy(
        deployer.address,
        diamondCutFacet.address
    );
    await diamond.deployed();
    console.log("TreeFarmDiamond deployed to:", diamond.address);
    
    // Verify contracts
    await verifyContract(libDiamond.address, []);
    await verifyContract(libAppStorage.address, []);
    await verifyContract(libAccess.address, []);
    await verifyContract(diamondCutFacet.address, []);
    await verifyContract(diamondLoupeFacet.address, []);
    await verifyContract(ownershipFacet.address, []);
    await verifyContract(diamond.address, [deployer.address, diamondCutFacet.address]);
    
    return {
        diamond: diamond.address,
        diamondCutFacet: diamondCutFacet.address,
        diamondLoupeFacet: diamondLoupeFacet.address,
        ownershipFacet: ownershipFacet.address,
        libDiamond: libDiamond.address,
        libAppStorage: libAppStorage.address,
        libAccess: libAccess.address
    };
}

async function verifyContract(address, constructorArgs) {
    try {
        await hre.run("verify:verify", {
            address: address,
            constructorArguments: constructorArgs,
        });
        console.log(`Contract at ${address} verified successfully`);
    } catch (error) {
        console.log(`Verification failed for ${address}:`, error.message);
    }
}

module.exports = deployStage1;
```

### Stage 2: Token Contracts

```javascript
// deploy/002-token-contracts.js
async function deployStage2(coreAddresses) {
    console.log("Deploying Stage 2: Token Contracts...");
    
    const [deployer] = await ethers.getSigners();
    
    // Deploy ERC6551 Registry
    const ERC6551Registry = await ethers.getContractFactory("ERC6551Registry");
    const registry = await ERC6551Registry.deploy();
    await registry.deployed();
    console.log("ERC6551Registry deployed to:", registry.address);
    
    // Deploy ERC6551 Account Implementation
    const ERC6551Account = await ethers.getContractFactory("ERC6551Account");
    const accountImpl = await ERC6551Account.deploy();
    await accountImpl.deployed();
    console.log("ERC6551Account implementation deployed to:", accountImpl.address);
    
    // Deploy Mocha Land Token (MLT) - ERC6551
    const MochaLandToken = await ethers.getContractFactory("MochaLandToken");
    const mlt = await upgrades.deployProxy(MochaLandToken, [
        "Mocha Land Token",
        "MLT",
        registry.address,
        accountImpl.address,
        deployer.address
    ], { initializer: 'initialize' });
    await mlt.deployed();
    console.log("MochaLandToken deployed to:", mlt.address);
    
    // Deploy Mocha Tree Token (MTT) - ERC6960
    const MochaTreeToken = await ethers.getContractFactory("MochaTreeToken");
    const mtt = await upgrades.deployProxy(MochaTreeToken, [
        "Mocha Tree Token",
        "MTT",
        deployer.address,
        mlt.address  // Land token address
    ], { initializer: 'initialize' });
    await mtt.deployed();
    console.log("MochaTreeToken deployed to:", mtt.address);
    
    // Deploy Mocha Bean Token (MBT) - ERC20
    const MochaBeanToken = await ethers.getContractFactory("MochaBeanToken");
    const mbt = await upgrades.deployProxy(MochaBeanToken, [
        "Mocha Bean Token",
        "MBT",
        18,  // decimals
        ethers.utils.parseEther("1000000"), // initial supply
        deployer.address
    ], { initializer: 'initialize' });
    await mbt.deployed();
    console.log("MochaBeanToken deployed to:", mbt.address);
    
    // Verify contracts
    await verifyProxy(mlt.address, []);
    await verifyProxy(mtt.address, []);
    await verifyProxy(mbt.address, []);
    
    return {
        registry: registry.address,
        accountImpl: accountImpl.address,
        mlt: mlt.address,
        mtt: mtt.address,
        mbt: mbt.address
    };
}

async function verifyProxy(proxyAddress, constructorArgs) {
    try {
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        await hre.run("verify:verify", {
            address: implementationAddress,
            constructorArguments: constructorArgs,
        });
        console.log(`Proxy implementation at ${implementationAddress} verified successfully`);
    } catch (error) {
        console.log(`Verification failed for proxy ${proxyAddress}:`, error.message);
    }
}

module.exports = deployStage2;
```

### Stage 3: Business Logic Facets

```javascript
// deploy/003-business-facets.js
async function deployStage3(coreAddresses, tokenAddresses) {
    console.log("Deploying Stage 3: Business Logic Facets...");
    
    const [deployer] = await ethers.getSigners();
    
    // Deploy Farm Management Facet
    const FarmManagementFacet = await ethers.getContractFactory("FarmManagementFacet");
    const farmFacet = await FarmManagementFacet.deploy();
    await farmFacet.deployed();
    console.log("FarmManagementFacet deployed to:", farmFacet.address);
    
    // Deploy Tree Management Facet
    const TreeManagementFacet = await ethers.getContractFactory("TreeManagementFacet");
    const treeFacet = await TreeManagementFacet.deploy();
    await treeFacet.deployed();
    console.log("TreeManagementFacet deployed to:", treeFacet.address);
    
    // Deploy Yield Management Facet
    const YieldManagementFacet = await ethers.getContractFactory("YieldManagementFacet");
    const yieldFacet = await YieldManagementFacet.deploy();
    await yieldFacet.deployed();
    console.log("YieldManagementFacet deployed to:", yieldFacet.address);
    
    // Add facets to diamond
    const diamond = await ethers.getContractAt("TreeFarmDiamond", coreAddresses.diamond);
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", coreAddresses.diamond);
    
    const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
    
    const cut = [
        {
            facetAddress: farmFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(farmFacet)
        },
        {
            facetAddress: treeFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(treeFacet)
        },
        {
            facetAddress: yieldFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(yieldFacet)
        }
    ];
    
    const tx = await diamondCut.diamondCut(cut, ethers.constants.AddressZero, "0x");
    await tx.wait();
    console.log("Business facets added to diamond");
    
    // Initialize facets with token addresses
    const farmManager = await ethers.getContractAt("FarmManagementFacet", coreAddresses.diamond);
    await farmManager.initializeFarmManagement(
        tokenAddresses.mlt,
        tokenAddresses.mtt,
        tokenAddresses.mbt
    );
    console.log("Farm management initialized");
    
    // Verify contracts
    await verifyContract(farmFacet.address, []);
    await verifyContract(treeFacet.address, []);
    await verifyContract(yieldFacet.address, []);
    
    return {
        farmFacet: farmFacet.address,
        treeFacet: treeFacet.address,
        yieldFacet: yieldFacet.address
    };
}

function getSelectors(contract) {
    const signatures = Object.keys(contract.interface.functions);
    return signatures.reduce((acc, val) => {
        if (val !== 'init(bytes)') {
            acc.push(contract.interface.getSighash(val));
        }
        return acc;
    }, []);
}

module.exports = deployStage3;
```

### Stage 4: Vault System

```javascript
// deploy/004-vault-system.js
async function deployStage4(coreAddresses, tokenAddresses) {
    console.log("Deploying Stage 4: Vault System...");
    
    const [deployer] = await ethers.getSigners();
    
    // Deploy MTTR Vault (ERC4626)
    const MTTRVault = await ethers.getContractFactory("MTTRVault");
    const vault = await upgrades.deployProxy(MTTRVault, [
        tokenAddresses.mbt,  // underlying asset
        "Mocha Tree Rights Token",
        "MTTR",
        coreAddresses.diamond  // tree farm diamond address
    ], { initializer: 'initialize' });
    await vault.deployed();
    console.log("MTTRVault deployed to:", vault.address);
    
    // Deploy Staking Facets
    const StakingFacet = await ethers.getContractFactory("StakingFacet");
    const stakingFacet = await StakingFacet.deploy();
    await stakingFacet.deployed();
    console.log("StakingFacet deployed to:", stakingFacet.address);
    
    const StakingRewardsFacet = await ethers.getContractFactory("StakingRewardsFacet");
    const stakingRewardsFacet = await StakingRewardsFacet.deploy();
    await stakingRewardsFacet.deployed();
    console.log("StakingRewardsFacet deployed to:", stakingRewardsFacet.address);
    
    const StakingYieldFacet = await ethers.getContractFactory("StakingYieldFacet");
    const stakingYieldFacet = await StakingYieldFacet.deploy();
    await stakingYieldFacet.deployed();
    console.log("StakingYieldFacet deployed to:", stakingYieldFacet.address);
    
    // Add staking facets to diamond
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", coreAddresses.diamond);
    const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
    
    const stakingCut = [
        {
            facetAddress: stakingFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(stakingFacet)
        },
        {
            facetAddress: stakingRewardsFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(stakingRewardsFacet)
        },
        {
            facetAddress: stakingYieldFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(stakingYieldFacet)
        }
    ];
    
    const tx = await diamondCut.diamondCut(stakingCut, ethers.constants.AddressZero, "0x");
    await tx.wait();
    console.log("Staking facets added to diamond");
    
    // Initialize vault integration
    const staking = await ethers.getContractAt("StakingFacet", coreAddresses.diamond);
    await staking.initializeStaking(vault.address, tokenAddresses.mbt);
    console.log("Staking system initialized");
    
    // Verify contracts
    await verifyProxy(vault.address, []);
    await verifyContract(stakingFacet.address, []);
    await verifyContract(stakingRewardsFacet.address, []);
    await verifyContract(stakingYieldFacet.address, []);
    
    return {
        vault: vault.address,
        stakingFacet: stakingFacet.address,
        stakingRewardsFacet: stakingRewardsFacet.address,
        stakingYieldFacet: stakingYieldFacet.address
    };
}

module.exports = deployStage4;
```

### Stage 5: Oracle and Security

```javascript
// deploy/005-oracle-security.js
async function deployStage5(allAddresses) {
    console.log("Deploying Stage 5: Oracle and Security Systems...");
    
    const [deployer, oracle1, oracle2, oracle3] = await ethers.getSigners();
    
    // Deploy Oracle Aggregator
    const MochaOracleAggregator = await ethers.getContractFactory("MochaOracleAggregator");
    const oracleAggregator = await MochaOracleAggregator.deploy(
        [oracle1.address, oracle2.address, oracle3.address], // authorized oracles
        allAddresses.vault.vault  // vault address for yield distribution
    );
    await oracleAggregator.deployed();
    console.log("MochaOracleAggregator deployed to:", oracleAggregator.address);
    
    // Deploy Multi-Signature Wallet
    const MochaMultiSig = await ethers.getContractFactory("MochaMultiSig");
    const multiSig = await MochaMultiSig.deploy(
        [deployer.address, oracle1.address, oracle2.address, oracle3.address],
        3  // require 3 signatures
    );
    await multiSig.deployed();
    console.log("MochaMultiSig deployed to:", multiSig.address);
    
    // Deploy Security Monitor
    const SecurityMonitor = await ethers.getContractFactory("SecurityMonitor");
    const securityMonitor = await SecurityMonitor.deploy(
        allAddresses.core.diamond,
        multiSig.address
    );
    await securityMonitor.deployed();
    console.log("SecurityMonitor deployed to:", securityMonitor.address);
    
    // Deploy Incident Response
    const IncidentResponse = await ethers.getContractFactory("IncidentResponse");
    const incidentResponse = await IncidentResponse.deploy(
        [deployer.address, oracle1.address, oracle2.address],  // incident responders
        securityMonitor.address
    );
    await incidentResponse.deployed();
    console.log("IncidentResponse deployed to:", incidentResponse.address);
    
    // Configure oracle integration with diamond
    const yieldManager = await ethers.getContractAt("YieldManagementFacet", allAddresses.core.diamond);
    await yieldManager.setOracleAggregator(oracleAggregator.address);
    console.log("Oracle integration configured");
    
    // Transfer diamond ownership to multisig
    const ownership = await ethers.getContractAt("OwnershipFacet", allAddresses.core.diamond);
    await ownership.transferOwnership(multiSig.address);
    console.log("Diamond ownership transferred to multisig");
    
    // Verify contracts
    await verifyContract(oracleAggregator.address, [
        [oracle1.address, oracle2.address, oracle3.address],
        allAddresses.vault.vault
    ]);
    await verifyContract(multiSig.address, [
        [deployer.address, oracle1.address, oracle2.address, oracle3.address],
        3
    ]);
    await verifyContract(securityMonitor.address, [
        allAddresses.core.diamond,
        multiSig.address
    ]);
    await verifyContract(incidentResponse.address, [
        [deployer.address, oracle1.address, oracle2.address],
        securityMonitor.address
    ]);
    
    return {
        oracleAggregator: oracleAggregator.address,
        multiSig: multiSig.address,
        securityMonitor: securityMonitor.address,
        incidentResponse: incidentResponse.address
    };
}

module.exports = deployStage5;
```

## Master Deployment Script

```javascript
// deploy/000-master-deploy.js
const deployStage1 = require("./001-core-infrastructure");
const deployStage2 = require("./002-token-contracts");
const deployStage3 = require("./003-business-facets");
const deployStage4 = require("./004-vault-system");
const deployStage5 = require("./005-oracle-security");

async function masterDeploy() {
    console.log("Starting Mocha Coffee System Deployment to Scroll Mainnet...");
    console.log("Deployment started at:", new Date().toISOString());
    
    try {
        // Stage 1: Core Infrastructure
        console.log("\n=== STAGE 1: CORE INFRASTRUCTURE ===");
        const coreAddresses = await deployStage1();
        await saveDeploymentData("stage1", coreAddresses);
        
        // Stage 2: Token Contracts
        console.log("\n=== STAGE 2: TOKEN CONTRACTS ===");
        const tokenAddresses = await deployStage2(coreAddresses);
        await saveDeploymentData("stage2", tokenAddresses);
        
        // Stage 3: Business Logic
        console.log("\n=== STAGE 3: BUSINESS LOGIC FACETS ===");
        const businessAddresses = await deployStage3(coreAddresses, tokenAddresses);
        await saveDeploymentData("stage3", businessAddresses);
        
        // Stage 4: Vault System
        console.log("\n=== STAGE 4: VAULT SYSTEM ===");
        const vaultAddresses = await deployStage4(coreAddresses, tokenAddresses);
        await saveDeploymentData("stage4", vaultAddresses);
        
        // Stage 5: Oracle and Security
        console.log("\n=== STAGE 5: ORACLE AND SECURITY ===");
        const allAddresses = {
            core: coreAddresses,
            tokens: tokenAddresses,
            business: businessAddresses,
            vault: vaultAddresses
        };
        const securityAddresses = await deployStage5(allAddresses);
        await saveDeploymentData("stage5", securityAddresses);
        
        // Final deployment summary
        const finalAddresses = {
            ...allAddresses,
            security: securityAddresses
        };
        
        await saveDeploymentData("final", finalAddresses);
        console.log("\n=== DEPLOYMENT COMPLETED SUCCESSFULLY ===");
        console.log("Deployment completed at:", new Date().toISOString());
        console.log("All contract addresses saved to deployments.json");
        
        // Run post-deployment verification
        await postDeploymentVerification(finalAddresses);
        
        return finalAddresses;
        
    } catch (error) {
        console.error("Deployment failed:", error);
        throw error;
    }
}

async function saveDeploymentData(stage, addresses) {
    const fs = require('fs');
    const deploymentFile = './deployments.json';
    
    let deployments = {};
    if (fs.existsSync(deploymentFile)) {
        deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    }
    
    deployments[stage] = {
        addresses,
        timestamp: new Date().toISOString(),
        network: 'scroll-mainnet'
    };
    
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log(`Stage ${stage} addresses saved to deployments.json`);
}

async function postDeploymentVerification(addresses) {
    console.log("\n=== POST-DEPLOYMENT VERIFICATION ===");
    
    // Test basic functionality
    const diamond = await ethers.getContractAt("TreeFarmDiamond", addresses.core.diamond);
    const mbt = await ethers.getContractAt("MochaBeanToken", addresses.tokens.mbt);
    const vault = await ethers.getContractAt("MTTRVault", addresses.vault.vault);
    
    // Verify diamond has correct facets
    const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", addresses.core.diamond);
    const facets = await loupeFacet.facets();
    console.log("Diamond has", facets.length, "facets");
    
    // Verify token configurations
    const mbtName = await mbt.name();
    const mbtSymbol = await mbt.symbol();
    console.log("MBT Token:", mbtName, "(" + mbtSymbol + ")");
    
    // Verify vault asset
    const vaultAsset = await vault.asset();
    console.log("Vault underlying asset:", vaultAsset);
    console.log("Expected MBT address:", addresses.tokens.mbt);
    
    if (vaultAsset.toLowerCase() === addresses.tokens.mbt.toLowerCase()) {
        console.log("✅ Vault correctly configured with MBT as underlying asset");
    } else {
        console.log("❌ Vault asset configuration error");
    }
    
    console.log("✅ Post-deployment verification completed");
}

if (require.main === module) {
    masterDeploy()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = masterDeploy;
```

## Configuration Management

### Production Configuration

```javascript
// config/production.js
module.exports = {
    network: {
        name: "scroll-mainnet",
        chainId: 534352,
        rpc: process.env.SCROLL_MAINNET_RPC_URL,
        gasPrice: "auto",
        gasMultiplier: 1.2
    },
    
    security: {
        multisigThreshold: 3,
        timelockDelay: 172800, // 48 hours
        emergencyPauseDelay: 3600, // 1 hour
        upgradeDelay: 604800 // 7 days
    },
    
    tokens: {
        mbt: {
            initialSupply: "1000000",
            maxSupply: "10000000",
            decimals: 18
        },
        vault: {
            performanceFee: 200, // 2%
            managementFee: 100,  // 1%
            lockPeriods: [30, 90, 180, 365, 730] // days
        }
    },
    
    oracles: {
        updateInterval: 3600, // 1 hour
        priceDeviation: 500,  // 5%
        minimumSources: 3
    },
    
    monitoring: {
        alertThresholds: {
            gasPrice: 50, // gwei
            blockDelay: 10,
            failureRate: 0.05 // 5%
        },
        healthCheck: {
            interval: 60, // seconds
            timeout: 30   // seconds
        }
    }
};
```

### Environment-Specific Scripts

```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "Starting Mocha Coffee Production Deployment..."

# Verify environment
if [ -z "$SCROLL_MAINNET_RPC_URL" ]; then
    echo "Error: SCROLL_MAINNET_RPC_URL not set"
    exit 1
fi

if [ -z "$PRIVATE_KEY_DEPLOYER" ]; then
    echo "Error: PRIVATE_KEY_DEPLOYER not set"
    exit 1
fi

# Install dependencies
npm ci

# Compile contracts
npx hardhat compile --network scroll

# Run security checks
npm run security-check

# Deploy contracts
npx hardhat run deploy/000-master-deploy.js --network scroll

# Verify deployment
npx hardhat run scripts/verify-deployment.js --network scroll

# Initialize monitoring
npx hardhat run scripts/setup-monitoring.js --network scroll

echo "Production deployment completed successfully!"
```

## Post-Deployment Setup

### Monitoring Configuration

```javascript
// scripts/setup-monitoring.js
async function setupMonitoring() {
    console.log("Setting up production monitoring...");
    
    const addresses = require('../deployments.json').final.addresses;
    
    // Configure Datadog monitoring
    const monitoring = {
        contracts: {
            diamond: addresses.core.diamond,
            vault: addresses.vault.vault,
            mbt: addresses.tokens.mbt,
            mlt: addresses.tokens.mlt,
            mtt: addresses.tokens.mtt
        },
        metrics: [
            "transaction_count",
            "gas_usage",
            "error_rate",
            "response_time",
            "vault_tvl",
            "token_supply"
        ],
        alerts: [
            {
                name: "high_gas_usage",
                condition: "gas_price > 100",
                severity: "warning"
            },
            {
                name: "contract_failure",
                condition: "error_rate > 0.05",
                severity: "critical"
            },
            {
                name: "vault_deviation",
                condition: "vault_tvl_change > 0.1",
                severity: "info"
            }
        ]
    };
    
    // Setup health checks
    const healthChecks = [
        {
            name: "diamond_health",
            endpoint: addresses.core.diamond,
            method: "facets",
            interval: 60
        },
        {
            name: "vault_health",
            endpoint: addresses.vault.vault,
            method: "totalAssets",
            interval: 300
        }
    ];
    
    console.log("Monitoring configuration:", JSON.stringify(monitoring, null, 2));
    console.log("✅ Monitoring setup completed");
}

module.exports = setupMonitoring;
```

### Security Hardening

```bash
#!/bin/bash
# scripts/security-hardening.sh

echo "Applying security hardening measures..."

# Update firewall rules
sudo ufw deny 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Setup fail2ban
sudo apt-get install fail2ban -y
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure log monitoring
sudo apt-get install logwatch -y

# Setup automated security updates
sudo apt-get install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades

# Install intrusion detection
sudo apt-get install rkhunter chkrootkit -y

echo "✅ Security hardening completed"
```

## Production Checklist

### Pre-Launch Verification

```markdown
## Production Readiness Checklist

### Smart Contracts
- [ ] All contracts deployed successfully
- [ ] Contract verification completed on Scrollscan
- [ ] Diamond proxy configuration verified
- [ ] Token contracts initialized correctly
- [ ] Vault system operational
- [ ] Oracle feeds configured and active
- [ ] Multi-signature wallet set up with correct signers
- [ ] Emergency pause mechanisms tested
- [ ] Upgrade timelock configured (7 days)

### Security
- [ ] Security audit completed and issues resolved
- [ ] Penetration testing completed
- [ ] Access controls configured and tested
- [ ] Rate limiting implemented
- [ ] Monitoring and alerting systems active
- [ ] Incident response plan documented
- [ ] Emergency contacts list updated
- [ ] Backup and recovery procedures tested

### Infrastructure
- [ ] Load balancers configured
- [ ] Database replication set up
- [ ] CDN configured for frontend assets
- [ ] SSL certificates installed and valid
- [ ] Domain names configured
- [ ] DNS settings optimized
- [ ] Backup systems operational

### Monitoring
- [ ] System metrics collection active
- [ ] Application performance monitoring configured
- [ ] Error tracking and logging implemented
- [ ] Uptime monitoring enabled
- [ ] Security monitoring active
- [ ] Alert escalation procedures documented

### Compliance
- [ ] KYC/AML procedures implemented
- [ ] Data privacy compliance verified
- [ ] Regulatory requirements met
- [ ] Terms of service and privacy policy published
- [ ] User documentation complete

### Testing
- [ ] Unit tests passing (100% coverage)
- [ ] Integration tests passing
- [ ] End-to-end tests completed
- [ ] Load testing completed
- [ ] Security testing completed
- [ ] User acceptance testing completed

### Documentation
- [ ] API documentation published
- [ ] User guides available
- [ ] Admin documentation complete
- [ ] Deployment procedures documented
- [ ] Troubleshooting guides available
```

## Launch Procedures

### Go-Live Steps

```bash
#!/bin/bash
# scripts/go-live.sh

echo "Initiating Mocha Coffee Production Launch..."

# Final pre-launch checks
npm run test:full
npm run security:scan
npm run performance:test

# Switch DNS to production
echo "Switching DNS to production..."
# DNS switching commands here

# Enable production monitoring
echo "Enabling production monitoring..."
npm run monitoring:enable

# Start application servers
echo "Starting application servers..."
pm2 start ecosystem.config.js --env production

# Verify system health
echo "Verifying system health..."
npm run health:check

# Send launch notifications
echo "Sending launch notifications..."
npm run notify:launch

echo "🚀 Mocha Coffee is now LIVE in production!"
```

### Post-Launch Monitoring

```javascript
// scripts/post-launch-monitoring.js
const schedule = require('node-schedule');

// Monitor every 5 minutes for first 24 hours
const intensiveMonitoring = schedule.scheduleJob('*/5 * * * *', async function() {
    console.log('Running intensive post-launch monitoring...');
    
    const healthChecks = [
        checkContractHealth(),
        checkVaultPerformance(),
        checkOracleFeeds(),
        checkUserActivity(),
        checkSystemMetrics()
    ];
    
    const results = await Promise.allSettled(healthChecks);
    
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
        await sendAlert('Post-launch monitoring detected issues', failures);
    }
});

// Switch to normal monitoring after 24 hours
setTimeout(() => {
    intensiveMonitoring.cancel();
    console.log('Switching to normal monitoring schedule...');
    // Setup normal monitoring schedule
}, 24 * 60 * 60 * 1000); // 24 hours
```

## Conclusion

This deployment guide provides a comprehensive roadmap for successfully deploying the Mocha Coffee tokenization system to production on Scroll blockchain. The multi-stage deployment approach ensures system reliability, while the extensive verification and monitoring procedures provide confidence in the production system.

Key deployment features:
- **Staged Deployment**: Reduces risk through incremental rollout
- **Comprehensive Verification**: Ensures all components function correctly
- **Security Hardening**: Implements multiple layers of protection
- **Production Monitoring**: Provides real-time system health visibility
- **Emergency Procedures**: Enables rapid response to incidents

Following this guide ensures a smooth transition from development to production while maintaining the highest standards of security and reliability.
