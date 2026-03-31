const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Configuration files
const DEPLOYMENT_FILE = "deployments/deployment-scrollSepolia-chain-534351-2025-08-11T14-58-45-568Z.txt";

async function loadDeploymentInfo() {
    // Check if deployment file exists
    if (!fs.existsSync(DEPLOYMENT_FILE)) {
        throw new Error(`Deployment file not found: ${DEPLOYMENT_FILE}`);
    }
    
    const deploymentContent = fs.readFileSync(DEPLOYMENT_FILE, "utf8");
    const deployment = {};
    
    // Parse the deployment file to extract contract addresses
    const lines = deploymentContent.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and headers
        if (!trimmedLine || trimmedLine.startsWith('=') || trimmedLine.startsWith('TreeFarm System') || 
            trimmedLine.startsWith('Deployed at:') || trimmedLine.startsWith('Network:') || 
            trimmedLine.startsWith('Deployer:') || trimmedLine.startsWith('NOTE:') || 
            trimmedLine.startsWith('TOKEN CONTRACTS:') || trimmedLine.startsWith('DIAMOND:') || 
            trimmedLine.startsWith('FACETS:') || trimmedLine.startsWith('UTILITIES:') || 
            trimmedLine.startsWith('VAULT (MTTR):') || trimmedLine.startsWith('DIAMOND TOKEN ADDRESSES:')) {
            continue;
        }
        
        // Parse contract addresses
        if (trimmedLine.includes(':')) {
            const colonIndex = trimmedLine.indexOf(':');
            const key = trimmedLine.substring(0, colonIndex).trim();
            const value = trimmedLine.substring(colonIndex + 1).trim();
            
            // Check if value looks like an Ethereum address
            if (value.startsWith('0x') && value.length === 42) {
                deployment[key] = value;
            }
        }
    }
    
    return deployment;
}

