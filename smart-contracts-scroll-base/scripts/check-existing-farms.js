const { ethers } = require("hardhat");
const fs = require("fs");

// Configuration files
const DEPLOYMENT_FILE = "deployments/deployment-scroll-chain-534352-2025-09-26T09-14-05-430Z.txt";

async function resolveTBA(deployment, mltAddress, farmId) {
    try {
        const registryAddr = deployment.ERC6551Registry || deployment["ERC6551Registry"] || deployment["utilities: ERC6551Registry"] || deployment.utilities?.ERC6551Registry;
        const implAddr = deployment.ERC6551AccountImplementation || deployment["ERC6551AccountImplementation"] || deployment["utilities: ERC6551AccountImplementation"] || deployment.utilities?.ERC6551AccountImplementation;
        if (!registryAddr || !implAddr) return null;
        const registry = await ethers.getContractAt("ERC6551Registry", registryAddr);
        const salt = ethers.ZeroHash;
        const chain = (await ethers.provider.getNetwork()).chainId;
        const tba = await registry.account(implAddr, salt, chain, mltAddress, farmId);
        return tba && tba !== ethers.ZeroAddress ? tba : null;
    } catch (_) {
        return null;
    }
}

async function loadDeploymentInfo() {
    if (!fs.existsSync(DEPLOYMENT_FILE)) {
        throw new Error(`Deployment file not found: ${DEPLOYMENT_FILE}`);
    }
    
    const deploymentContent = fs.readFileSync(DEPLOYMENT_FILE, "utf8");
    const deployment = {};
    
    const lines = deploymentContent.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine.startsWith('=') || trimmedLine.startsWith('TreeFarm System') || 
            trimmedLine.startsWith('Deployed at:') || trimmedLine.startsWith('Network:') || 
            trimmedLine.startsWith('Deployer:') || trimmedLine.startsWith('NOTE:') || 
            trimmedLine.startsWith('TOKEN CONTRACTS:') || trimmedLine.startsWith('DIAMOND:') || 
            trimmedLine.startsWith('FACETS:') || trimmedLine.startsWith('UTILITIES:') || 
            trimmedLine.startsWith('VAULT (MTTR):') || trimmedLine.startsWith('DIAMOND TOKEN ADDRESSES:')) {
            continue;
        }
        
        if (trimmedLine.includes(':')) {
            const colonIndex = trimmedLine.indexOf(':');
            const key = trimmedLine.substring(0, colonIndex).trim();
            const value = trimmedLine.substring(colonIndex + 1).trim();
            
            if (value.startsWith('0x') && value.length === 42) {
                deployment[key] = value;
            }
        }
    }
    
    return deployment;
}

/**
 * Get active farms using the getActiveFarmIds() function from MTTR contract
 * @param {Object} mttr - The MochaTreeRightsToken contract instance
 * @returns {Array} Array of active farm IDs
 */
async function getActiveFarmsFromMTTR(mttr) {
    try {
        console.log("Getting active farms from MTTR contract...");
        const result = await mttr.getActiveFarmIds();
        // ethers v6 returns BigInt[]; normalize to number[] for logging/JS ops
        const idsArray = Array.isArray(result)
            ? result
            : (typeof result?.toArray === 'function' ? result.toArray() : []);
        const normalizedIds = idsArray.map((v) => Number(v));
        console.log(`Found ${normalizedIds.length} active farms: [${normalizedIds.join(', ')}]`);
        return normalizedIds;
    } catch (error) {
        console.error("Error getting active farms from MTTR:", error.message);
        // Fallback: derive by scanning farm configs if decode failed (e.g., BAD_DATA 0x)
        const decodeIssue = /could not decode result data|BAD_DATA|result data/i.test(error?.message || "");
        if (!decodeIssue) {
            return [];
        }
        console.log("Falling back to scanning vault farms to determine active IDs...");
        const fallbackActive = [];
        let id = 1;
        while (true) {
            try {
                const farmConfig = await mttr.getFarmConfig(id);
                if (farmConfig?.farmOwner && farmConfig.farmOwner !== ethers.ZeroAddress && farmConfig.active) {
                    fallbackActive.push(id);
                }
                id++;
            } catch (_) {
                break;
            }
        }
        console.log(`Derived ${fallbackActive.length} active farms via fallback: [${fallbackActive.join(', ')}]`);
        return fallbackActive;
    }
}

/**
 * Get detailed information for active farms
 * @param {Object} mttr - The MochaTreeRightsToken contract instance
 * @param {Array} activeFarmIds - Array of active farm IDs
 * @returns {Array} Array of farm details
 */
