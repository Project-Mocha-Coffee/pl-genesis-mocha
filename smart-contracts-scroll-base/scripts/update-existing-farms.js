const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Configuration files - Updated to use the newer vault deployment
const DEPLOYMENT_FILE = "deployments/deployment-vault-scrollSepolia-2025-09-24T13-42-58-337Z.json";
const ACCOUNTS_FILE = "accounts/accounts-scrollSepolia-534351-2025-08-01T16-14-51-798Z.txt";

// Farm update configurations
const FARM_UPDATES = [
    {
        farmId: 1,
        updates: {
            targetAPY: null, // Keep current APY
            maturityPeriod: null, // Keep current maturity period
            minInvestment: ethers.parseEther("0.04"), // 0.04 MBT minimum
            maxInvestment: ethers.parseEther("80"), // 80 MBT maximum
            treePrice: ethers.parseEther("4"), // 4 MBT per tree
            farmManager: null, // Keep current manager
            farmOperator: null, // Keep current operator
            farmWalletAddress: null, // Keep current wallet
            farmName: null, 
            location: null,
            area: null,
            soilType: null,
            certifications: null,
        }
    },
    {
        farmId: 2,
        updates: {
            targetAPY: null,
            maturityPeriod: null,
            minInvestment: ethers.parseEther("0.04"),
            maxInvestment: ethers.parseEther("80"),
            treePrice: ethers.parseEther("4"),
            farmManager: null,
            farmOperator: null,
            farmWalletAddress: null,
            farmName: null,
            location: null,
            area: null,
            soilType: null,
            certifications: null,
        }
    },
    {
        farmId: 3,
        updates: {
            targetAPY: null,
            maturityPeriod: null,
            minInvestment: ethers.parseEther("0.04"),
            maxInvestment: ethers.parseEther("80"),
            treePrice: ethers.parseEther("4"),
            farmManager: null,
            farmOperator: null,
            farmWalletAddress: null,
            farmName: null,
            location: null,
            area: null,
            soilType: null,
            certifications: null,
        }
    },
    {
        farmId: 4,
        updates: {
            targetAPY: null,
            maturityPeriod: null,
            minInvestment: ethers.parseEther("0.04"),
            maxInvestment: ethers.parseEther("80"),
            treePrice: ethers.parseEther("4"),
            farmManager: null,
            farmOperator: null,
            farmWalletAddress: null,
            farmName: null,
            location: null,
            area: null,
            soilType: null,
            certifications: null,
        }
    },
    {
        farmId: 5,
        updates: {
            targetAPY: null,
            maturityPeriod: null,
            minInvestment: ethers.parseEther("0.04"),
            maxInvestment: ethers.parseEther("80"),
            treePrice: ethers.parseEther("4"),
            farmManager: null,
            farmOperator: null,
            farmWalletAddress: null,
            farmName: null,
            location: null,
            area: null,
            soilType: null,
            certifications: null,
        }
    },
    {
        farmId: 6,
        updates: {
            targetAPY: null,
            maturityPeriod: null,
            minInvestment: ethers.parseEther("0.04"),
            maxInvestment: ethers.parseEther("80"),
            treePrice: ethers.parseEther("4"),
            farmManager: null,
            farmOperator: null,
            farmWalletAddress: null,
            farmName: null,
            location: null,
            area: null,
            soilType: null,
            certifications: null,
        }
    },
    {
        farmId: 7,
        updates: {
            targetAPY: null,
            maturityPeriod: null,
            minInvestment: ethers.parseEther("0.04"),
            maxInvestment: ethers.parseEther("80"),
            treePrice: ethers.parseEther("4"),
            farmManager: null,
            farmOperator: null,
            farmWalletAddress: null,
            farmName: null,
            location: null,
            area: null,
            soilType: null,
            certifications: null,
        }
    },
    {
        farmId: 8,
        updates: {
            targetAPY: null,
            maturityPeriod: null,
            minInvestment: ethers.parseEther("0.04"),
            maxInvestment: ethers.parseEther("80"),
            treePrice: ethers.parseEther("4"),
            farmManager: null,
            farmOperator: null,
            farmWalletAddress: null,
            farmName: null,
            location: null,
            area: null,
            soilType: null,
            certifications: null,
        }
    },
    {
        farmId: 12,
        updates: {
            targetAPY: null,
            maturityPeriod: null,
            minInvestment: ethers.parseEther("0.04"),
            maxInvestment: ethers.parseEther("80"),
            treePrice: ethers.parseEther("4"),
            farmManager: null,
            farmOperator: null,
            farmWalletAddress: null,
            farmName: null,
            location: null,
            area: null,
            soilType: null,
            certifications: null,
        }
    },
    {
        farmId: 13,
        updates: {
            targetAPY: null,
            maturityPeriod: null,
            minInvestment: ethers.parseEther("0.04"),
            maxInvestment: ethers.parseEther("80"),
            treePrice: ethers.parseEther("4"),
            farmManager: null,
            farmOperator: null,
            farmWalletAddress: null,
            farmName: null,
            location: null,
            area: null,
            soilType: null,
            certifications: null,
        }
    }
];