async function main() {
    console.log("🔧 Updating Farm Collateral Valuation");
    console.log("=====================================");

    // Load deployment information
    const deployment = await loadDeploymentInfo();
    const mttrAddress = deployment.MochaTreeRightsToken;
    
    console.log("Contract Addresses:");
    console.log("  MTTR (MochaTreeRightsToken):", mttrAddress);
    console.log("");

    // Get deployer signer
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    // Get contract instance
    const mttr = await ethers.getContractAt("MochaTreeRightsToken", mttrAddress);

    // Check if deployer has ORACLE_ROLE
    const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
    const hasOracleRole = await mttr.hasRole(ORACLE_ROLE, deployer.address);
    console.log(`   Deployer has ORACLE_ROLE: ${hasOracleRole}`);
    
    if (!hasOracleRole) {
        console.log("❌ Deployer does not have ORACLE_ROLE");
        console.log("   Cannot update collateral valuation");
        return;
    }

    // Get active farms
    console.log("\n📋 Getting active farms...");
    const activeFarmIds = await mttr.getActiveFarmIds();
    console.log(`   Found ${activeFarmIds.length} active farms:`, activeFarmIds.map(id => id.toString()));

    if (activeFarmIds.length === 0) {
        console.log("❌ No active farms found");
        return;
    }

    // Display current collateral valuations
    console.log("\n📊 Current Collateral Valuations:");
    for (const farmId of activeFarmIds) {
        try {
            const farmConfig = await mttr.getFarmConfig(farmId);
            const collateralInfo = await mttr.getCollateralInfo(farmId);
            
            console.log(`\n   Farm ${farmId} (${farmConfig.name}):`);
            console.log(`     Current Valuation Per Tree: ${ethers.formatEther(collateralInfo.valuationPerTree)} MBT`);
            console.log(`     Total Trees: ${collateralInfo.totalTrees.toString()}`);
            console.log(`     Total Collateral Value: ${ethers.formatEther(collateralInfo.totalValue)} MBT`);
            console.log(`     Coverage Ratio: ${collateralInfo.coverageRatio.toString()} basis points (${Number(collateralInfo.coverageRatio)/100}%)`);
            console.log(`     Liquidation Threshold: ${collateralInfo.liquidationThreshold.toString()} basis points (${Number(collateralInfo.liquidationThreshold)/100}%)`);
        } catch (error) {
            console.log(`   ❌ Error getting info for Farm ${farmId}:`, error.message);
        }
    }

    // Configuration for new valuations
    const newValuations = {
        1: ethers.parseEther("4"), // 4 MBT per tree
        2: ethers.parseEther("4"), // 4 MBT per tree
        3: ethers.parseEther("4"), // 4 MBT per tree
        4: ethers.parseEther("4"), // 4 MBT per tree
        5: ethers.parseEther("4"), // 4 MBT per tree
        6: ethers.parseEther("4"), // 4 MBT per tree
        7: ethers.parseEther("4"), // 4 MBT per tree
        8: ethers.parseEther("4"), // 4 MBT per tree
        12: ethers.parseEther("4"), // 4 MBT per tree
        13: ethers.parseEther("4"), // 4 MBT per tree
    };

    console.log("\n🔄 Updating Collateral Valuations:");
    console.log("==================================");

    for (const farmId of activeFarmIds) {
        const newValuation = newValuations[farmId];
        
        if (!newValuation) {
            console.log(`\n   ⚠️  No new valuation configured for Farm ${farmId} - skipping`);
            continue;
        }

        try {
            const farmConfig = await mttr.getFarmConfig(farmId);
            const currentCollateral = await mttr.getCollateralInfo(farmId);
            
            console.log(`\n   🚀 Updating Farm ${farmId} (${farmConfig.name}):`);
            console.log(`     Current: ${ethers.formatEther(currentCollateral.valuationPerTree)} MBT per tree`);
            console.log(`     New: ${ethers.formatEther(newValuation)} MBT per tree`);
            
            // Check if the new valuation is different
            if (currentCollateral.valuationPerTree.toString() === newValuation.toString()) {
                console.log(`     ✅ Valuation already set to target value - skipping`);
                continue;
            }

            // Update the collateral valuation
            const tx = await mttr.connect(deployer).updateCollateralValuation(farmId, newValuation);
            console.log(`     📝 Transaction submitted: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`     ✅ Transaction confirmed in block ${receipt.blockNumber}`);
            
            // Get updated collateral info
            const updatedCollateral = await mttr.getCollateralInfo(farmId);
            console.log(`     📊 Updated Total Value: ${ethers.formatEther(updatedCollateral.totalValue)} MBT`);
            console.log(`     📊 Updated Coverage Ratio: ${updatedCollateral.coverageRatio.toString()} basis points (${Number(updatedCollateral.coverageRatio)/100}%)`);
            
            // Check if liquidation was triggered
            if (!farmConfig.active) {
                console.log(`     ⚠️  Farm marked as inactive - liquidation may have been triggered`);
            }

        } catch (error) {
            console.log(`     ❌ Failed to update Farm ${farmId}:`, error.message);
            
            // Try to decode the error
            if (error.data) {
                try {
                    const decodedError = mttr.interface.parseError(error.data);
                    console.log(`     Decoded Error: ${decodedError.name}`);
                    console.log(`     Error Args: ${JSON.stringify(decodedError.args)}`);
                } catch (decodeError) {
                    console.log(`     Could not decode error: ${decodeError.message}`);
                }
            }
        }
    }

    // Final summary
    console.log("\n📋 Final Collateral Summary:");
    console.log("============================");
    
    for (const farmId of activeFarmIds) {
        try {
            const farmConfig = await mttr.getFarmConfig(farmId);
            const collateralInfo = await mttr.getCollateralInfo(farmId);
            
            console.log(`\n   Farm ${farmId} (${farmConfig.name}):`);
            console.log(`     Active: ${farmConfig.active}`);
            console.log(`     Valuation Per Tree: ${ethers.formatEther(collateralInfo.valuationPerTree)} MBT`);
            console.log(`     Total Value: ${ethers.formatEther(collateralInfo.totalValue)} MBT`);
            console.log(`     Coverage Ratio: ${collateralInfo.coverageRatio.toString()} basis points (${Number(collateralInfo.coverageRatio)/100}%)`);
            
            // Check if farm is undercollateralized
            if (collateralInfo.coverageRatio < collateralInfo.liquidationThreshold) {
                console.log(`     ⚠️  UNDERSECURED: Coverage below liquidation threshold!`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error getting final info for Farm ${farmId}:`, error.message);
        }
    }

    console.log("\n🎉 Collateral valuation update completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
