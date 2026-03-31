const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const DEPLOYMENT_FILE = "deployments/deployment-scrollSepolia-chain-534351-2025-08-11T14-58-45-568Z.json";

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

function formatTimestamp(timestamp) {
    return new Date(timestamp * 1000).toISOString();
}

function formatMBT(weiAmount) {
    return `${ethers.formatEther(weiAmount)} MBT`;
}

function formatBasisPoints(bps) {
    return `${(bps / 100).toFixed(2)}%`;
}

async function getVaultOverview(mttrVault) {
    console.log("\n📊 VAULT OVERVIEW");
    console.log("=================");
    
    try {
        const totalFarms = await mttrVault.totalFarms();
        const totalShareTokens = await mttrVault.totalShareTokens();
        const totalValueLocked = await mttrVault.totalValueLocked();
        const totalActiveBonds = await mttrVault.totalActiveBonds();
        
        console.log(`🏭 Total Farms: ${totalFarms}`);
        console.log(`🪙 Total Share Tokens: ${totalShareTokens}`);
        console.log(`💰 Total Value Locked: ${formatMBT(totalValueLocked)}`);
        console.log(`📈 Total Active Bonds: ${totalActiveBonds}`);
        
        return { totalFarms, totalShareTokens, totalValueLocked, totalActiveBonds };
    } catch (error) {
        console.error(`❌ Error getting vault overview: ${error.message}`);
        return null;
    }
}

async function getVaultConfiguration(mttrVault) {
    console.log("\n⚙️ VAULT CONFIGURATION");
    console.log("=====================");
    
    try {
        const minimumMaturityPeriod = await mttrVault.minimumMaturityPeriod();
        const maximumMaturityPeriod = await mttrVault.maximumMaturityPeriod();
        const defaultCollateralRatio = await mttrVault.defaultCollateralRatio();
        const treeValuationMBT = await mttrVault.getTREE_VALUATION_MBT();
        
        console.log(`📅 Min Maturity: ${minimumMaturityPeriod} months`);
        console.log(`📅 Max Maturity: ${maximumMaturityPeriod} months`);
        console.log(`🛡️ Default Collateral Ratio: ${formatBasisPoints(defaultCollateralRatio)}`);
        console.log(`🌳 Tree Valuation: ${treeValuationMBT} MBT`);
        
        return { minimumMaturityPeriod, maximumMaturityPeriod, defaultCollateralRatio, treeValuationMBT };
    } catch (error) {
        console.error(`❌ Error getting vault configuration: ${error.message}`);
        return null;
    }
}

async function getTokenAddresses(mttrVault) {
    console.log("\n🪙 TOKEN ADDRESSES");
    console.log("==================");
    
    try {
        const mochaLandToken = await mttrVault.mochaLandToken();
        const mochaTreeToken = await mttrVault.mochaTreeToken();
        
        console.log(`🏞️ MochaLandToken (MLT): ${mochaLandToken}`);
        console.log(`🌳 MochaTreeToken (MTT): ${mochaLandToken}`);
        
        return { mochaLandToken, mochaTreeToken };
    } catch (error) {
        console.error(`❌ Error getting token addresses: ${error.message}`);
        return null;
    }
}

async function getActiveFarmIds(mttrVault) {
    console.log("\n🏭 ACTIVE FARMS");
    console.log("===============");
    
    try {
        const activeFarmIds = await mttrVault.getActiveFarmIds();
        console.log(`📋 Total Active Farms: ${activeFarmIds.length}`);
        
        if (activeFarmIds.length > 0) {
            console.log("Active Farm IDs:");
            activeFarmIds.forEach((farmId, index) => {
                console.log(`   ${index + 1}. Farm ID: ${farmId}`);
            });
        } else {
            console.log("   No active farms found");
        }
        
        return activeFarmIds;
    } catch (error) {
        console.error(`❌ Error getting active farm IDs: ${error.message}`);
        return [];
    }
}