// Load deployment data
function loadDeploymentData() {
    try {
        const deploymentPath = path.resolve(DEPLOYMENT_FILE);
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        console.log(`✅ Loaded deployment data from: ${deploymentPath}`);
        return deploymentData;
    } catch (error) {
        console.error(`❌ Error loading deployment file: ${error.message}`);
        process.exit(1);
    }
}

// Load accounts data
function loadAccountsData() {
    try {
        const accountsPath = path.resolve(ACCOUNTS_FILE);
        const accountsData = fs.readFileSync(accountsPath, 'utf8');
        console.log(`✅ Loaded accounts data from: ${accountsPath}`);
        return accountsData;
    } catch (error) {
        console.error(`❌ Error loading accounts file: ${error.message}`);
        process.exit(1);
    }
}

// Get current farm information - Fixed BigInt conversion issues
async function getCurrentFarmInfo(mttrVault, farmId) {
    try {
        const farmConfig = await mttrVault.getFarmConfig(farmId);
        console.log(`\n📋 Current Farm ${farmId} Information:`);
        console.log(`   Name: ${farmConfig.name}`);
        console.log(`   Farm Owner: ${farmConfig.farmOwner}`);
        console.log(`   Tree Count: ${farmConfig.treeCount.toString()}`);
        console.log(`   Target APY: ${farmConfig.targetAPY.toString()} basis points (${Number(farmConfig.targetAPY)/100}%)`);
        console.log(`   Maturity Period: ${farmConfig.maturityPeriod.toString()} months`);
        console.log(`   Bond Value: ${ethers.formatEther(farmConfig.bondValue)} MBT`);
        console.log(`   Collateral Ratio: ${farmConfig.collateralRatio.toString()} basis points (${Number(farmConfig.collateralRatio)/100}%)`);
        console.log(`   Min Investment: ${ethers.formatEther(farmConfig.minInvestment)} MBT`);
        console.log(`   Max Investment: ${ethers.formatEther(farmConfig.maxInvestment)} MBT`);
        console.log(`   Share Token Address: ${farmConfig.shareTokenAddress}`);
        console.log(`   Active: ${farmConfig.active}`);
        console.log(`   Created: ${new Date(Number(farmConfig.createdTimestamp) * 1000).toISOString()}`);
        console.log(`   Maturity: ${new Date(Number(farmConfig.maturityTimestamp) * 1000).toISOString()}`);
        return farmConfig;
    } catch (error) {
        console.error(`❌ Error getting farm ${farmId} info: ${error.message}`);
        return null;
    }
}

