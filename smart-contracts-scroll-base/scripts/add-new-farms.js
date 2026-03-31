const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Configuration files
const DEPLOYMENT_FILE = "deployments/deployment-scroll-chain-534352-2025-09-26T09-14-05-430Z.txt";
const ACCOUNTS_FILE = "accounts/accounts-scrollSepolia-534351-2025-08-01T16-14-51-798Z.txt";

// Farm configurations for existing MLT tokens that need to be added to vault
const NEW_FARM_CONFIGS = [
    {
        id: 1,
        name: "Fadhila Gardens Coffee Farm",
        targetAPY: 1000, // 10% APY
        maturityPeriod: 48, // 42 months
        treeCount: 10,
        minInvestment: ethers.parseEther("0.01"), // 0.01 MBT
        maxInvestment: ethers.parseEther("80"), // 1500 MBT
        location: "Embu, Kenya",
        area: "3.2 hectares",
        soilType: "Red clay loam",
        certifications: "Organic Certified, Fair Trade, Rainforest Alliance"
    }
    
];

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

async function loadTestAccounts() {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
        throw new Error(`Accounts file not found: ${ACCOUNTS_FILE}`);
    }
    
    const accountsContent = fs.readFileSync(ACCOUNTS_FILE, "utf8");
    const accounts = {};
    
    const lines = accountsContent.split('\n');
    let currentRole = null;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;
        
        if (trimmedLine.endsWith(':') && !trimmedLine.includes(' ')) {
            currentRole = trimmedLine.slice(0, -1);
            continue;
        }
        
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
    
    const filteredAccounts = {};
    for (const [role, account] of Object.entries(accounts)) {
        if (role !== 'DEPLOYER' && account.privateKey) {
            filteredAccounts[role] = account;
        }
    }
    
    return filteredAccounts;
}

async function saveAccountToFile(farmId, address, privateKey) {
    const accountEntry = `
FARMOWNER${farmId}:
Address: ${address}
Private Key: ${privateKey}
`;
    
    try {
        // Append to the accounts file
        fs.appendFileSync(ACCOUNTS_FILE, accountEntry);
        console.log(`   📝 Account FARMOWNER${farmId} saved to ${ACCOUNTS_FILE}`);
    } catch (error) {
        console.log(`   ❌ Failed to save account to file: ${error.message}`);
        // Also log the account info to console as backup
        console.log(`   📋 Account info (manual backup):`);
        console.log(`   FARMOWNER${farmId}:`);
        console.log(`   Address: ${address}`);
        console.log(`   Private Key: ${privateKey}`);
    }
}

