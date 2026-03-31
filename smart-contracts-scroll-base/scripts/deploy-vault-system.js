const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

// ============================================================================
// CONFIGURATION - Update these addresses for your deployment
// ============================================================================

// Token addresses for the vault system
const TOKEN_ADDRESSES = {
    // MBT Token (ERC20) - Used for deposits/withdrawals
    asset: "0xb75083585DcB841b8B04ffAC89c78a16f2a5598B", // Replace with actual MBT address
    
    // MochaLandToken (ERC721) - Represents farm ownership
    mochaLandToken: "0x5DEbebba8a4dABCb6B6e31ee848E8B87Ea357980", // Replace with actual MLT address
    
    // MochaTreeToken (ERC6960 DLT) - Represents individual trees
    mochaTreeToken: "0xd9AB9d286F73073d770d1aA9115842e29bcA6618"  // Replace with actual MTT address
};

// Vault configuration
const VAULT_CONFIG = {
    name: "Mocha Tree Rights Token",
    symbol: "MTTR"
};

async function main() {
    console.log("🌱 Deploying Mocha Coffee Vault System");
    console.log("=====================================");
    
    const network = hre.network.name;
    console.log(`\n📡 Network: ${network}`);
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`\n👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);
    
    // Extract addresses from configuration
    const { asset: assetAddress, mochaLandToken: mochaLandTokenAddress, mochaTreeToken: mochaTreeTokenAddress } = TOKEN_ADDRESSES;
    
    console.log("\n📋 Deployment Parameters:");
    console.log(`   Asset (MBT): ${assetAddress}`);
    console.log(`   MochaLandToken (MLT): ${mochaLandTokenAddress}`);
    console.log(`   MochaTreeToken (MTT): ${mochaTreeTokenAddress}`);
    
    // Validate addresses
    if (!ethers.isAddress(assetAddress)) {
        console.error("❌ Error: Invalid asset address");
        process.exit(1);
    }
    if (!ethers.isAddress(mochaLandTokenAddress)) {
        console.error("❌ Error: Invalid MochaLandToken address");
        process.exit(1);
    }
    if (!ethers.isAddress(mochaTreeTokenAddress)) {
        console.error("❌ Error: Invalid MochaTreeToken address");
        process.exit(1);
    }
    
    try {
        console.log("\n🔧 Deploying Library Contracts...");
        
        // Deploy MTTRBondLib library
        console.log("   Deploying MTTRBondLib library...");
        const MTTRBondLib = await ethers.getContractFactory("MTTRBondLib");
        const mttrBondLib = await MTTRBondLib.deploy();
        await mttrBondLib.waitForDeployment();
        const mttrBondLibAddress = await mttrBondLib.getAddress();
        console.log(`   ✅ MTTRBondLib deployed at: ${mttrBondLibAddress}`);
        
        // Deploy MTTRFarmLib library
        console.log("   Deploying MTTRFarmLib library...");
        const MTTRFarmLib = await ethers.getContractFactory("MTTRFarmLib");
        const mttrFarmLib = await MTTRFarmLib.deploy();
        await mttrFarmLib.waitForDeployment();
        const mttrFarmLibAddress = await mttrFarmLib.getAddress();
        console.log(`   ✅ MTTRFarmLib deployed at: ${mttrFarmLibAddress}`);
        
        // Deploy MTTRYieldLib library
        console.log("   Deploying MTTRYieldLib library...");
        const MTTRYieldLib = await ethers.getContractFactory("MTTRYieldLib");
        const mttrYieldLib = await MTTRYieldLib.deploy();
        await mttrYieldLib.waitForDeployment();
        const mttrYieldLibAddress = await mttrYieldLib.getAddress();
        console.log(`   ✅ MTTRYieldLib deployed at: ${mttrYieldLibAddress}`);
        
        console.log("\n🔧 Deploying MochaTreeRightsToken (MTTR) Vault...");
        
        // Deploy the vault contract with linked libraries
        const MochaTreeRightsToken = await ethers.getContractFactory("MochaTreeRightsToken", {
            libraries: {
                MTTRBondLib: mttrBondLibAddress,
                MTTRFarmLib: mttrFarmLibAddress,
                MTTRYieldLib: mttrYieldLibAddress
            }
        });
        
        const vault = await MochaTreeRightsToken.deploy(
            assetAddress,                    // _asset (MBT token)
            VAULT_CONFIG.name,               // _name
            VAULT_CONFIG.symbol,             // _symbol
            mochaLandTokenAddress,           // _mochaLandToken
            mochaTreeTokenAddress            // _mochaTreeToken
        );
        
        await vault.waitForDeployment();
        const vaultAddress = await vault.getAddress();
        
        console.log(`✅ MTTR Vault deployed successfully!`);
        console.log(`   Address: ${vaultAddress}`);
        console.log(`   Transaction: ${vault.deploymentTransaction().hash}`);
        
        // Verify the deployment by calling some view functions
        console.log("\n🔍 Verifying deployment...");
        
        const deployedAsset = await vault.asset();
        const deployedMochaLandToken = await vault.mochaLandToken();
        const deployedMochaTreeToken = await vault.mochaTreeToken();
        const totalFarms = await vault.totalFarms();
        const totalValueLocked = await vault.totalValueLocked();
        
        console.log(`   Asset: ${deployedAsset}`);
        console.log(`   MochaLandToken: ${deployedMochaLandToken}`);
        console.log(`   MochaTreeToken: ${deployedMochaTreeToken}`);
        console.log(`   Total Farms: ${totalFarms}`);
        console.log(`   Total Value Locked: ${ethers.formatEther(totalValueLocked)} MBT`);
        
        // Check if addresses match
        if (deployedAsset !== assetAddress) {
            console.error("❌ Error: Asset address mismatch");
            process.exit(1);
        }
        if (deployedMochaLandToken !== mochaLandTokenAddress) {
            console.error("❌ Error: MochaLandToken address mismatch");
            process.exit(1);
        }
        if (deployedMochaTreeToken !== mochaTreeTokenAddress) {
            console.error("❌ Error: MochaTreeToken address mismatch");
            process.exit(1);
        }
        
        console.log("✅ Address verification passed!");
        
        // Generate deployment summary
        const deploymentData = {
            network: network,
            deployer: deployer.address,
            deploymentTimestamp: new Date().toISOString(),
            contracts: {
                MTTRBondLib: {
                    address: mttrBondLibAddress,
                    transaction: mttrBondLib.deploymentTransaction().hash
                },
                MTTRFarmLib: {
                    address: mttrFarmLibAddress,
                    transaction: mttrFarmLib.deploymentTransaction().hash
                },
                MTTRYieldLib: {
                    address: mttrYieldLibAddress,
                    transaction: mttrYieldLib.deploymentTransaction().hash
                },
                MochaTreeRightsToken: {
                    address: vaultAddress,
                    transaction: vault.deploymentTransaction().hash,
                    constructorArgs: {
                        asset: assetAddress,
                        name: VAULT_CONFIG.name,
                        symbol: VAULT_CONFIG.symbol,
                        mochaLandToken: mochaLandTokenAddress,
                        mochaTreeToken: mochaTreeTokenAddress
                    },
                    libraries: {
                        MTTRBondLib: mttrBondLibAddress,
                        MTTRFarmLib: mttrFarmLibAddress,
                        MTTRYieldLib: mttrYieldLibAddress
                    }
                }
            },
            parameters: {
                asset: assetAddress,
                mochaLandToken: mochaLandTokenAddress,
                mochaTreeToken: mochaTreeTokenAddress
            },
            configuration: {
                tokenAddresses: TOKEN_ADDRESSES,
                vaultConfig: VAULT_CONFIG
            }
        };
        
        // Save deployment data
        const fs = require("fs");
        const path = require("path");
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const deploymentFileName = `deployment-vault-${network}-${timestamp}.json`;
        const deploymentPath = path.join("deployments", deploymentFileName);
        
        // Ensure deployments directory exists
        if (!fs.existsSync("deployments")) {
            fs.mkdirSync("deployments");
        }
        
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
        
        console.log("\n📄 Deployment Summary:");
        console.log("======================");
        console.log(`   Network: ${network}`);
        console.log(`   Deployer: ${deployer.address}`);
        console.log(`   MTTRBondLib Library: ${mttrBondLibAddress}`);
        console.log(`   MTTRFarmLib Library: ${mttrFarmLibAddress}`);
        console.log(`   MTTRYieldLib Library: ${mttrYieldLibAddress}`);
        console.log(`   MTTR Vault: ${vaultAddress}`);
        console.log(`   Deployment File: ${deploymentPath}`);
        
        console.log("\n🎉 Vault system deployment completed successfully!");
        console.log("\n📋 Next Steps:");
        console.log("   1. Verify the contract on block explorer");
        console.log("   2. Set up farm management permissions");
        console.log("   3. Add initial farms using add-new-farms.js");
        console.log("   4. Test vault functionality");
        
    } catch (error) {
        console.error("\n❌ Deployment failed:", error.message);
        if (error.transaction) {
            console.error("Transaction hash:", error.transaction.hash);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
