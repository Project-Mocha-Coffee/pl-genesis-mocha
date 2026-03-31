const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deployment configuration
const DEPLOYMENT_FILE = "deployments/deployment-scrollSepolia-chain-534351-2025-08-11T14-58-45-568Z.txt";
//const DEPLOYMENT_FILE = "deployments/deployment-hardhat-chain-31337-2025-08-20T15-01-44-065Z.txt";
const ACCOUNTS_FILE = "accounts/accounts-scrollSepolia-534351-2025-08-01T16-14-51-798Z.txt";

// Test farm configurations
const FARM_CONFIGS = [
    {
        id: 17,
        name: "Highland Arabica Farm",
        targetAPY: 1200, // 12% APY
        maturityPeriod: 60, // 36 months
        treeCount: 2,
        minInvestment: ethers.parseEther("0.04"), // 10 MBT
        maxInvestment: ethers.parseEther("250") // 1000 MBT
    },
  
];

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
    console.log("MochaTreeRightsToken End-to-End Interaction Script");
    console.log("================================================\n");

    // Load deployment information
    const deployment = await loadDeploymentInfo();
    const mttrAddress = deployment.MochaTreeRightsToken;
    const mbtAddress = deployment.MochaBeanToken;
    const mltAddress = deployment.MochaLandToken;
    const mttAddress = deployment.MochaTreeToken;
    const diamondAddress = deployment.TreeFarmDiamond;
    
    // Validate that we have all required contract addresses
    if (!mttrAddress || !mbtAddress || !mltAddress || !mttAddress) {
        throw new Error("Missing required contract addresses in deployment file. Found: " + 
            JSON.stringify({ mttrAddress, mbtAddress, mltAddress, mttAddress, diamondAddress }));
    }

    console.log("Deployed Contract Addresses:");
    console.log("  MTTR (MochaTreeRightsToken):", mttrAddress);
    console.log("  MBT (MochaBeanToken):", mbtAddress);
    console.log("  MLT (MochaLandToken):", mltAddress);
    console.log("  MTT (MochaTreeToken):", mttAddress);
    if (diamondAddress) {
        console.log("  Diamond:", diamondAddress);
    } else {
        console.log("  Diamond: Not found (optional for MTTR standalone mode)");
    }
    console.log("");

    // Load test accounts
    const accounts = await loadTestAccounts();
    console.log("Loaded accounts:", Object.keys(accounts));
    
    // Verify required accounts exist
    const requiredAccounts = ['FARMOWNER1', 'FARMOWNER2', 'INVESTOR1', 'INVESTOR2', 'VAULTMANAGER', 'ORACLE'];
    const missingAccounts = requiredAccounts.filter(account => !accounts[account]);
    
    if (missingAccounts.length > 0) {
        console.log("⚠️  Missing required accounts:", missingAccounts);
        console.log("   Please ensure the accounts file contains all required test accounts");
        console.log("   Required accounts:", requiredAccounts);
        console.log("");
    } else {
        console.log("✅ All required accounts found");
    }
    console.log("");

    // Get deployer signer
    const [deployer] = await ethers.getSigners();

    // Get contract instances
    const mttr = await ethers.getContractAt("MochaTreeRightsToken", mttrAddress);
    const mbt = await ethers.getContractAt("MochaBeanToken", mbtAddress);
    const mlt = await ethers.getContractAt("MochaLandToken", mltAddress);
    const mtt = await ethers.getContractAt("MochaTreeToken", mttAddress);
    
    let diamond = null;
    if (diamondAddress) {
        try {
            diamond = await ethers.getContractAt("MultiTrancheVaultFacet", diamondAddress);
        } catch (error) {
            console.log("  ⚠️  Could not initialize diamond contract:", error.message);
        }
    }
    
    // Verify contract interfaces
    console.log("Verifying contract interfaces...");
    try {
        await mttr.name();
        console.log("  ✅ MTTR interface verified");
    } catch (error) {
        console.log("  ❌ MTTR interface error:", error.message);
    }
    
    try {
        await mbt.name();
        console.log("  ✅ MBT interface verified");
    } catch (error) {
        console.log("  ❌ MBT interface error:", error.message);
    }
    
    try {
        await mlt.name();
        console.log("  ✅ MLT interface verified");
    } catch (error) {
        console.log("  ❌ MLT interface error:", error.message);
    }
    
    try {
        await mtt.name();
        console.log("  ✅ MTT interface verified");
    } catch (error) {
        console.log("  ❌ MTT interface error:", error.message);
    }
    
    if (diamond) {
        try {
            await diamond.getUserBondCount(deployer.address);
            console.log("  ✅ Diamond interface verified");
        } catch (error) {
            console.log("  ❌ Diamond interface error:", error.message);
        }
    } else {
        console.log("  ⚠️  Diamond not available - bond count queries will be limited");
    }
    console.log("");

    // Create signers for test accounts
    const signers = {};
    for (const [role, account] of Object.entries(accounts)) {
        signers[role] = new ethers.Wallet(account.privateKey, deployer.provider);
    }

    // Display initial contract state
    console.log("Initial Contract State:");
    console.log("=======================");
    console.log("  MTTR Token Name:", await mttr.name());
    console.log("  MTTR Token Symbol:", await mttr.symbol());
    console.log("  MTTR Asset Address:", await mttr.asset());
    console.log("  Total Assets:", ethers.formatEther(await mttr.totalAssets()), "MBT");
    console.log("  Paused:", await mttr.paused());
    console.log("  MLT Token Address:", await mttr.mochaLandToken());
    console.log("  MTT Token Address:", await mttr.mochaTreeToken());
    console.log("  Total Farms:", await mttr.totalFarms());
    console.log("  Total Active Bonds:", await mttr.totalActiveBonds());
    console.log("");

    // STEP 1: Setup MLT tokens for farm owners
    console.log("STEP 1: Setting up MLT tokens for farm owners");
    console.log("=============================================");
    
    for (const farmConfig of FARM_CONFIGS) {
        try {
            // Check if MLT token already exists
            const existingOwner = await mlt.ownerOf(farmConfig.id);
            if (existingOwner !== ethers.ZeroAddress) {
                console.log(`   MLT token ${farmConfig.id} already exists, owned by ${existingOwner}`);
                continue;
            }
            
            // Create LandMetadata struct for the farm
            const landMetadata = {
                name: farmConfig.name,
                description: `A coffee farm specializing in ${farmConfig.name.toLowerCase()}`,
                farmInfo: {
                    name: farmConfig.name,
                    location: "Ethiopia, Yirgacheffe",
                    area: "10 hectares",
                    soilType: "Volcanic loam"
                },
                imageURI: "https://example.com/farm-image.jpg",
                externalURL: "https://example.com/farm-details"
            };
            
            // Mint MLT token to farm owner with proper metadata
            const farmOwner = signers[`FARMOWNER${farmConfig.id}`];
            await mlt.connect(deployer).mint(
                farmOwner.address,
                landMetadata,
                "Organic Certified, Rainforest Alliance" // certifications
            );
            console.log(`   MLT token ${farmConfig.id} minted to ${farmOwner.address}`);
        } catch (error) {
            console.log(`   Failed to mint MLT token ${farmConfig.id}:`, error.message);
        }
    }
    console.log("");

    // STEP 2: Setup MTT tokens for farms
    console.log("STEP 2: Setting up MTT tokens for farms");
    console.log("=======================================");
    
    for (const farmConfig of FARM_CONFIGS) {
        try {
            const farmOwner = signers[`FARMOWNER${farmConfig.id}`];
            
            let mintedCount = 0;
            // Mint MTT tokens to farm owner (representing trees)
            for (let i = 1; i <= farmConfig.treeCount; i++) {
                // Check if MTT token already exists
                const existingBalance = await mtt.subBalanceOf(farmOwner.address, farmConfig.id, i);
                if (existingBalance > 0) {
                    console.log(`   MTT token (farm ${farmConfig.id}, tree ${i}) already exists with balance ${existingBalance}`);
                    continue;
                }
                
                await mtt.connect(deployer).mint(farmOwner.address, farmConfig.id, i, 1);
                mintedCount++;
            }
            console.log(`   ${mintedCount} new MTT tokens minted for farm ${farmConfig.id} (${farmConfig.treeCount - mintedCount} already existed)`);
        } catch (error) {
            console.log(`   Failed to mint MTT tokens for farm ${farmConfig.id}:`, error.message);
        }
    }
    console.log("");

    // STEP 3: Mint MBT tokens to investors
   /*  console.log("STEP 3: Minting MBT tokens to investors");
    console.log("=======================================");
    
    const mbtAmount = ethers.parseEther("1000"); // 1000000 MBT per investor
    for (let i = 1; i <= 2; i++) {
        try {
            const investor = signers[`INVESTOR${i}`];
            await mbt.connect(deployer).mint(investor.address, mbtAmount);
            console.log(`   ${ethers.formatEther(mbtAmount)} MBT minted to ${investor.address}`);
        } catch (error) {
            console.log(`   Failed to mint MBT to INVESTOR${i}:`, error.message);
        }
    }
    console.log(""); */

    // STEP 4: Add farms to the vault
    console.log("STEP 4: Adding farms to the vault");
    console.log("=================================");
    
    for (const farmConfig of FARM_CONFIGS) {
        try {
            const farmOwner = signers[`FARMOWNER${farmConfig.id}`];
            
            // Verify MLT token ownership
            try {
                const mltOwner = await mlt.ownerOf(farmConfig.id);
                console.log(`   Farm ${farmConfig.id} MLT owner: ${mltOwner}`);
                console.log(`   Farm owner address: ${farmOwner.address}`);
                
                if (mltOwner !== farmOwner.address) {
                    console.log(`   ⚠️  MLT token ${farmConfig.id} is not owned by ${farmOwner.address}`);
                    continue;
                }
            } catch (mltError) {
                console.log(`   ❌ Could not verify MLT ownership for farm ${farmConfig.id}:`, mltError.message);
                continue;
            }
            
                         // Check if farm already exists in vault
             try {
                 const existingFarm = await mttr.getFarmConfig(farmConfig.id);
                 if (existingFarm.farmOwner !== "0x0000000000000000000000000000000000000000") {
                     console.log(`   Farm ${farmConfig.id} already exists in vault, skipping`);
                     continue;
                 }
             } catch (farmError) {
                 // Farm doesn't exist yet, which is what we want
                 console.log(`   Farm ${farmConfig.id} not yet in vault, proceeding with addition`);
             }
            
            // Add farm to vault - using the updated interface
            const tx = await mttr.connect(farmOwner).addFarm(
                farmConfig.id,
                farmConfig.name,
                farmOwner.address, // farmTokenBoundAccount
                farmConfig.targetAPY,
                farmConfig.maturityPeriod,
                `${farmConfig.name} Share Token`,
                `FST${farmConfig.id}`
            );
            await tx.wait();
            console.log(`   Farm ${farmConfig.id} added successfully`);
            
            // Get farm config to verify
            const farmConfigData = await mttr.getFarmConfig(farmConfig.id);
            console.log(`   Farm Name: ${farmConfigData.name}`);
            console.log(`   Farm Owner: ${farmConfigData.farmOwner}`);
            console.log(`   Target APY: ${farmConfigData.targetAPY} bps`);
            console.log(`   Active: ${farmConfigData.active}`);
            console.log(`   Share Token: ${farmConfigData.shareTokenAddress}`);
        } catch (error) {
            console.log(`   Failed to add farm ${farmConfig.id}:`, error.message);
            console.log(`   Error details:`, error);
        }
    }
    console.log("");

    // STEP 5: Purchase bonds
    console.log("STEP 5: Purchasing bonds");
    console.log("=========================");
    
    // First, get all active farm IDs from the vault
    console.log("🔍 Discovering active farms in the vault...");
    const activeFarms = [];
    const totalFarms = await mttr.totalFarms();
    console.log(`   Total farms in vault: ${totalFarms.toString()}`);
    
    for (let farmId = 1; farmId <= totalFarms; farmId++) {
        try {
            const farmConfig = await mttr.getFarmConfig(farmId);
            if (farmConfig.active) {
                activeFarms.push({
                    id: farmId,
                    name: farmConfig.name,
                    targetAPY: farmConfig.targetAPY,
                    minInvestment: farmConfig.minInvestment,
                    maxInvestment: farmConfig.maxInvestment,
                    treeCount: farmConfig.treeCount
                });
                console.log(`   ✅ Found active farm ${farmId}: ${farmConfig.name}`);
            } else {
                console.log(`   ⚠️  Farm ${farmId} exists but is not active`);
            }
        } catch (error) {
            console.log(`   ❌ Farm ${farmId} not found or error: ${error.message}`);
        }
    }
    
    if (activeFarms.length === 0) {
        console.log("   ❌ No active farms found in the vault. Cannot purchase bonds.");
        return;
    }
    
    console.log(`\n📋 Found ${activeFarms.length} active farms for bond purchases:`);
    activeFarms.forEach(farm => {
        console.log(`   Farm ${farm.id}: ${farm.name} (APY: ${Number(farm.targetAPY)/100}%, Min: ${ethers.formatEther(farm.minInvestment)} MBT, Max: ${ethers.formatEther(farm.maxInvestment)} MBT)`);
    });
    
    const bondAmount = ethers.parseEther("0.05"); // 100 MBT per purchase
    console.log("bondAmount", bondAmount);
    // Purchase bonds for each active farm
    for (const farm of activeFarms) {
        for (let i = 1; i <= 2; i++) {
            try {
                const investor = signers[`INVESTOR${i}`];
                
                // Check investor MBT balance
                const investorBalance = await mbt.balanceOf(investor.address);
                console.log(`\n   INVESTOR${i} MBT balance: ${ethers.formatEther(investorBalance)} MBT`);
                
                if (investorBalance < bondAmount) {
                    console.log(`   ⚠️  INVESTOR${i} has insufficient MBT balance for bond purchase`);
                    continue;
                }
                
                // Check if bond amount is within farm limits
                if (bondAmount < farm.minInvestment) {
                    console.log(`   ⚠️  Bond amount ${ethers.formatEther(bondAmount)} MBT is below farm ${farm.id} minimum ${ethers.formatEther(farm.minInvestment)} MBT`);
                    continue;
                }
                
                if (bondAmount > farm.maxInvestment) {
                    console.log(`   ⚠️  Bond amount ${ethers.formatEther(bondAmount)} MBT exceeds farm ${farm.id} maximum ${ethers.formatEther(farm.maxInvestment)} MBT`);
                    continue;
                }
                
                // Check current allowance
                const currentAllowance = await mbt.allowance(investor.address, mttrAddress);
                console.log(`   Current allowance: ${ethers.formatEther(currentAllowance)} MBT`);
                
                // Approve MBT spending if needed
                if (currentAllowance < bondAmount) {
                    console.log(`   Approving ${ethers.formatEther(bondAmount)} MBT for MTTR contract`);
                    await mbt.connect(investor).approve(mttrAddress, bondAmount);
                }
                
                // Test bond purchase conditions step by step
                console.log(`   Testing bond purchase conditions for farm ${farm.id}...`);
                
                try {
                    // 1. Check if farm exists and is active
                    const farmConfig = await mttr.getFarmConfig(farm.id);
                    console.log(`     ✅ Farm exists and is active`);
                    
                    // 2. Check investment limits
                    if (bondAmount >= farmConfig.minInvestment && bondAmount <= farmConfig.maxInvestment) {
                        console.log(`     ✅ Investment amount within limits`);
                    } else {
                        console.log(`     ❌ Investment amount outside limits: ${ethers.formatEther(bondAmount)} MBT (min: ${ethers.formatEther(farmConfig.minInvestment)}, max: ${ethers.formatEther(farmConfig.maxInvestment)})`);
                    }
                    
                    // 3. Check maturity
                    const currentTime = Math.floor(Date.now() / 1000);
                    if (currentTime < Number(farmConfig.maturityTimestamp)) {
                        console.log(`     ✅ Farm has not matured yet`);
                    } else {
                        console.log(`     ❌ Farm has matured. Current: ${currentTime}, Maturity: ${farmConfig.maturityTimestamp.toString()}`);
                    }
                    
                    // 4. Check bond availability
                    const shareToken = await ethers.getContractAt("FarmShareToken", farmConfig.shareTokenAddress);
                    const shareTokenSupply = await shareToken.totalSupply();
                    const maxBonds = farmConfig.treeCount * ethers.parseEther("1");
                    
                    if (shareTokenSupply < maxBonds) {
                        console.log(`     ✅ Bonds available (${ethers.formatEther(shareTokenSupply)} < ${ethers.formatEther(maxBonds)})`);
                    } else {
                        console.log(`     ❌ No bonds available (${ethers.formatEther(shareTokenSupply)} >= ${ethers.formatEther(maxBonds)})`);
                    }
                    
                    // 5. Check collateral
                    const collateralInfo = await mttr.getCollateralInfo(farm.id);
                    if (collateralInfo.totalValue > 0) {
                        console.log(`     ✅ Collateral has value: ${ethers.formatEther(collateralInfo.totalValue)} MBT`);
                    } else {
                        console.log(`     ❌ No collateral value`);
                    }
                    
                    // 6. Check investor balance and allowance
                    const investorBalance = await mbt.balanceOf(investor.address);
                    const allowance = await mbt.allowance(investor.address, mttr.target);
                    
                    if (investorBalance >= bondAmount) {
                        console.log(`     ✅ Sufficient balance: ${ethers.formatEther(investorBalance)} MBT`);
                    } else {
                        console.log(`     ❌ Insufficient balance: ${ethers.formatEther(investorBalance)} MBT < ${ethers.formatEther(bondAmount)} MBT`);
                    }
                    
                    if (allowance >= bondAmount) {
                        console.log(`     ✅ Sufficient allowance: ${ethers.formatEther(allowance)} MBT`);
                    } else {
                        console.log(`     ❌ Insufficient allowance: ${ethers.formatEther(allowance)} MBT < ${ethers.formatEther(bondAmount)} MBT`);
                    }
                    
                } catch (conditionError) {
                    console.log(`     ❌ Error checking conditions: ${conditionError.message}`);
                }
                
                // Purchase bond using the updated interface
                console.log(`   Purchasing bond for farm ${farm.id} (${farm.name}) with ${ethers.formatEther(bondAmount)} MBT`);
                const tx = await mttr.connect(investor).purchaseBond( bondAmount);
                const receipt = await tx.wait();
                
                // Find BondPurchased event
                const bondPurchasedEvent = receipt.logs.find(log => {
                    try {
                        const parsed = mttr.interface.parseLog(log);
                        return parsed.name === "BondPurchased";
                    } catch {
                        return false;
                    }
                });
                
                if (bondPurchasedEvent) {
                    const parsed = mttr.interface.parseLog(bondPurchasedEvent);
                    console.log(`   ✅ Bond purchased: Farm ${parsed.args.farmId}, Bond ID ${parsed.args.bondId}, Amount ${ethers.formatEther(parsed.args.mbtAmount)} MBT`);
                } else {
                    console.log(`   ✅ Bond purchase transaction successful for farm ${farm.id}`);
                }
            } catch (error) {
                console.log(`   ❌ Failed to purchase bond for farm ${farm.id} by INVESTOR${i}:`, error.message);
                console.log(`   Error Type: ${error.constructor.name}`);
                console.log(`   Error Code: ${error.code || 'N/A'}`);
                console.log(`   Error Data: ${error.data || 'N/A'}`);
                
                // Try to decode the revert reason if available
                if (error.data) {
                    try {
                        // Try to decode as a custom error
                        const decodedError = mttr.interface.parseError(error.data);
                        console.log(`   Decoded Error: ${decodedError.name}`);
                        console.log(`   Error Args: ${JSON.stringify(decodedError.args)}`);
                    } catch (decodeError) {
                        console.log(`   Could not decode error data: ${decodeError.message}`);
                    }
                }
                
                // Check for specific revert reasons in the error message
                const errorMsg = error.message.toLowerCase();
                if (errorMsg.includes("farm !exist") || errorMsg.includes("farm not found")) {
                    console.log(`   ❌ Farm ${farm.id} does not exist`);
                } else if (errorMsg.includes("inactive")) {
                    console.log(`   ❌ Farm ${farm.id} is not active`);
                } else if (errorMsg.includes("min")) {
                    console.log(`   ❌ Bond amount is below minimum investment`);
                } else if (errorMsg.includes("max")) {
                    console.log(`   ❌ Bond amount exceeds maximum investment`);
                } else if (errorMsg.includes("matured")) {
                    console.log(`   ❌ Farm has matured`);
                } else if (errorMsg.includes("no bonds available")) {
                    console.log(`   ❌ No bonds available for this farm`);
                } else if (errorMsg.includes("no collateral")) {
                    console.log(`   ❌ Farm has no collateral value`);
                } else if (errorMsg.includes("amount > 0")) {
                    console.log(`   ❌ Bond amount must be greater than 0`);
                } else if (errorMsg.includes("execution reverted")) {
                    console.log(`   ❌ Transaction reverted - checking contract state...`);
                    
                    // Try to get more information about the contract state
                    try {
                        const farmConfig = await mttr.getFarmConfig(farm.id);
                        console.log(`   Farm Config Check:`);
                        console.log(`     - Farm Owner: ${farmConfig.farmOwner}`);
                        console.log(`     - Active: ${farmConfig.active}`);
                        console.log(`     - Tree Count: ${farmConfig.treeCount.toString()}`);
                        console.log(`     - Min Investment: ${ethers.formatEther(farmConfig.minInvestment)} MBT`);
                        console.log(`     - Max Investment: ${ethers.formatEther(farmConfig.maxInvestment)} MBT`);
                        
                        const collateralInfo = await mttr.getCollateralInfo(farm.id);
                        console.log(`   Collateral Check:`);
                        console.log(`     - Total Value: ${ethers.formatEther(collateralInfo.totalValue)} MBT`);
                        console.log(`     - Valuation Per Tree: ${ethers.formatEther(collateralInfo.valuationPerTree)} MBT`);
                        
                        const shareToken = await ethers.getContractAt("FarmShareToken", farmConfig.shareTokenAddress);
                        const shareTokenSupply = await shareToken.totalSupply();
                        console.log(`   Share Token Check:`);
                        console.log(`     - Total Supply: ${ethers.formatEther(shareTokenSupply)}`);
                        console.log(`     - Max Bonds: ${ethers.formatEther(farmConfig.treeCount * ethers.parseEther("1"))}`);
                        
                        const investorBalance = await mbt.balanceOf(investor.address);
                        const allowance = await mbt.allowance(investor.address, mttr.target);
                        console.log(`   Investor Check:`);
                        console.log(`     - Balance: ${ethers.formatEther(investorBalance)} MBT`);
                        console.log(`     - Allowance: ${ethers.formatEther(allowance)} MBT`);
                        console.log(`     - Required: ${ethers.formatEther(bondAmount)} MBT`);
                        
                    } catch (stateError) {
                        console.log(`   Could not check contract state: ${stateError.message}`);
                    }
                } else {
                    console.log(`   ❌ Unknown error - check contract state`);
                    console.log(`   Full error object:`, JSON.stringify(error, null, 2));
                }
            }
        }
    }
    console.log("");

    // STEP 6: View bond positions
    console.log("STEP 6: Viewing bond positions");
    console.log("==============================");
    
    for (let i = 1; i <= 2; i++) {
        try {
            const investor = signers[`INVESTOR${i}`];
            
            // Get bond count using the diamond facet
            let bondCount = 0;
            if (diamond) {
                try {
                    bondCount = await diamond.getUserBondCount(investor.address);
                } catch (error) {
                    console.log(`   Could not get bond count for INVESTOR${i}:`, error.message);
                    continue;
                }
            } else {
                // Try to get bond count by attempting to get bond positions until we fail
                bondCount = 0;
                while (true) {
                    try {
                        await mttr.getBondPosition(investor.address, bondCount);
                        bondCount++;
                    } catch (error) {
                        break; // No more bonds
                    }
                }
            }
            
            console.log(`   INVESTOR${i} has ${bondCount} bonds`);
            
            for (let bondId = 0; bondId < bondCount; bondId++) {
                try {
                    const bondPosition = await mttr.getBondPosition(investor.address, bondId);
                    console.log(`     Bond ${bondId}: Farm ${bondPosition.farmId}, Amount ${ethers.formatEther(bondPosition.depositAmount)} MBT, Redeemed: ${bondPosition.redeemed}`);
                } catch (bondError) {
                    console.log(`     Could not get bond ${bondId} details:`, bondError.message);
                }
            }
        } catch (error) {
            console.log(`   Failed to get bond positions for INVESTOR${i}:`, error.message);
        }
    }
    console.log("");

    // STEP 7: Distributing yield
    console.log("STEP 7: Distributing yield");
    console.log("===========================");
    
    for (const farmConfig of FARM_CONFIGS) {
        try {
            const vaultManager = signers.VAULTMANAGER;
            const yieldAmount = ethers.parseEther("50"); // 50 MBT yield
            
            // First, check if the farm exists and is active
            try {
                const farmConfigData = await mttr.getFarmConfig(farmConfig.id);
                if (!farmConfigData.active) {
                    console.log(`   Farm ${farmConfig.id} is not active, skipping yield distribution`);
                    continue;
                }
                console.log(`   Farm ${farmConfig.id} is active, proceeding with yield distribution`);
            } catch (farmError) {
                console.log(`   Could not verify farm ${farmConfig.id} status:`, farmError.message);
                continue;
            }
            
            // Grant VAULT_MANAGER_ROLE if needed
            const VAULT_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VAULT_MANAGER_ROLE"));
            if (!(await mttr.hasRole(VAULT_MANAGER_ROLE, vaultManager.address))) {
                console.log(`   Granting VAULT_MANAGER_ROLE to ${vaultManager.address}`);
                await mttr.connect(deployer).grantRole(VAULT_MANAGER_ROLE, vaultManager.address);
                console.log(`   ✅ Granted VAULT_MANAGER_ROLE to ${vaultManager.address}`);
            } else {
                console.log(`   ✅ VAULT_MANAGER_ROLE already granted to ${vaultManager.address}`);
            }
            
            // Ensure vault manager has MBT tokens to distribute
            const vaultManagerBalance = await mbt.balanceOf(vaultManager.address);
            console.log(`   Vault manager MBT balance: ${ethers.formatEther(vaultManagerBalance)} MBT`);
            
            if (vaultManagerBalance < yieldAmount) {
                console.log(`   Vault manager needs MBT tokens. Minting ${ethers.formatEther(yieldAmount)} MBT`);
                // Mint MBT to vault manager if needed
                await mbt.connect(deployer).mint(vaultManager.address, yieldAmount);
                console.log(`   ✅ Minted ${ethers.formatEther(yieldAmount)} MBT to vault manager`);
            }
            
            // Check current allowance
            const currentAllowance = await mbt.allowance(vaultManager.address, mttrAddress);
            console.log(`   Current allowance: ${ethers.formatEther(currentAllowance)} MBT`);
            
            // Approve MTTR to spend MBT if needed
            if (currentAllowance < yieldAmount) {
                console.log(`   Approving ${ethers.formatEther(yieldAmount)} MBT for MTTR contract`);
                await mbt.connect(vaultManager).approve(mttrAddress, yieldAmount);
            }
            
            // Distribute yield using the updated interface
            console.log(`   Distributing ${ethers.formatEther(yieldAmount)} MBT yield to farm ${farmConfig.id}`);
            const tx = await mttr.connect(vaultManager).distributeYield(farmConfig.id, yieldAmount);
            await tx.wait();
            console.log(`   ✅ ${ethers.formatEther(yieldAmount)} MBT yield distributed to farm ${farmConfig.id}`);
            
            // Get yield distribution info
            try {
                const yieldInfo = await mttr.getYieldDistribution(farmConfig.id);
                console.log(`   Total Yield: ${ethers.formatEther(yieldInfo.totalYield)} MBT`);
                console.log(`   Distributed Yield: ${ethers.formatEther(yieldInfo.distributedYield)} MBT`);
                console.log(`   Pending Yield: ${ethers.formatEther(yieldInfo.pendingYield)} MBT`);
            } catch (yieldInfoError) {
                console.log(`   Could not get yield distribution info:`, yieldInfoError.message);
            }
        } catch (error) {
            console.log(`   ❌ Failed to distribute yield to farm ${farmConfig.id}:`, error.message);
            console.log(`   Error details:`, error);
        }
    }
    console.log("");

    // STEP 8: Updating collateral valuation
    console.log("STEP 8: Updating collateral valuation");
    console.log("=====================================");
    
    for (const farmConfig of FARM_CONFIGS) {
        try {
            const oracle = signers.ORACLE;
            const newValuation = ethers.parseEther("120"); // 120 MBT per tree
            
            // First, check if the farm exists and is active
            try {
                const farmConfigData = await mttr.getFarmConfig(farmConfig.id);
                if (!farmConfigData.active) {
                    console.log(`   Farm ${farmConfig.id} is not active, skipping collateral update`);
                    continue;
                }
                console.log(`   Farm ${farmConfig.id} is active, proceeding with collateral update`);
            } catch (farmError) {
                console.log(`   Could not verify farm ${farmConfig.id} status:`, farmError.message);
                continue;
            }
            
            // Grant ORACLE_ROLE if needed
            const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
            if (!(await mttr.hasRole(ORACLE_ROLE, oracle.address))) {
                console.log(`   Granting ORACLE_ROLE to ${oracle.address}`);
                await mttr.connect(deployer).grantRole(ORACLE_ROLE, oracle.address);
                console.log(`   ✅ Granted ORACLE_ROLE to ${oracle.address}`);
            } else {
                console.log(`   ✅ ORACLE_ROLE already granted to ${oracle.address}`);
            }
            
            // Get current collateral info
            try {
                const currentCollateral = await mttr.getCollateralInfo(farmConfig.id);
                console.log(`   Current valuation per tree: ${ethers.formatEther(currentCollateral.valuationPerTree)} MBT`);
                console.log(`   Current total value: ${ethers.formatEther(currentCollateral.totalValue)} MBT`);
                console.log(`   Current coverage ratio: ${currentCollateral.coverageRatio} bps`);
            } catch (collateralError) {
                console.log(`   Could not get current collateral info:`, collateralError.message);
            }
            
            // Update collateral valuation using the updated interface
            console.log(`   Updating collateral valuation to ${ethers.formatEther(newValuation)} MBT per tree`);
            const tx = await mttr.connect(oracle).updateCollateralValuation(farmConfig.id, newValuation);
            await tx.wait();
            console.log(`   ✅ Collateral valuation updated for farm ${farmConfig.id}: ${ethers.formatEther(newValuation)} MBT per tree`);
            
            // Get updated collateral info
            try {
                const collateralInfo = await mttr.getCollateralInfo(farmConfig.id);
                console.log(`   Updated total trees: ${collateralInfo.totalTrees}`);
                console.log(`   Updated total value: ${ethers.formatEther(collateralInfo.totalValue)} MBT`);
                console.log(`   Updated coverage ratio: ${collateralInfo.coverageRatio} bps`);
                console.log(`   Last updated: ${new Date(Number(collateralInfo.lastUpdated) * 1000).toISOString()}`);
            } catch (collateralInfoError) {
                console.log(`   Could not get updated collateral info:`, collateralInfoError.message);
            }
        } catch (error) {
            console.log(`   ❌ Failed to update collateral valuation for farm ${farmConfig.id}:`, error.message);
            console.log(`   Error details:`, error);
        }
    }
    console.log("");

    // STEP 9: Testing early bond redemption
    console.log("STEP 9: Testing early bond redemption");
    console.log("=====================================");
    
    try {
        const investor = signers.INVESTOR1;
        const bondId = 0; // First bond
        
        // Check if investor has any bonds
        let bondCount = 0;
        if (diamond) {
            try {
                bondCount = await diamond.getUserBondCount(investor.address);
                console.log(`   INVESTOR1 has ${bondCount} bonds`);
            } catch (error) {
                console.log(`   Could not get bond count for INVESTOR1:`, error.message);
                return;
            }
        } else {
            // Try to get bond count by attempting to get bond positions until we fail
            bondCount = 0;
            while (true) {
                try {
                    await mttr.getBondPosition(investor.address, bondCount);
                    bondCount++;
                } catch (error) {
                    break; // No more bonds
                }
            }
            console.log(`   INVESTOR1 has ${bondCount} bonds (determined by iteration)`);
        }
        
        if (bondCount === 0) {
            console.log("   INVESTOR1 has no bonds, skipping early redemption test");
            return;
        }
        
        // Check if bond exists and is not redeemed
        try {
            const bondPosition = await mttr.getBondPosition(investor.address, bondId);
            console.log(`   Bond ${bondId} details:`);
            console.log(`     Farm ID: ${bondPosition.farmId}`);
            console.log(`     Deposit Amount: ${ethers.formatEther(bondPosition.depositAmount)} MBT`);
            console.log(`     Redeemed: ${bondPosition.redeemed}`);
            console.log(`     Maturity Timestamp: ${new Date(Number(bondPosition.maturityTimestamp) * 1000).toISOString()}`);
            
            if (bondPosition.redeemed) {
                console.log("   Bond already redeemed, skipping early redemption test");
                return;
            }
            
            const currentTimestamp = Math.floor(Date.now() / 1000);
            if (currentTimestamp >= Number(bondPosition.maturityTimestamp)) {
                console.log("   Bond already matured, skipping early redemption test");
                return;
            }
            
            console.log("   Bond is eligible for early redemption, proceeding...");
        } catch (bondError) {
            console.log(`   Could not get bond ${bondId} details:`, bondError.message);
            return;
        }
        
        // Perform early redemption
        console.log(`   Attempting early redemption of bond ${bondId}`);
        const tx = await mttr.connect(investor).redeemBondEarly(bondId);
        const receipt = await tx.wait();
        
        // Find BondRedeemed event
        const bondRedeemedEvent = receipt.logs.find(log => {
            try {
                const parsed = mttr.interface.parseLog(log);
                return parsed.name === "BondRedeemed";
            } catch {
                return false;
            }
        });
        
        if (bondRedeemedEvent) {
            const parsed = mttr.interface.parseLog(bondRedeemedEvent);
            console.log(`   ✅ Early bond redemption successful:`);
            console.log(`     Bond ID: ${parsed.args.bondId}`);
            console.log(`     Principal Amount: ${ethers.formatEther(parsed.args.principalAmount)} MBT`);
            console.log(`     Yield Amount: ${ethers.formatEther(parsed.args.yieldAmount)} MBT`);
        } else {
            console.log(`   ✅ Early bond redemption transaction successful for bond ${bondId}`);
        }
    } catch (error) {
        console.log("   ❌ Failed to test early bond redemption:", error.message);
        console.log("   Error details:", error);
    }
    console.log("");

    // STEP 10: View final state
    console.log("STEP 10: Final contract state");
    console.log("=============================");
    
    console.log("  Total Assets:", ethers.formatEther(await mttr.totalAssets()), "MBT");
    console.log("  Paused:", await mttr.paused());
    console.log("  Total Farms:", await mttr.totalFarms());
    console.log("  Total Active Bonds:", await mttr.totalActiveBonds());
    console.log("  Total Value Locked:", ethers.formatEther(await mttr.totalValueLocked()), "MBT");
    
    // Get active farm IDs
    try {
        const activeFarmIds = await mttr.getActiveFarmIds();
        console.log(`  Active Farm IDs: [${activeFarmIds.join(', ')}]`);
    } catch (error) {
        console.log("  Could not get active farm IDs:", error.message);
    }
    
    for (const farmConfig of FARM_CONFIGS) {
        try {
            const farmConfigData = await mttr.getFarmConfig(farmConfig.id);
            
            console.log(`  Farm ${farmConfig.id} (${farmConfigData.name}):`);
            console.log(`    Active: ${farmConfigData.active}`);
            console.log(`    Farm Owner: ${farmConfigData.farmOwner}`);
            console.log(`    Tree Count: ${farmConfigData.treeCount}`);
            console.log(`    Target APY: ${farmConfigData.targetAPY} bps`);
            console.log(`    Maturity Period: ${farmConfigData.maturityPeriod} months`);
            console.log(`    Share Token: ${farmConfigData.shareTokenAddress}`);
            console.log(`    Created: ${new Date(Number(farmConfigData.createdTimestamp) * 1000).toISOString()}`);
            console.log(`    Maturity: ${new Date(Number(farmConfigData.maturityTimestamp) * 1000).toISOString()}`);
            
            // Get collateral info
            try {
                const collateralInfo = await mttr.getCollateralInfo(farmConfig.id);
                console.log(`    Total Collateral Value: ${ethers.formatEther(collateralInfo.totalValue)} MBT`);
                console.log(`    Valuation Per Tree: ${ethers.formatEther(collateralInfo.valuationPerTree)} MBT`);
                console.log(`    Coverage Ratio: ${collateralInfo.coverageRatio} bps`);
                console.log(`    Last Updated: ${new Date(Number(collateralInfo.lastUpdated) * 1000).toISOString()}`);
            } catch (collateralError) {
                console.log(`    Total Collateral Value: Could not retrieve`);
            }
            
            // Get yield info
            try {
                const yieldInfo = await mttr.getYieldDistribution(farmConfig.id);
                console.log(`    Total Yield: ${ethers.formatEther(yieldInfo.totalYield)} MBT`);
                console.log(`    Distributed Yield: ${ethers.formatEther(yieldInfo.distributedYield)} MBT`);
                console.log(`    Pending Yield: ${ethers.formatEther(yieldInfo.pendingYield)} MBT`);
                console.log(`    Last Distribution: ${new Date(Number(yieldInfo.lastDistribution) * 1000).toISOString()}`);
            } catch (yieldError) {
                console.log(`    Total Yield: Could not retrieve`);
            }
            
            // Get tree info
            try {
                const treeInfo = await mttr.getFarmTreeInfo(farmConfig.id);
                console.log(`    Tree Count: ${treeInfo.treeCount}`);
                console.log(`    Tree IDs: [${treeInfo.treeIds.join(', ')}]`);
                console.log(`    Total Tree Shares: ${treeInfo.totalTreeShares}`);
            } catch (treeError) {
                console.log(`    Tree Info: Could not retrieve`);
            }
        } catch (error) {
            console.log(`  Failed to get final state for farm ${farmConfig.id}:`, error.message);
        }
    }
    
    // Display bond information for all investors
    console.log("\n  Bond Positions Summary:");
    for (let i = 1; i <= 2; i++) {
        try {
            const investor = signers[`INVESTOR${i}`];
            let bondCount = 0;
            
            if (diamond) {
                try {
                    bondCount = await diamond.getUserBondCount(investor.address);
                } catch (error) {
                    console.log(`    INVESTOR${i}: Could not get bond count from diamond`);
                    continue;
                }
            } else {
                // Try to get bond count by attempting to get bond positions until we fail
                bondCount = 0;
                while (true) {
                    try {
                        await mttr.getBondPosition(investor.address, bondCount);
                        bondCount++;
                    } catch (error) {
                        break; // No more bonds
                    }
                }
            }
            
            console.log(`    INVESTOR${i} (${investor.address}): ${bondCount} bonds`);
            
            for (let bondId = 0; bondId < bondCount; bondId++) {
                try {
                    const bondPosition = await mttr.getBondPosition(investor.address, bondId);
                    console.log(`      Bond ${bondId}: Farm ${bondPosition.farmId}, Amount ${ethers.formatEther(bondPosition.depositAmount)} MBT, Redeemed: ${bondPosition.redeemed}`);
                } catch (bondError) {
                    console.log(`      Bond ${bondId}: Could not retrieve details`);
                }
            }
        } catch (error) {
            console.log(`    INVESTOR${i}: Could not retrieve bond information`);
        }
    }
    
    console.log("\nEnd-to-end interaction completed successfully!");
}