async function main() {
    console.log("Add Existing Farms to Vault Script");
    console.log("==================================\n");

    // Load deployment information
    const deployment = await loadDeploymentInfo();
    const mttrAddress = deployment.MochaTreeRightsToken;
    const mltAddress = deployment.MochaLandToken;
    const mttAddress = deployment.MochaTreeToken;
    const diamondAddress = deployment.TreeFarmDiamond;
    
    if (!mttrAddress || !mltAddress || !mttAddress) {
        throw new Error("Missing required contract addresses in deployment file");
    }

    console.log("Contract Addresses:");
    console.log("  MTTR (Vault):", mttrAddress);
    console.log("  MLT (Land):", mltAddress);
    console.log("  MTT (Tree):", mttAddress);
    if (diamondAddress) {
        console.log("  Diamond:", diamondAddress);
    }
    console.log("");

    // Load test accounts
    const accounts = await loadTestAccounts();
    
    // Setup deployer signer
    const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
    
    // Create contract instances
    const mttr = await ethers.getContractAt("MochaTreeRightsToken", mttrAddress);
    const mlt = await ethers.getContractAt("MochaLandToken", mltAddress);
    const mtt = await ethers.getContractAt("MochaTreeToken", mttAddress);
    const diamond = diamondAddress ? await ethers.getContractAt("TreeFarmDiamond", diamondAddress) : null;

    // Create signers for farm owners
    const signers = {};
    for (const [role, account] of Object.entries(accounts)) {
        signers[role] = new ethers.Wallet(account.privateKey, deployer.provider);
    }

    console.log(`Processing ${NEW_FARM_CONFIGS.length} existing farm(s) for vault addition...\n`);

    // Process each new farm
    for (const farmConfig of NEW_FARM_CONFIGS) {
        console.log(`Processing Farm ${farmConfig.id}: ${farmConfig.name}`);
        console.log("=" .repeat(50));

        try {
            // STEP 1: Check if MLT token already exists and get the actual owner
            console.log("STEP 1: Checking MLT token existence and ownership...");
            let existingOwner = ethers.ZeroAddress;
            try {
                existingOwner = await mlt.ownerOf(farmConfig.id);
                if (existingOwner !== ethers.ZeroAddress) {
                    console.log(`   ⚠️  MLT token ${farmConfig.id} already exists, owned by ${existingOwner}`);
                } else {
                    console.log(`   MLT token ${farmConfig.id} does not exist, will mint new token`);
                }
            } catch (error) {
                console.log(`   MLT token ${farmConfig.id} does not exist (error: ${error.message})`);
            }

            // Find the farm owner from the accounts file
            let farmOwner = null;
            let farmOwnerKey = null;
            
            // First try to find the exact FARMOWNER account
            const expectedFarmOwnerKey = `FARMOWNER${farmConfig.id}`;
            if (signers[expectedFarmOwnerKey]) {
                farmOwner = signers[expectedFarmOwnerKey];
                farmOwnerKey = expectedFarmOwnerKey;
                console.log(`   Found expected farm owner: ${farmOwnerKey} (${farmOwner.address})`);
            } else {
                // If MLT token exists, find the actual owner in the accounts file
                if (existingOwner !== ethers.ZeroAddress) {
                    for (const [role, signer] of Object.entries(signers)) {
                        if (signer.address.toLowerCase() === existingOwner.toLowerCase()) {
                            farmOwner = signer;
                            farmOwnerKey = role;
                            console.log(`   Found actual MLT owner: ${farmOwnerKey} (${farmOwner.address})`);
                            break;
                        }
                    }
                }
                
                // If still not found, create a new account dynamically
                if (!farmOwner) {
                    console.log(`   ⚠️  Could not find farm owner for farm ${farmConfig.id}`);
                    console.log(`   MLT token owner: ${existingOwner}`);
                    console.log(`   Available accounts: ${Object.keys(signers).join(', ')}`);
                    
                    // Create a new account dynamically
                    console.log(`   🔧 Creating new account for farm ${farmConfig.id}...`);
                    const newWallet = ethers.Wallet.createRandom();
                    farmOwner = newWallet.connect(ethers.provider);
                    farmOwnerKey = `FARMOWNER${farmConfig.id}`;
                    
                    console.log(`   ✅ Created new account: ${farmOwnerKey} (${farmOwner.address})`);
                    console.log(`   Private Key: ${newWallet.privateKey}`);
                    
                    // Save the new account to the accounts file
                    try {
                        await saveAccountToFile(farmConfig.id, farmOwner.address, newWallet.privateKey);
                        console.log(`   📝 Account saved to accounts file`);
                    } catch (error) {
                        console.log(`   ⚠️  Failed to save account to file: ${error.message}`);
                        console.log(`   Account info (manual backup):`);
                        console.log(`   FARMOWNER${farmConfig.id}:`);
                        console.log(`   Address: ${farmOwner.address}`);
                        console.log(`   Private Key: ${newWallet.privateKey}`);
                    }
                    
                    // Fund the new account with some ETH for gas
                    const fundingAmount = ethers.parseEther("0.0005"); // 0.01 ETH
                    try {
                        const fundingTx = await deployer.sendTransaction({
                            to: farmOwner.address,
                            value: fundingAmount
                        });
                        await fundingTx.wait();
                        console.log(`   💰 Funded new account with ${ethers.formatEther(fundingAmount)} ETH`);
                    } catch (error) {
                        console.log(`   ❌ Failed to fund new account: ${error.message}`);
                        console.log(`   Skipping farm ${farmConfig.id}\n`);
                        continue;
                    }
                }
            }

            // STEP 2: Verify MLT token ownership
            console.log("STEP 2: Verifying MLT token ownership...");
            if (existingOwner !== ethers.ZeroAddress) {
                if (existingOwner.toLowerCase() !== farmOwner.address.toLowerCase()) {
                    console.log(`   ⚠️  MLT token is not owned by the selected farm owner`);
                    console.log(`   MLT owner: ${existingOwner}`);
                    console.log(`   Selected owner: ${farmOwner.address}`);
                    console.log(`   This might cause issues with vault registration`);
                } else {
                    console.log(`   ✅ MLT token ownership verified`);
                }
            } else {
                console.log(`   ℹ️  MLT token does not exist yet, will be minted to ${farmOwner.address}`);
            }

            // STEP 3: Mint MLT token if it doesn't exist
            if (existingOwner === ethers.ZeroAddress) {
                console.log("STEP 3: Minting MLT token...");
                try {
                    const landMetadata = {
                        name: farmConfig.name,
                        description: `A coffee farm specializing in ${farmConfig.name.toLowerCase()}`,
                        farmInfo: {
                            name: farmConfig.name,
                            location: farmConfig.location,
                            area: farmConfig.area,
                            soilType: farmConfig.soilType
                        },
                        imageURI: "https://gainforest.app/080b9d6e7488da550a6488da0fdad1997ded06354d844a586ae57365d5840af7?overlay-active-tab=layers&layers-historical-satellite-date=2025-04&search-q=pro&project-site-id=83992c08-c4d9-425d-8342-6e94cf56c5d3&project-views=",
                        externalURL: "https://gainforest.app/080b9d6e7488da550a6488da0fdad1997ded06354d844a586ae57365d5840af7?overlay-active-tab=layers&layers-historical-satellite-date=2025-04&search-q=pro&project-site-id=83992c08-c4d9-425d-8342-6e94cf56c5d3&project-views="
                    };
                    
                    const tx = await mlt.connect(deployer).mint(
                        farmOwner.address,
                        landMetadata,
                        farmConfig.certifications
                    );
                    await tx.wait();
                    console.log(`   ✅ MLT token ${farmConfig.id} minted to ${farmOwner.address}`);
                } catch (error) {
                    console.log(`   ❌ Failed to mint MLT token: ${error.message}`);
                    console.log(`   Skipping farm ${farmConfig.id}\n`);
                    continue;
                }
            } else {
                console.log("STEP 3: MLT token already exists, skipping minting");
            }

            // STEP 4: Check and mint MTT tokens
            console.log("STEP 4: Checking MTT tokens...");
            let mintedTreeCount = 0;
            // Determine the MLT token-bound account (TBA) to receive trees
            let tbaRecipient = farmOwner.address;
            console.log(`   🔍 Attempting to resolve MLT wallet account for farm ${farmConfig.id}...`);
            console.log(`   📍 Farm owner address: ${farmOwner.address}`);
            console.log(`   📍 MLT contract address: ${await mlt.getAddress()}`);
            
            try {
                console.log(`   🔍 Checking MLT contract methods...`);
                console.log(`   - getAccount method exists: ${typeof mlt.getAccount === 'function'}`);
                console.log(`   - accountOf method exists: ${typeof mlt.accountOf === 'function'}`);
                
                // Try to resolve TBA from MLT directly if function exists
                if (typeof mlt.getAccount === 'function') {
                    console.log(`   🔍 Trying mlt.getAccount(${farmConfig.id})...`);
                    const acc = await mlt.getAccount(farmConfig.id);
                    console.log(`   📍 getAccount result: ${acc}`);
                    if (acc && acc !== ethers.ZeroAddress) {
                        tbaRecipient = acc;
                        console.log(`   ✅ Found TBA via getAccount: ${tbaRecipient}`);
                    }
                } else if (typeof mlt.accountOf === 'function') {
                    console.log(`   🔍 Trying mlt.accountOf(${farmConfig.id})...`);
                    const acc = await mlt.accountOf(farmConfig.id);
                    console.log(`   📍 accountOf result: ${acc}`);
                    if (acc && acc !== ethers.ZeroAddress) {
                        tbaRecipient = acc;
                        console.log(`   ✅ Found TBA via accountOf: ${tbaRecipient}`);
                    }
                } else {
                    console.log(`   🔍 MLT direct methods not available, trying ERC6551 registry...`);
                    // Derive via ERC6551 registry if available in deployment
                    const deploymentJson = await loadDeploymentInfo();
                    console.log(`   📍 Deployment JSON loaded`);
                    
                    const registryAddr = deploymentJson.ERC6551Registry || deploymentJson.utilities?.ERC6551Registry;
                    const implAddr = deploymentJson.ERC6551AccountImplementation || deploymentJson.utilities?.ERC6551AccountImplementation;
                    
                    console.log(`   📍 Registry address: ${registryAddr}`);
                    console.log(`   📍 Implementation address: ${implAddr}`);
                    
                    if (registryAddr && implAddr) {
                        const chain = (await ethers.provider.getNetwork()).chainId;
                        console.log(`   📍 Chain ID: ${chain}`);
                        console.log(`   📍 MLT address: ${await mlt.getAddress()}`);
                        console.log(`   📍 Farm ID: ${farmConfig.id}`);
                        
                        // Use ERC6551Registry ABI, not mock, and correct param order: (impl, salt, chainId, tokenContract, tokenId)
                        const registry = await ethers.getContractAt("ERC6551Registry", registryAddr);
                        console.log(`   🔍 Registry contract (ERC6551Registry) loaded at ${registryAddr}`);
                        
                        const salt = ethers.ZeroHash; // bytes32(0)
                        const tokenContract = await mlt.getAddress();
                        const tokenId = farmConfig.id;
                        console.log(`   🔍 Calling registry.account(impl=${implAddr}, salt=${salt}, chainId=${chain}, tokenContract=${tokenContract}, tokenId=${tokenId})...`);
                        const derived = await registry.account(implAddr, salt, chain, tokenContract, tokenId);
                        console.log(`   📍 Registry account result: ${derived}`);
                        
                        if (derived && derived !== ethers.ZeroAddress) {
                            tbaRecipient = derived;
                            console.log(`   ✅ Found TBA via registry: ${tbaRecipient}`);
                        } else {
                            console.log(`   ⚠️  Registry returned zero address`);
                        }
                    } else {
                        console.log(`   ⚠️  Registry or implementation address not found in deployment`);
                    }
                }
                console.log(`   📦 Final TBA recipient: ${tbaRecipient}`);
            } catch (e) {
                console.log(`   ❌ Error resolving MLT wallet account: ${e.message}`);
                console.log(`   📍 Error details: ${e.toString()}`);
                console.log(`   ⚠️  Defaulting to farm owner: ${farmOwner.address}`);
            }
            for (let i = 1; i <= farmConfig.treeCount; i++) {
                try {
                    const existingBalance = await mtt.subBalanceOf(tbaRecipient, farmConfig.id, i);
                    if (existingBalance > 0) {
                        console.log(`   MTT token (farm ${farmConfig.id}, tree ${i}) already exists with balance ${existingBalance}`);
                    } else {
                        await mtt.connect(deployer).mint(tbaRecipient, farmConfig.id, i, 1);
                        mintedTreeCount++;
                        console.log(`   ✅ MTT token (farm ${farmConfig.id}, tree ${i}) minted`);
                    }
                } catch (error) {
                    console.log(`   ❌ Failed to mint MTT token (farm ${farmConfig.id}, tree ${i}): ${error.message}`);
                }
            }
            console.log(`   ${mintedTreeCount} new MTT tokens minted for farm ${farmConfig.id}`);

            // STEP 5: Check farm owner ETH balance and ensure sufficient funds
            console.log("STEP 5: Checking farm owner ETH balance...");
            const farmOwnerBalance = await ethers.provider.getBalance(farmOwner.address);
            console.log(`   Farm owner balance: ${ethers.formatEther(farmOwnerBalance)} ETH`);
            
            // If balance is too low, transfer some ETH
            const minRequiredBalance = ethers.parseEther("0.005"); // 0.005 ETH minimum
            if (farmOwnerBalance < minRequiredBalance) {
                console.log("   ⚠️  Farm owner has insufficient ETH, transferring funds...");
                const transferAmount = ethers.parseEther("0.01");
                try {
                    const ethTransferTx = await deployer.sendTransaction({
                        to: farmOwner.address,
                        value: transferAmount
                    });
                    await ethTransferTx.wait();
                    console.log(`   ✅ Transferred ${ethers.formatEther(transferAmount)} ETH to ${farmOwner.address}`);
                    
                    // Wait a moment for the transaction to be processed
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Check new balance
                    const newBalance = await ethers.provider.getBalance(farmOwner.address);
                    console.log(`   New balance: ${ethers.formatEther(newBalance)} ETH`);
                } catch (ethTransferError) {
                    console.log(`   ❌ Failed to transfer ETH: ${ethTransferError.message}`);
                }
            } else {
                console.log("   ✅ Farm owner has sufficient ETH balance");
            }

            // STEP 6: Check if farm already exists in vault
            console.log("STEP 6: Checking vault for existing farm...");
            let existingFarm = null;
            let farmExistsInVault = false;
            try {
                existingFarm = await mttr.getFarmConfig(farmConfig.id);
                if (existingFarm.farmOwner !== ethers.ZeroAddress) {
                    console.log(`   ⚠️  Farm ${farmConfig.id} already exists in vault`);
                    console.log(`   Farm Name: ${existingFarm.name}`);
                    console.log(`   Farm Owner: ${existingFarm.farmOwner}`);
                    console.log(`   Active: ${existingFarm.active}`);
                    farmExistsInVault = true;
                } else {
                    console.log(`   Farm ${farmConfig.id} not yet in vault, proceeding with addition`);
                }
            } catch (farmError) {
                console.log(`   Farm ${farmConfig.id} not yet in vault (error: ${farmError.message})`);
            }

            // STEP 7: Add farm to vault if it doesn't exist (admin-only)
            if (!farmExistsInVault) {
                console.log("STEP 7: Adding farm to vault...");
                // Verify tree balances for the intended farm token-bound account (TBA)
                try {
                    const subCount = await mtt.subIdBalanceOf(tbaRecipient, farmConfig.id);
                    console.log(`   🔎 subIdBalanceOf(TBA=${tbaRecipient}, farmId=${farmConfig.id}) = ${subCount}`);
                } catch (e) {
                    console.log(`   ⚠️  Could not read subIdBalanceOf for TBA ${tbaRecipient}: ${e.message}`);
                }
                try {
                    // Admin (deployer) performs the addFarm call; farmOwner is used as TBA account
                    const tx = await mttr.connect(deployer).addFarm(
                        farmConfig.id,
                        farmConfig.name,
                        tbaRecipient, // farmTokenBoundAccount must be the ERC6551 TBA holding MTT
                        farmConfig.targetAPY,
                        farmConfig.maturityPeriod,
                        `${farmConfig.name} Share Token`,
                        `FST${farmConfig.id}`
                    );
                    await tx.wait();
                    console.log(`   ✅ Farm ${farmConfig.id} added to vault successfully`);
                    
                    // Optionally set investment limits if provided in config
                    if (farmConfig.minInvestment !== undefined && farmConfig.maxInvestment !== undefined) {
                        try {
                            const limitsTx = await mttr
                                .connect(deployer)
                                .updateFarmInvestmentLimits(
                                    farmConfig.id,
                                    farmConfig.minInvestment,
                                    farmConfig.maxInvestment
                                );
                            await limitsTx.wait();
                            console.log(`   🔧 Set investment limits: min=${ethers.formatEther(farmConfig.minInvestment)} MBT, max=${ethers.formatEther(farmConfig.maxInvestment)} MBT`);
                        } catch (limitsErr) {
                            console.log(`   ⚠️  Failed to set investment limits: ${limitsErr.message}`);
                        }
                    }

                    // Verify farm addition
                    const farmConfigData = await mttr.getFarmConfig(farmConfig.id);
                    console.log(`   Farm Name: ${farmConfigData.name}`);
                    console.log(`   Farm Owner: ${farmConfigData.farmOwner}`);
                    console.log(`   Target APY: ${farmConfigData.targetAPY} bps`);
                    console.log(`   Active: ${farmConfigData.active}`);
                    console.log(`   Share Token: ${farmConfigData.shareTokenAddress}`);
                } catch (error) {
                    console.log(`   ❌ Failed to add farm to vault: ${error.message}`);
                    
                    // Check if error is due to insufficient funds
                    if (error.message.includes("insufficient funds")) {
                        console.log("   ⚠️  Farm owner has insufficient funds for gas, transferring ETH...");
                        
                        // Check current balance
                        const currentBalance = await ethers.provider.getBalance(farmOwner.address);
                        console.log(`   Current balance: ${ethers.formatEther(currentBalance)} ETH`);
                        
                        // Transfer ETH to farm owner (0.01 ETH should be enough for gas)
                        const transferAmount = ethers.parseEther("0.01");
                        try {
                            const ethTransferTx = await deployer.sendTransaction({
                                to: farmOwner.address,
                                value: transferAmount
                            });
                            await ethTransferTx.wait();
                            console.log(`   ✅ Transferred ${ethers.formatEther(transferAmount)} ETH to ${farmOwner.address}`);
                            
                            // Wait a moment for the transaction to be processed
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // Try adding farm to vault again (admin-only)
                            console.log("   Retrying farm addition with ETH transfer...");
                            const retryTx = await mttr.connect(deployer).addFarm(
                                farmConfig.id,
                                farmConfig.name,
                                tbaRecipient, // farmTokenBoundAccount must be the ERC6551 TBA holding MTT
                                farmConfig.targetAPY,
                                farmConfig.maturityPeriod,
                                `${farmConfig.name} Share Token`,
                                `FST${farmConfig.id}`
                            );
                            await retryTx.wait();
                            console.log(`   ✅ Farm ${farmConfig.id} added to vault successfully after ETH transfer!`);
                            
                            // Verify farm addition
                            const farmConfigData = await mttr.getFarmConfig(farmConfig.id);
                            console.log(`   Farm Name: ${farmConfigData.name}`);
                            console.log(`   Farm Owner: ${farmConfigData.farmOwner}`);
                            console.log(`   Target APY: ${farmConfigData.targetAPY} bps`);
                            console.log(`   Active: ${farmConfigData.active}`);
                            console.log(`   Share Token: ${farmConfigData.shareTokenAddress}`);
                            
                        } catch (ethTransferError) {
                            console.log(`   ❌ Failed to transfer ETH: ${ethTransferError.message}`);
                        }
                    }
                    // Check if error is due to owner already having a farm
                    else if (error.message.includes("owner has farm")) {
                        console.log("   ⚠️  Owner already has a farm in vault, trying alternative approaches...");
                        
                        // First, let's try to add the farm to vault first before transferring tokens
                        console.log("   Attempting to add farm to vault before token transfer...");
                        try {
                            const preTransferTx = await mttr.connect(deployer).addFarm(
                                farmConfig.id,
                                farmConfig.name,
                                tbaRecipient, // farmTokenBoundAccount must be the ERC6551 TBA holding MTT
                                farmConfig.targetAPY,
                                farmConfig.maturityPeriod,
                                `${farmConfig.name} Share Token`,
                                `FST${farmConfig.id}`
                            );
                            await preTransferTx.wait();
                            console.log(`   ✅ Farm ${farmConfig.id} added to vault successfully before transfer!`);
                            
                            // Verify farm addition
                            const farmConfigData = await mttr.getFarmConfig(farmConfig.id);
                            console.log(`   Farm Name: ${farmConfigData.name}`);
                            console.log(`   Farm Owner: ${farmConfigData.farmOwner}`);
                            console.log(`   Target APY: ${farmConfigData.targetAPY} bps`);
                            console.log(`   Active: ${farmConfigData.active}`);
                            console.log(`   Share Token: ${farmConfigData.shareTokenAddress}`);
                            
                            // If successful, we don't need to transfer tokens
                            continue;
                            
                        } catch (preTransferError) {
                            console.log(`   ❌ Pre-transfer vault addition failed: ${preTransferError.message}`);
                            console.log("   Proceeding with token transfer approach...");
                        }
                        
                        console.log("   Generating new account and transferring tokens...");
                        
                        // Generate a new account for this farm
                        const newAccount = ethers.Wallet.createRandom();
                        const newAccountSigner = newAccount.connect(ethers.provider);
                        
                        console.log(`   Generated new account: ${newAccount.address}`);
                        
                        // Transfer MLT token to new account
                        try {
                            const transferTx = await mlt.connect(farmOwner).transferFrom(
                                farmOwner.address,
                                newAccount.address,
                                farmConfig.id
                            );
                            await transferTx.wait();
                            console.log(`   ✅ MLT token ${farmConfig.id} transferred to ${newAccount.address}`);
                            
                            // Transfer MTT tokens (trees) to new account
                            console.log("   Transferring MTT tokens to new account...");
                            let transferredTrees = 0;
                            for (let i = 1; i <= farmConfig.treeCount; i++) {
                                try {
                                    const treeBalance = await mtt.subBalanceOf(farmOwner.address, farmConfig.id, i);
                                    if (treeBalance > 0) {
                                        const treeTransferTx = await mtt.connect(farmOwner).transfer(
                                            farmOwner.address,
                                            newAccount.address,
                                            farmConfig.id,
                                            i,
                                            treeBalance
                                        );
                                        await treeTransferTx.wait();
                                        transferredTrees++;
                                        console.log(`   ✅ MTT token (farm ${farmConfig.id}, tree ${i}) transferred`);
                                    }
                                } catch (treeError) {
                                    console.log(`   ⚠️  Could not transfer MTT token (farm ${farmConfig.id}, tree ${i}): ${treeError.message}`);
                                }
                            }
                            console.log(`   ${transferredTrees} MTT tokens transferred to new account`);
                            
                            // Save new account info to accounts file
                            await saveAccountToFile(farmConfig.id, newAccount.address, newAccount.privateKey);
                            console.log(`   ✅ New account saved to accounts file as FARMOWNER${farmConfig.id}`);
                            
                            // Update farm owner reference
                            farmOwner = newAccountSigner;
                            farmOwnerKey = `FARMOWNER${farmConfig.id}`;
                            
                            // Try adding farm to vault again with new owner
                            console.log("   Retrying farm addition with new owner...");
                            const retryTx = await mttr.connect(deployer).addFarm(
                                farmConfig.id,
                                farmConfig.name,
                                tbaRecipient, // farmTokenBoundAccount must be the ERC6551 TBA holding MTT
                                farmConfig.targetAPY,
                                farmConfig.maturityPeriod,
                                `${farmConfig.name} Share Token`,
                                `FST${farmConfig.id}`
                            );
                            await retryTx.wait();
                            console.log(`   ✅ Farm ${farmConfig.id} added to vault successfully with new owner`);
                            
                            // Verify farm addition
                            const farmConfigData = await mttr.getFarmConfig(farmConfig.id);
                            console.log(`   Farm Name: ${farmConfigData.name}`);
                            console.log(`   Farm Owner: ${farmConfigData.farmOwner}`);
                            console.log(`   Target APY: ${farmConfigData.targetAPY} bps`);
                            console.log(`   Active: ${farmConfigData.active}`);
                            console.log(`   Share Token: ${farmConfigData.shareTokenAddress}`);
                            
                        } catch (transferError) {
                            console.log(`   ❌ Failed to transfer tokens: ${transferError.message}`);
                        }
                    }
                }
            } else {
                console.log("STEP 7: Farm already exists in vault, skipping addition");
            }

            console.log(`✅ Farm ${farmConfig.id} processing completed successfully!\n`);

        } catch (error) {
            console.log(`❌ Error processing farm ${farmConfig.id}: ${error.message}`);
            console.log(`   Skipping to next farm...\n`);
        }
    }

    console.log("Farm vault addition script completed!");
    console.log("====================================");
    
    // Summary
    console.log("\nSummary:");
    console.log("========");
    for (const farmConfig of NEW_FARM_CONFIGS) {
        try {
            const farmOwnerKey = `FARMOWNER${farmConfig.id}`;
            if (signers[farmOwnerKey]) {
                const mltOwner = await mlt.ownerOf(farmConfig.id);
                const farmConfigData = await mttr.getFarmConfig(farmConfig.id);
                
                console.log(`Farm ${farmConfig.id} (${farmConfig.name}):`);
                console.log(`  MLT Owner: ${mltOwner}`);
                console.log(`  Vault Owner: ${farmConfigData.farmOwner}`);
                console.log(`  Active: ${farmConfigData.active}`);
            }
        } catch (error) {
            console.log(`Farm ${farmConfig.id}: Could not retrieve status`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
    });