async function getActiveFarmDetails(mttr, activeFarmIds) {
    const farmDetails = [];
    
    for (const farmId of activeFarmIds) {
        try {
            const farmConfig = await mttr.getFarmConfig(farmId);
            const collateralInfo = await mttr.getCollateralInfo(farmId);
            const yieldDistribution = await mttr.getYieldDistribution(farmId);
            
            farmDetails.push({
                id: farmId,
                name: farmConfig.name,
                owner: farmConfig.farmOwner,
                active: farmConfig.active,
                targetAPY: farmConfig.targetAPY,
                maturityPeriod: farmConfig.maturityPeriod,
                treeCount: farmConfig.treeCount,
                bondValue: farmConfig.bondValue,
                shareTokenAddress: farmConfig.shareTokenAddress,
                createdTimestamp: farmConfig.createdTimestamp,
                maturityTimestamp: farmConfig.maturityTimestamp,
                minInvestment: farmConfig.minInvestment,
                maxInvestment: farmConfig.maxInvestment,
                collateral: {
                    totalTrees: collateralInfo.totalTrees,
                    valuationPerTree: collateralInfo.valuationPerTree,
                    totalValue: collateralInfo.totalValue,
                    coverageRatio: collateralInfo.coverageRatio,
                    lastUpdated: collateralInfo.lastUpdated
                },
                yield: {
                    totalYield: yieldDistribution.totalYield,
                    distributedYield: yieldDistribution.distributedYield,
                    pendingYield: yieldDistribution.pendingYield,
                    lastDistribution: yieldDistribution.lastDistribution
                }
            });
        } catch (error) {
            console.error(`Error getting details for farm ${farmId}:`, error.message);
        }
    }
    
    return farmDetails;
}