async function getFarmDetails(mttrVault, farmId) {
    try {
        const farmConfig = await mttrVault.getFarmConfig(farmId);
        const collateralInfo = await mttrVault.getCollateralInfo(farmId);
        const yieldDistribution = await mttrVault.getYieldDistribution(farmId);
        
        console.log(`\n🏭 FARM ${farmId} DETAILS`);
        console.log("=".repeat(30));
        
        console.log("📋 Configuration:");
        console.log(`   Name: ${farmConfig.name}`);
        console.log(`   Owner: ${farmConfig.farmOwner}`);
        console.log(`   Tree Count: ${farmConfig.treeCount}`);
        console.log(`   Target APY: ${formatBasisPoints(farmConfig.targetAPY)}`);
        console.log(`   Maturity Period: ${farmConfig.maturityPeriod} months`);
        console.log(`   Bond Value: ${formatMBT(farmConfig.bondValue)}`);
        console.log(`   Min Investment: ${formatMBT(farmConfig.minInvestment)}`);
        console.log(`   Max Investment: ${formatMBT(farmConfig.maxInvestment)}`);
        console.log(`   Active: ${farmConfig.active ? "✅ Yes" : "❌ No"}`);
        console.log(`   Created: ${formatTimestamp(farmConfig.createdTimestamp)}`);
        console.log(`   Maturity: ${formatTimestamp(farmConfig.maturityTimestamp)}`);
        
        console.log("\n🛡️ Collateral:");
        console.log(`   Total Trees: ${collateralInfo.totalTrees}`);
        console.log(`   Valuation Per Tree: ${formatMBT(collateralInfo.valuationPerTree)}`);
        console.log(`   Total Value: ${formatMBT(collateralInfo.totalValue)}`);
        console.log(`   Coverage Ratio: ${formatBasisPoints(collateralInfo.coverageRatio)}`);
        console.log(`   Last Updated: ${formatTimestamp(collateralInfo.lastUpdated)}`);
        
        console.log("\n💰 Yield Distribution:");
        console.log(`   Total Yield: ${formatMBT(yieldDistribution.totalYield)}`);
        console.log(`   Distributed Yield: ${formatMBT(yieldDistribution.distributedYield)}`);
        console.log(`   Pending Yield: ${formatMBT(yieldDistribution.pendingYield)}`);
        console.log(`   Last Distribution: ${formatTimestamp(yieldDistribution.lastDistribution)}`);
        
        return { farmConfig, collateralInfo, yieldDistribution };
    } catch (error) {
        console.error(`❌ Error getting farm ${farmId} details: ${error.message}`);
        return null;
    }
}

async function getUserBondInfo(mttrVault, userAddress) {
    try {
        const userBondCount = await mttrVault.getUserBondCount(userAddress);
        
        console.log(`\n👤 USER BOND INFORMATION: ${userAddress}`);
        console.log("=".repeat(50));
        console.log(`   Total Bonds: ${userBondCount}`);
        
        if (userBondCount > 0) {
            console.log("\n   Bond Details:");
            for (let i = 0; i < Math.min(userBondCount, 3); i++) {
                try {
                    const bondPosition = await mttrVault.getBondPosition(userAddress, i);
                    console.log(`   Bond ${i}:`);
                    console.log(`     Farm ID: ${bondPosition.farmId}`);
                    console.log(`     Deposit Amount: ${formatMBT(bondPosition.depositAmount)}`);
                    console.log(`     Share Token Amount: ${formatMBT(bondPosition.shareTokenAmount)}`);
                    console.log(`     Deposit Date: ${formatTimestamp(bondPosition.depositTimestamp)}`);
                    console.log(`     Maturity Date: ${formatTimestamp(bondPosition.maturityTimestamp)}`);
                    console.log(`     Redeemed: ${bondPosition.redeemed ? "✅ Yes" : "❌ No"}`);
                } catch (error) {
                    console.log(`     Error getting bond ${i}: ${error.message}`);
                }
            }
            
            if (userBondCount > 3) {
                console.log(`   ... and ${userBondCount - 3} more bonds`);
            }
        }
        
        return userBondCount;
    } catch (error) {
        console.error(`❌ Error getting user bond info: ${error.message}`);
        return 0;
    }
}

async function main() {
    console.log("🌱 Mocha Coffee Vault Statistics Script");
    console.log("=======================================");
    
    const deploymentData = loadDeploymentData();
    const network = hre.network.name;
    console.log(`\n📡 Network: ${network}`);
    
    console.log("\n🔗 Connecting to MTTR Vault...");
    const mttrVault = await ethers.getContractAt(
        "MochaTreeRightsToken",
        deploymentData.tokens.MochaTreeRightsToken
    );
    console.log(`   MTTR Vault: ${deploymentData.tokens.MochaTreeRightsToken}`);
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 COMPREHENSIVE VAULT STATISTICS");
    console.log("=".repeat(60));
    
    const overview = await getVaultOverview(mttrVault);
    const config = await getVaultConfiguration(mttrVault);
    const tokens = await getTokenAddresses(mttrVault);
    const activeFarmIds = await getActiveFarmIds(mttrVault);
    
    if (activeFarmIds.length > 0) {
        console.log("\n" + "=".repeat(60));
        console.log("🏭 DETAILED FARM INFORMATION");
        console.log("=".repeat(60));
        
        const farmsToShow = Math.min(activeFarmIds.length, 2);
        for (let i = 0; i < farmsToShow; i++) {
            const farmId = activeFarmIds[i];
            await getFarmDetails(mttrVault, farmId);
        }
        
        if (activeFarmIds.length > 2) {
            console.log(`\n📋 ... and ${activeFarmIds.length - 2} more farms`);
        }
    }
    
    const [deployer] = await ethers.getSigners();
    console.log("\n" + "=".repeat(60));
    console.log("👤 DEPLOYER BOND INFORMATION");
    console.log("=".repeat(60));
    await getUserBondInfo(mttrVault, deployer.address);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ VAULT STATISTICS COMPLETE");
    console.log("=".repeat(60));
    console.log(`📊 Total Farms: ${overview?.totalFarms || 0}`);
    console.log(`🏭 Active Farms: ${activeFarmIds.length}`);
    console.log(`💰 Total Value Locked: ${overview ? formatMBT(overview.totalValueLocked) : "0 MBT"}`);
    console.log(`📈 Total Active Bonds: ${overview?.totalActiveBonds || 0}`);
    
    console.log("\n🎉 Vault statistics retrieved successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