// Update farm configuration in vault - Fixed method signature
async function updateFarmConfiguration(mttrVault, farmId, targetAPY, maturityPeriod) {
    try {
        console.log(`\n🔧 Updating farm ${farmId} configuration in vault...`);
        console.log(`   Target APY: ${targetAPY} basis points (${targetAPY/100}%)`);
        console.log(`   Maturity Period: ${maturityPeriod} months`);
        
        // Note: The MTTR vault only allows updating APY and active status
        // Maturity period cannot be changed after farm creation
        const tx = await mttrVault.updateFarm(farmId, targetAPY, true);
        const receipt = await tx.wait();
        
        console.log(`✅ Farm ${farmId} configuration updated successfully`);
        console.log(`   Transaction Hash: ${receipt.hash}`);
        console.log(`   Note: Maturity period cannot be changed after farm creation`);
        return true;
    } catch (error) {
        console.error(`❌ Error updating farm ${farmId} configuration: ${error.message}`);
        return false;
    }
}

// Update farm investment limits - Fixed method signature
async function updateFarmInvestmentLimits(mttrVault, farmId, minInvestment, maxInvestment) {
    try {
        console.log(`\n💰 Updating farm ${farmId} investment limits...`);
        console.log(`   Min Investment: ${ethers.formatEther(minInvestment)} MBT`);
        console.log(`   Max Investment: ${ethers.formatEther(maxInvestment)} MBT`);
        
        const tx = await mttrVault.updateFarmInvestmentLimits(farmId, minInvestment, maxInvestment);
        const receipt = await tx.wait();
        
        console.log(`✅ Farm ${farmId} investment limits updated successfully`);
        console.log(`   Transaction Hash: ${receipt.hash}`);
        return true;
    } catch (error) {
        console.error(`❌ Error updating farm ${farmId} investment limits: ${error.message}`);
        return false;
    }
}

// Update farm tree price (not available in MTTR vault)
async function updateFarmTreePrice(mttrVault, farmId, newPrice) {
    try {
        console.log(`\n💰 Updating farm ${farmId} tree price...`);
        console.log(`   New Price: ${ethers.formatEther(newPrice)} MBT per tree`);
        
        console.log(`⚠️ Warning: Tree price updates are not available in the MTTR vault`);
        console.log(`   Tree prices are fixed at 100 MBT per tree in the vault`);
        console.log(`   This update will be skipped`);
        
        return false;
    } catch (error) {
        console.error(`❌ Error updating farm ${farmId} tree price: ${error.message}`);
        return false;
    }
}

// Update farm manager (not available in MTTR vault)
async function updateFarmManager(mttrVault, farmId, newManager) {
    try {
        if (!newManager) {
            console.log(`\n👤 Keeping current farm manager for farm ${farmId}`);
            return true;
        }
        
        console.log(`\n👤 Updating farm ${farmId} manager...`);
        console.log(`   New Manager: ${newManager}`);
        
        console.log(`⚠️ Warning: Farm manager updates are not available in the MTTR vault`);
        console.log(`   Farm managers are determined by MLT token ownership`);
        console.log(`   This update will be skipped`);
        
        return false;
    } catch (error) {
        console.error(`❌ Error updating farm ${farmId} manager: ${error.message}`);
        return false;
    }
}

// Update farm operator (not available in MTTR vault)
async function updateFarmOperator(mttrVault, farmId, newOperator) {
    try {
        if (!newOperator) {
            console.log(`\n🔧 Keeping current farm operator for farm ${farmId}`);
            return true;
        }
        
        console.log(`\n🔧 Updating farm ${farmId} operator...`);
        console.log(`   New Operator: ${newOperator}`);
        
        console.log(`⚠️ Warning: Farm operator updates are not available in the MTTR vault`);
        console.log(`   Farm operators are managed through the Diamond pattern`);
        console.log(`   This update will be skipped`);
        
        return false;
    } catch (error) {
        console.error(`❌ Error updating farm ${farmId} operator: ${error.message}`);
        return false;
    }
}