async function main() {
    console.log("Check Existing Farms Script");
    console.log("===========================\n");

    // Load deployment information
    const deployment = await loadDeploymentInfo();
    const mttrAddress = deployment.MochaTreeRightsToken;
    const mltAddress = deployment.MochaLandToken;
    const mttAddress = deployment.MochaTreeToken;
    
    if (!mttrAddress || !mltAddress || !mttAddress) {
        throw new Error("Missing required contract addresses in deployment file");
    }

    console.log("Contract Addresses:");
    console.log("  MTTR (Vault):", mttrAddress);
    console.log("  MLT (Land):", mltAddress);
    console.log("  MTT (Tree):", mttAddress);
    console.log("");

    // Create contract instances
    const mttr = await ethers.getContractAt("MochaTreeRightsToken", mttrAddress);
    const mlt = await ethers.getContractAt("MochaLandToken", mltAddress);
    const mtt = await ethers.getContractAt("MochaTreeToken", mttAddress);

    console.log("Checking existing farms...\n");

    // Check MLT tokens (farms)
    console.log("MLT Tokens (Land/Farms):");
    console.log("========================");
    
    const existingMltFarms = [];
    let nextMltId = 1;
    
    // Check for existing MLT tokens
    while (true) {
        try {
            const owner = await mlt.ownerOf(nextMltId);
            if (owner !== ethers.ZeroAddress) {
                existingMltFarms.push({
                    id: nextMltId,
                    owner: owner
                });
                console.log(`  Farm ID ${nextMltId}: Owned by ${owner}`);
            }
            nextMltId++;
        } catch (error) {
            // Token doesn't exist, we've reached the end
            break;
        }
    }
    
    if (existingMltFarms.length === 0) {
        console.log("  No existing MLT tokens found");
    } else {
        console.log(`\n  Total existing MLT tokens: ${existingMltFarms.length}`);
        console.log(`  Next available MLT ID: ${nextMltId}`);
    }

    // Check vault farms
    console.log("\nVault Farms:");
    console.log("============");
    
    const existingVaultFarms = [];
    let nextVaultId = 1;
    
    // Check for existing vault farms
    while (true) {
        try {
            const farmConfig = await mttr.getFarmConfig(nextVaultId);
            if (farmConfig.farmOwner !== ethers.ZeroAddress) {
                existingVaultFarms.push({
                    id: nextVaultId,
                    name: farmConfig.name,
                    owner: farmConfig.farmOwner,
                    active: farmConfig.active,
                    targetAPY: farmConfig.targetAPY,
                    shareToken: farmConfig.shareTokenAddress
                });
                console.log(`  Farm ID ${nextVaultId}: ${farmConfig.name}`);
                console.log(`    Owner: ${farmConfig.farmOwner}`);
                console.log(`    Active: ${farmConfig.active}`);
                console.log(`    Target APY: ${farmConfig.targetAPY} bps`);
                console.log(`    Share Token: ${farmConfig.shareTokenAddress}`);
                console.log("");
            }
            nextVaultId++;
        } catch (error) {
            // Farm doesn't exist, we've reached the end
            break;
        }
    }
    
    if (existingVaultFarms.length === 0) {
        console.log("  No existing vault farms found");
    } else {
        console.log(`  Total existing vault farms: ${existingVaultFarms.length}`);
        console.log(`  Next available vault ID: ${nextVaultId}`);
    }

    // Get active farms using MTTR contract
    console.log("\nActive Farms (from MTTR contract):");
    console.log("==================================");
    
    const activeFarmIds = await getActiveFarmsFromMTTR(mttr);
    
    if (activeFarmIds.length > 0) {
        console.log("\nDetailed Active Farm Information:");
        console.log("=================================");
        
        const activeFarmDetails = await getActiveFarmDetails(mttr, activeFarmIds);
        
        for (const farm of activeFarmDetails) {
            console.log(`\n  Farm ID ${farm.id}: ${farm.name}`);
            console.log(`    Owner: ${farm.owner}`);
            console.log(`    Active: ${farm.active}`);
            console.log(`    Target APY: ${farm.targetAPY} bps (${(Number(farm.targetAPY) / 100).toFixed(2)}%)`);
            console.log(`    Maturity Period: ${farm.maturityPeriod} months`);
            console.log(`    Tree Count: ${farm.treeCount}`);
            console.log(`    Bond Value: ${ethers.formatEther(farm.bondValue)} MBT`);
            console.log(`    Share Token: ${farm.shareTokenAddress}`);
            console.log(`    Created: ${new Date(Number(farm.createdTimestamp) * 1000).toISOString()}`);
            console.log(`    Matures: ${new Date(Number(farm.maturityTimestamp) * 1000).toISOString()}`);
            console.log(`    Minimum Investment: ${farm.minInvestment ? ethers.formatEther(farm.minInvestment) : 'Not set'} MBT`);
            console.log(`    Maximum Investment: ${farm.maxInvestment ? ethers.formatEther(farm.maxInvestment) : 'Not set'} MBT`);
            
            console.log(`    Collateral:`);
            console.log(`      Total Trees: ${farm.collateral.totalTrees}`);
            console.log(`      Valuation per Tree: ${ethers.formatEther(farm.collateral.valuationPerTree)} MBT`);
            console.log(`      Total Value: ${ethers.formatEther(farm.collateral.totalValue)} MBT`);
            console.log(`      Coverage Ratio: ${(Number(farm.collateral.coverageRatio) / 100).toFixed(2)}%`);
            console.log(`      Last Updated: ${new Date(Number(farm.collateral.lastUpdated) * 1000).toISOString()}`);
            
            console.log(`    Yield:`);
            console.log(`      Total Yield: ${ethers.formatEther(farm.yield.totalYield)} MBT`);
            console.log(`      Distributed Yield: ${ethers.formatEther(farm.yield.distributedYield)} MBT`);
            console.log(`      Pending Yield: ${ethers.formatEther(farm.yield.pendingYield)} MBT`);
            console.log(`      Last Distribution: ${new Date(Number(farm.yield.lastDistribution) * 1000).toISOString()}`);
        }
    } else {
        console.log("  No active farms found");
    }

    // Check MTT tokens (trees)
    console.log("\nMTT Tokens (Trees):");
    console.log("===================");
    
    const existingMttFarms = new Set();
    let maxCheckedId = 0;
    
    // Check for existing MTT tokens (TBA-aware)
    for (let farmId = 1; farmId <= Math.max(nextMltId, nextVaultId) + 10; farmId++) {
        let hasTrees = false;
        try {
            // Prefer direct holder check using the farm's ERC6551 account
            const tba = await resolveTBA(deployment, mltAddress, farmId);
            if (tba) {
                try {
                    const subCount = await mtt.subIdBalanceOf(tba, farmId);
                    if (subCount > 0) {
                        hasTrees = true;
                        console.log(`  Farm ID ${farmId}: Has MTT tokens (trees) held by TBA ${tba}`);
                    }
                } catch (_) { /* ignore and fallback below */ }
            }
            // Fallback: if TBA is unknown or returns 0, scan a few subIds via totalSupply
            if (!hasTrees) {
                for (let treeId = 1; treeId <= 20; treeId++) {
                    try {
                        const totalSupply = await mtt.totalSupply(farmId, treeId);
                        if (totalSupply > 0) { hasTrees = true; break; }
                    } catch (_) { break; }
                }
                if (hasTrees) console.log(`  Farm ID ${farmId}: Has MTT tokens (trees) [via totalSupply scan]`);
            }
            if (hasTrees) existingMttFarms.add(farmId);
        } catch (_) { /* ignore */ }
        maxCheckedId = farmId;
    }
    
    if (existingMttFarms.size === 0) {
        console.log("  No existing MTT tokens found");
    } else {
        console.log(`  Total farms with MTT tokens: ${existingMttFarms.size}`);
    }

    // Summary and recommendations
    console.log("\n" + "=".repeat(50));
    console.log("SUMMARY & RECOMMENDATIONS");
    console.log("=".repeat(50));
    
    // Active farms summary
    console.log(`\nActive Farms Summary:`);
    console.log(`  Total Active Farms: ${activeFarmIds.length}`);
    if (activeFarmIds.length > 0) {
        console.log(`  Active Farm IDs: [${activeFarmIds.join(', ')}]`);
    }
    
    const allUsedIds = new Set([
        ...existingMltFarms.map(f => f.id),
        ...existingVaultFarms.map(f => f.id),
        ...Array.from(existingMttFarms)
    ]);
    
    const sortedUsedIds = Array.from(allUsedIds).sort((a, b) => a - b);
    
    console.log(`\nUsed Farm IDs: ${sortedUsedIds.length > 0 ? sortedUsedIds.join(', ') : 'None'}`);
    
    if (sortedUsedIds.length > 0) {
        const maxUsedId = Math.max(...sortedUsedIds);
        console.log(`\nRecommended next Farm ID: ${maxUsedId + 1}`);
        
        // Find gaps in the sequence
        const gaps = [];
        for (let i = 1; i < maxUsedId; i++) {
            if (!allUsedIds.has(i)) {
                gaps.push(i);
            }
        }
        
        if (gaps.length > 0) {
            console.log(`\nAvailable Farm IDs (gaps): ${gaps.join(', ')}`);
        }
    } else {
        console.log(`\nRecommended next Farm ID: 1`);
    }
    
    // Check for inconsistencies
    console.log("\nConsistency Check:");
    console.log("==================");
    
    const mltIds = new Set(existingMltFarms.map(f => f.id));
    const vaultIds = new Set(existingVaultFarms.map(f => f.id));
    const activeIds = new Set(activeFarmIds);
    
    // Since MTTR IS the vault, we should compare the active farms list with the vault farms
    // and check for consistency in the active status
    
    const mltOnly = Array.from(mltIds).filter(id => !vaultIds.has(id));
    const vaultOnly = Array.from(vaultIds).filter(id => !mltIds.has(id));
    
    // Check for farms that are in the active list but not found in vault farms
    const activeOnly = Array.from(activeIds).filter(id => !vaultIds.has(id));
    
    // Check for farms that are in vault but not in active list (should be inactive)
    const inactiveVaultFarms = Array.from(vaultIds).filter(id => !activeIds.has(id));
    
    // Verify that farms in active list are actually marked as active in vault
    const activeStatusMismatch = [];
    for (const farmId of activeIds) {
        const vaultFarm = existingVaultFarms.find(f => f.id === farmId);
        if (vaultFarm && !vaultFarm.active) {
            activeStatusMismatch.push(farmId);
        }
    }
    
    if (mltOnly.length > 0) {
        console.log(`⚠️  Farms with MLT tokens but not in vault: ${mltOnly.join(', ')}`);
    }
    
    if (vaultOnly.length > 0) {
        console.log(`⚠️  Farms in vault but no MLT tokens: ${vaultOnly.join(', ')}`);
    }
    
    if (activeOnly.length > 0) {
        console.log(`⚠️  Farms in active list but not found in vault: ${activeOnly.join(', ')}`);
    }
    
    if (inactiveVaultFarms.length > 0) {
        console.log(`ℹ️  Farms in vault but not in active list (inactive): ${inactiveVaultFarms.join(', ')}`);
    }
    
    if (activeStatusMismatch.length > 0) {
        console.log(`⚠️  Farms in active list but marked as inactive in vault: ${activeStatusMismatch.join(', ')}`);
    }
    
    if (mltOnly.length === 0 && vaultOnly.length === 0 && activeOnly.length === 0 && 
        activeStatusMismatch.length === 0 && mltIds.size > 0) {
        console.log("✅ All farms are consistent between MLT, vault, and active status");
    }
    
    console.log("\nCheck completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
    });