async function loadTestAccounts() {
    // Check if accounts file exists
    if (!fs.existsSync(ACCOUNTS_FILE)) {
        throw new Error(`Accounts file not found: ${ACCOUNTS_FILE}`);
    }
    
    const accountsContent = fs.readFileSync(ACCOUNTS_FILE, "utf8");
    const accounts = {};
    
    // Parse the accounts file to extract addresses and private keys
    const lines = accountsContent.split('\n');
    let currentRole = null;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;
        
        // Check if this is a role header (ends with : and no spaces)
        if (trimmedLine.endsWith(':') && !trimmedLine.includes(' ')) {
            currentRole = trimmedLine.slice(0, -1); // Remove the colon
            continue;
        }
        
        // Parse key-value pairs
        if (trimmedLine.includes(':') && currentRole) {
            const colonIndex = trimmedLine.indexOf(':');
            const key = trimmedLine.substring(0, colonIndex).trim();
            const value = trimmedLine.substring(colonIndex + 1).trim();
            
            if (key === 'Address') {
                if (!accounts[currentRole]) {
                    accounts[currentRole] = {};
                }
                accounts[currentRole].address = value;
            } else if (key === 'Private Key') {
                if (value !== 'CONFIGURED_IN_ENV' && accounts[currentRole]) {
                    accounts[currentRole].privateKey = value;
                }
            }
        }
    }
    
    // Remove DEPLOYER account and any accounts without private keys
    const filteredAccounts = {};
    for (const [role, account] of Object.entries(accounts)) {
        if (role !== 'DEPLOYER' && account.privateKey) {
            filteredAccounts[role] = account;
        }
    }
    
    return filteredAccounts;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
    });