// Update farm wallet address (not available in MTTR vault)
async function updateFarmWalletAddress(mttrVault, farmId, newWallet) {
    try {
        if (!newWallet) {
            console.log(`\n💼 Keeping current farm wallet for farm ${farmId}`);
            return true;
        }
        
        console.log(`\n💼 Updating farm ${farmId} wallet address...`);
        console.log(`   New Wallet: ${newWallet}`);
        
        console.log(`⚠️ Warning: Farm wallet address updates are not available in the MTTR vault`);
        console.log(`   Farm wallets are determined by token-bound accounts`);
        console.log(`   This update will be skipped`);
        
        return false;
    } catch (error) {
        console.error(`❌ Error updating farm ${farmId} wallet address: ${error.message}`);
        return false;
    }
}

// Update farm metadata (not available in MTTR vault)
async function updateFarmMetadata(mttrVault, farmId, updates) {
    try {
        console.log(`\n📝 Updating farm ${farmId} metadata...`);
        
        console.log(`   New Name: ${updates.farmName || 'Not specified'}`);
        console.log(`   New Location: ${updates.location || 'Not specified'}`);
        console.log(`   New Area: ${updates.area || 'Not specified'}`);
        console.log(`   New Soil Type: ${updates.soilType || 'Not specified'}`);
        console.log(`   New Certifications: ${updates.certifications || 'Not specified'}`);
        
        console.log(`⚠️ Warning: Farm metadata updates are not available in the MTTR vault`);
        console.log(`   Farm metadata is managed through the Diamond pattern`);
        console.log(`   This update will be skipped`);
        
        return false;
    } catch (error) {
        console.error(`❌ Error updating farm ${farmId} metadata: ${error.message}`);
        return false;
    }
}

// Update farm share token information (not available in MTTR vault)
async function updateFarmShareToken(mttrVault, farmId, newFarmName) {
    try {
        console.log(`\n🪙 Updating farm ${farmId} share token information...`);
        console.log(`   New Farm Name: ${newFarmName}`);
        
        console.log(`⚠️ Warning: Share token updates are not available in the MTTR vault`);
        console.log(`   Share token information is managed through the Diamond pattern`);
        console.log(`   This update will be skipped`);
        
        return false;
    } catch (error) {
        console.error(`❌ Error updating farm ${farmId} share token: ${error.message}`);
        return false;
    }
}

// Main update function
async function updateFarm(mttrVault, farmUpdate) {
    const { farmId, updates } = farmUpdate;
    
    console.log(`\n🚀 Starting update for Farm ${farmId}...`);
    
    // Get current farm information
    const currentFarm = await getCurrentFarmInfo(mttrVault, farmId);
    if (!currentFarm) {
        console.log(`⚠️ Skipping farm ${farmId} - could not get current info`);
        return false;
    }
    
    let successCount = 0;
    let totalUpdates = 0;
    
    // Update farm configuration in vault (APY only)
    if (updates.targetAPY) {
        totalUpdates++;
        const success = await updateFarmConfiguration(
            mttrVault, 
            farmId, 
            updates.targetAPY,
            updates.maturityPeriod || 36 // Not used but kept for logging
        );
        if (success) successCount++;
    }
    
    // Update farm investment limits
    if (updates.minInvestment || updates.maxInvestment) {
        totalUpdates++;
        const success = await updateFarmInvestmentLimits(
            mttrVault,
            farmId,
            updates.minInvestment || ethers.parseEther("100"), // Default to 100 MBT if not specified
            updates.maxInvestment || ethers.parseEther("50000") // Default to 50,000 MBT if not specified
        );
        if (success) successCount++;
    }
    
    // Update farm tree price (not available)
    if (updates.treePrice) {
        totalUpdates++;
        const success = await updateFarmTreePrice(mttrVault, farmId, updates.treePrice);
        if (success) successCount++;
    }
    
    // Update farm manager (not available)
    totalUpdates++;
    const managerSuccess = await updateFarmManager(mttrVault, farmId, updates.farmManager);
    if (managerSuccess) successCount++;
    
    // Update farm operator (not available)
    totalUpdates++;
    const operatorSuccess = await updateFarmOperator(mttrVault, farmId, updates.farmOperator);
    if (operatorSuccess) successCount++;
    
    // Update farm wallet address (not available)
    totalUpdates++;
    const walletSuccess = await updateFarmWalletAddress(mttrVault, farmId, updates.farmWalletAddress);
    if (walletSuccess) successCount++;
    
    // Update farm metadata (not available)
    if (updates.farmName || updates.location || updates.area || updates.soilType || updates.certifications) {
        totalUpdates++;
        const metadataSuccess = await updateFarmMetadata(mttrVault, farmId, updates);
        if (metadataSuccess) successCount++;
        
        // Update share token if farm name changed (not available)
        if (updates.farmName) {
            totalUpdates++;
            const shareTokenSuccess = await updateFarmShareToken(mttrVault, farmId, updates.farmName);
            if (shareTokenSuccess) successCount++;
        }
    }
    
    console.log(`\n📊 Farm ${farmId} Update Summary:`);
    console.log(`   Successful Updates: ${successCount}/${totalUpdates}`);
    console.log(`   Success Rate: ${((successCount/totalUpdates)*100).toFixed(1)}%`);
    
    return successCount === totalUpdates;
}

// Main execution function
async function main() {
    console.log("🌱 Mocha Coffee Farm Update Script");
    console.log("===================================");
    
    // Load configuration data
    const deploymentData = loadDeploymentData();
    const accountsData = loadAccountsData();
    
    // Get network configuration
    const network = hre.network.name;
    console.log(`\n📡 Network: ${network}`);
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log(`\n👤 Deployer: ${deployer.address}`);
    
    // Connect to contracts - Updated to use correct contract address
    console.log("\n🔗 Connecting to contracts...");
    
    const mttrVault = await ethers.getContractAt(
        "MochaTreeRightsToken",
        deploymentData.contracts.MochaTreeRightsToken.address
    );
    console.log(`   MTTR Vault: ${deploymentData.contracts.MochaTreeRightsToken.address}`);
    
    // Check if deployer has admin role
    console.log("\n🔐 Checking permissions...");
    try {
        const adminRole = await mttrVault.ADMIN_ROLE();
        const hasAdminRole = await mttrVault.hasRole(adminRole, deployer.address);
        console.log(`   Has Admin Role: ${hasAdminRole}`);
        
        if (!hasAdminRole) {
            console.log("⚠️ Warning: Deployer may not have admin role for all operations");
        }
    } catch (error) {
        console.log("⚠️ Could not verify admin role");
    }
    
    // Process farm updates
    console.log(`\n🔄 Processing ${FARM_UPDATES.length} farm updates...`);
    
    const results = {
        total: FARM_UPDATES.length,
        successful: 0,
        failed: 0
    };
    
    for (const farmUpdate of FARM_UPDATES) {
        const success = await updateFarm(mttrVault, farmUpdate);
        
        if (success) {
            results.successful++;
        } else {
            results.failed++;
        }
        
        // Add delay between updates
        if (farmUpdate !== FARM_UPDATES[FARM_UPDATES.length - 1]) {
            console.log("\n⏳ Waiting 5 seconds before next update...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    // Final summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 FARM UPDATE SUMMARY");
    console.log("=".repeat(50));
    console.log(`Total Farms: ${results.total}`);
    console.log(`Successful Updates: ${results.successful}`);
    console.log(`Failed Updates: ${results.failed}`);
    console.log(`Success Rate: ${((results.successful/results.total)*100).toFixed(1)}%`);
    
    if (results.failed > 0) {
        console.log("\n⚠️ Some farms failed to update. Check the logs above for details.");
        process.exit(1);
    } else {
        console.log("\n🎉 All farms updated successfully!");
    }
}

// Error handling
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
