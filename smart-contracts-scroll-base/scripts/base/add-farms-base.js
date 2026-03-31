const { ethers } = require("hardhat");
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Network detection
const network = hre.network.name;
const isBaseSepolia = network === "baseSepolia";
const isBaseMainnet = network === "base";

if (!isBaseSepolia && !isBaseMainnet) {
  throw new Error("This script is only for Base networks. Use --network baseSepolia or --network base");
}

// Find the most recent deployment file for the current network
function findLatestDeploymentFile() {
  const deploymentsDir = path.join(__dirname, "../../deployments");
  const baseDir = path.join(deploymentsDir, "base");
  
  // Check both deployments/ and deployments/base/
  const searchDirs = [deploymentsDir];
  if (fs.existsSync(baseDir)) {
    searchDirs.push(baseDir);
  }
  
  let allFiles = [];
  
  for (const searchDir of searchDirs) {
    if (fs.existsSync(searchDir)) {
      const files = fs.readdirSync(searchDir)
        .filter(file => {
          const isBaseFile = file.startsWith("deployment-base");
          const isTxtFile = file.endsWith(".txt");
          const matchesNetwork = isBaseSepolia 
            ? file.includes("baseSepolia") || file.includes("84532")
            : file.includes("base") && !file.includes("baseSepolia");
          return isBaseFile && isTxtFile && matchesNetwork;
        })
        .map(file => ({
          name: file,
          path: path.join(searchDir, file),
          time: fs.statSync(path.join(searchDir, file)).mtime
        }));
      
      allFiles = allFiles.concat(files);
    }
  }
  
  if (allFiles.length === 0) {
    throw new Error(`No deployment files found for ${network}. Please deploy contracts first.`);
  }
  
  // Sort by time and return most recent
  allFiles.sort((a, b) => b.time - a.time);
  return allFiles[0].path;
}

// Tree tracking: 2,000 total trees, 410 used on Scroll, starting from 411 for Base
const TREE_START_ID = 411; // Start from tree 411 (after Scroll's 410 trees)
const TOTAL_TOKENIZED_TREES = 2000;
const SCROLL_TREES_USED = 410;
const BASE_TREES_AVAILABLE = TOTAL_TOKENIZED_TREES - SCROLL_TREES_USED; // 1,590 trees available

// Farm configurations for Base networks
const FARM_CONFIGS = [
  {
    id: 1,
    name: isBaseMainnet ? "Base Mainnet Farm" : "Base Sepolia Test Farm",
    targetAPY: 1000, // 10% APY (in basis points)
    maturityPeriod: 48, // 48 months
    treeCount: 10, // Using 10 trees from the tokenized pool (trees 411-420)
    minInvestment: ethers.parseEther("0.04"), // 0.04 MBT = $1
    maxInvestment: ethers.parseEther("80"), // 80 MBT
    farmCap: ethers.parseEther("1000"), // 1000 MBT total cap
    bondValue: ethers.parseEther("100"), // $100 per bond
    collateralRatio: 15000, // 150% (15000 basis points)
    startTreeId: TREE_START_ID, // Start from tree 411
  }
];

async function loadDeploymentInfo() {
  const deploymentFile = findLatestDeploymentFile();
  console.log(`📂 Loading deployment from: ${deploymentFile}`);
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  
  const deploymentContent = fs.readFileSync(deploymentFile, "utf8");
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

async function main() {
  console.log("🌾 Add Farms to Base Network");
  console.log("============================\n");
  console.log(`Network: ${network}`);
  console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}\n`);

  // Load deployment information
  const deployment = await loadDeploymentInfo();
  const diamondAddress = deployment.TreeFarmDiamond || deployment.diamond;
  
  if (!diamondAddress) {
    throw new Error("Diamond contract address not found in deployment file");
  }

  console.log("Contract Addresses:");
  console.log("  Diamond:", diamondAddress);
  console.log("");

  // Setup deployer signer
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not set in .env file");
  }
  
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
  console.log("Deployer address:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");
  
  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Insufficient ETH balance. Please fund the deployer wallet.");
  }

  // Get contract addresses
  const mltAddress = deployment.MochaLandToken;
  const mttAddress = deployment.MochaTreeToken;
  const registryAddress = deployment.ERC6551Registry;
  const implAddress = deployment.ERC6551AccountImplementation;
  
  if (!mltAddress || !mttAddress) {
    throw new Error("MLT or MTT contract addresses not found in deployment file");
  }
  
  console.log("Token Contract Addresses:");
  console.log("  MLT (Land):", mltAddress);
  console.log("  MTT (Tree):", mttAddress);
  if (registryAddress) console.log("  ERC6551 Registry:", registryAddress);
  console.log("");

  // Get contract instances - using full ABI from artifacts
  const DIAMOND_FACET_ABI = [
    "function addFarmToVault(uint256 farmId, address farmTokenBoundAccount, uint256 targetAPY, uint256 maturityPeriod, string memory farmName, string memory shareTokenName, string memory shareTokenSymbol) external returns (uint256)",
    "function getActiveFarmIds() external view returns (uint256[] memory)",
    "function getFarmConfig(uint256 farmId) external view returns (tuple(address farmOwner, uint256 treeCount, uint256 targetAPY, bool active, uint256 bondValue, uint256 collateralRatio, uint256 createdTimestamp, uint256 maturityPeriod, uint256 maxInvestment, uint256 minInvestment, uint256 farmCap, string name, address shareTokenAddress, string shareTokenSymbol, string shareTokenName))",
  ];
  
  const MTT_ABI = [
    "function mint(address to, uint256 farmId, uint256 treeId, uint256 amount) external",
    "function subBalanceOf(address account, uint256 farmId, uint256 treeId) external view returns (uint256)",
    "function subIdBalanceOf(address account, uint256 farmId) external view returns (uint256)",
    "function owner() external view returns (address)",
    "function TreeManager() external view returns (address)",
  ];
  
  // MLT uses a struct for metadata
  const MLT_ABI = [
    "function mint(address to, tuple(string name, string description, tuple(string name, string location, string area, string soilType) farmInfo, string imageURI, string externalURL) metadata, string certifications) external returns (uint256)",
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function getAccount(uint256 tokenId) external view returns (address)",
    "function accountOf(uint256 tokenId) external view returns (address)",
    "function owner() external view returns (address)",
  ];
  
  const ERC6551_REGISTRY_ABI = [
    "function account(address implementation, bytes32 salt, uint256 chainId, address tokenContract, uint256 tokenId) external view returns (address)",
  ];
  
  // Get MTTR vault address
  const mttrVaultAddress = deployment.MochaTreeRightsToken || deployment.mttrVault;
  if (!mttrVaultAddress) {
    throw new Error("MTTR vault address not found in deployment file");
  }
  
  const MTTR_ABI = [
    "function addFarm(uint256 farmId, string memory farmName, address farmTokenBoundAccount, uint256 targetAPY, uint256 maturityPeriod, string memory shareTokenName, string memory shareTokenSymbol) external returns (uint256)",
    "function grantRole(bytes32 role, address account) external",
    "function hasRole(bytes32 role, address account) external view returns (bool)",
    "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
    "function getActiveFarmIds() external view returns (uint256[] memory)",
    "function getFarmConfig(uint256 farmId) external view returns (tuple(address farmOwner, uint256 treeCount, uint256 targetAPY, bool active, uint256 bondValue, uint256 collateralRatio, uint256 createdTimestamp, uint256 maturityPeriod, uint256 maxInvestment, uint256 minInvestment, uint256 farmCap, string name, address shareTokenAddress, string shareTokenSymbol, string shareTokenName))",
  ];
  
  const VAULT_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VAULT_MANAGER_ROLE"));
  
  const diamond = new ethers.Contract(diamondAddress, DIAMOND_FACET_ABI, deployer);
  const mttrVault = new ethers.Contract(mttrVaultAddress, MTTR_ABI, deployer);
  const mlt = new ethers.Contract(mltAddress, MLT_ABI, deployer);
  const mtt = new ethers.Contract(mttAddress, MTT_ABI, deployer);
  
  let registry = null;
  if (registryAddress) {
    registry = new ethers.Contract(registryAddress, ERC6551_REGISTRY_ABI, deployer);
  }
  
  // Check and grant vault manager role if needed
  console.log("Checking vault manager permissions...");
  const hasVaultManagerRole = await mttrVault.hasRole(VAULT_MANAGER_ROLE, deployer.address);
  const adminRole = await mttrVault.DEFAULT_ADMIN_ROLE();
  const isAdmin = await mttrVault.hasRole(adminRole, deployer.address);
  
  if (!hasVaultManagerRole && isAdmin) {
    console.log("Granting VAULT_MANAGER_ROLE to deployer...");
    try {
      const tx = await mttrVault.grantRole(VAULT_MANAGER_ROLE, deployer.address);
      await tx.wait();
      console.log("✅ VAULT_MANAGER_ROLE granted to deployer\n");
    } catch (error) {
      console.log(`⚠️  Could not grant role: ${error.message}`);
      console.log("   Will attempt to use MTTR vault directly...\n");
    }
  } else if (hasVaultManagerRole) {
    console.log("✅ Deployer already has VAULT_MANAGER_ROLE\n");
  } else {
    console.log(`⚠️  Deployer does not have VAULT_MANAGER_ROLE or ADMIN_ROLE`);
    console.log(`   Will attempt to use MTTR vault directly (may fail if permissions not set)\n`);
  }
  
  // Check if deployer is MLT owner (needed for minting)
  const mltOwner = await mlt.owner();
  const isMltOwner = mltOwner.toLowerCase() === deployer.address.toLowerCase();
  if (!isMltOwner) {
    console.log(`⚠️  WARNING: Deployer (${deployer.address}) is not MLT owner (${mltOwner})`);
    console.log(`   MLT minting may fail. Please ensure deployer has minting permissions.\n`);
  }

  console.log(`Processing ${FARM_CONFIGS.length} farm(s)...\n`);

  // Process each farm
  for (const farmConfig of FARM_CONFIGS) {
    console.log(`Processing Farm ${farmConfig.id}: ${farmConfig.name}`);
    console.log("=".repeat(50));

    try {
      // Check if farm already exists
      console.log("STEP 1: Checking if farm already exists...");
      let farmExists = false;
      try {
        const activeFarmIds = await mttrVault.getActiveFarmIds();
        if (activeFarmIds.includes(BigInt(mltTokenId))) {
          const existingFarm = await mttrVault.getFarmConfig(mltTokenId);
          if (existingFarm.farmOwner !== ethers.ZeroAddress) {
            farmExists = true;
            console.log(`   ⚠️  Farm ${farmConfig.id} already exists`);
            console.log(`   Farm Name: ${existingFarm.name}`);
            console.log(`   Farm Owner: ${existingFarm.farmOwner}`);
            console.log(`   Active: ${existingFarm.active}`);
            console.log(`   Skipping...\n`);
            continue;
          }
        }
      } catch (error) {
        console.log(`   Farm ${farmConfig.id} does not exist yet`);
      }

      if (!farmExists) {
        // Use deployer as farm owner for testnet
        const farmOwner = deployer.address;
        
        // STEP 2: Mint MLT token if needed
        console.log("STEP 2: Checking/Minting MLT token...");
        let mltTokenId = farmConfig.id;
        let existingMltOwner = ethers.ZeroAddress;
        
        try {
          existingMltOwner = await mlt.ownerOf(mltTokenId);
          if (existingMltOwner !== ethers.ZeroAddress) {
            console.log(`   ⚠️  MLT token ${mltTokenId} already exists, owned by ${existingMltOwner}`);
            if (existingMltOwner.toLowerCase() !== farmOwner.toLowerCase()) {
              console.log(`   ⚠️  MLT owner mismatch. Expected: ${farmOwner}, Got: ${existingMltOwner}`);
              console.log(`   Using existing MLT token owner: ${existingMltOwner}`);
              farmOwner = existingMltOwner; // Use the actual owner
            }
          }
        } catch (error) {
          console.log(`   MLT token ${mltTokenId} does not exist, minting...`);
          if (!isMltOwner) {
            throw new Error(`Cannot mint MLT: deployer is not MLT owner. MLT owner is ${mltOwner}`);
          }
          
          try {
            // Create LandMetadata struct
            const landMetadata = {
              name: farmConfig.name,
              description: `Coffee farm on ${network} - ${farmConfig.name}`,
              farmInfo: {
                name: farmConfig.name,
                location: "Base Network",
                area: "TBD",
                soilType: "TBD"
              },
              imageURI: "",
              externalURL: ""
            };
            
            const tx = await mlt.mint(farmOwner, landMetadata, "Base Network Farm");
            const receipt = await tx.wait();
            console.log(`   ✅ MLT token minted to ${farmOwner}`);
            console.log(`   Transaction: ${tx.hash}`);
            
            // Get the actual token ID (it uses nextFarmId)
            // We'll need to check what token ID was minted
            const events = receipt.logs.filter(log => {
              try {
                const parsed = mlt.interface.parseLog(log);
                return parsed && parsed.name === "tokenCreated";
              } catch {
                return false;
              }
            });
            
            if (events.length > 0) {
              const parsed = mlt.interface.parseLog(events[0]);
              mltTokenId = parsed.args.tokenId;
              console.log(`   ✅ MLT token ID: ${mltTokenId}`);
            }
          } catch (mintError) {
            console.log(`   ❌ Failed to mint MLT: ${mintError.message}`);
            if (mintError.reason) {
              console.log(`   Reason: ${mintError.reason}`);
            }
            throw mintError;
          }
        }
        
        // STEP 3: Resolve Token Bound Account (TBA) for MLT
        console.log("STEP 3: Resolving Token Bound Account (TBA)...");
        let tbaRecipient = farmOwner;
        
        try {
          // Try MLT's getAccount method
          if (typeof mlt.getAccount === 'function') {
            const tba = await mlt.getAccount(mltTokenId);
            if (tba && tba !== ethers.ZeroAddress) {
              tbaRecipient = tba;
              console.log(`   ✅ Found TBA via getAccount: ${tbaRecipient}`);
            }
          } else if (registry && implAddress) {
            // Use ERC6551 registry
            const chainId = (await ethers.provider.getNetwork()).chainId;
            const salt = ethers.ZeroHash;
            const tba = await registry.account(implAddress, salt, chainId, mltAddress, mltTokenId);
            if (tba && tba !== ethers.ZeroAddress) {
              tbaRecipient = tba;
              console.log(`   ✅ Found TBA via registry: ${tbaRecipient}`);
            }
          }
        } catch (tbaError) {
          console.log(`   ⚠️  Could not resolve TBA, using farm owner: ${tbaError.message}`);
        }
        
        console.log(`   📦 TBA recipient: ${tbaRecipient}`);
        
        // STEP 4: Check MTT permissions
        console.log("STEP 4: Checking MTT minting permissions...");
        const mttOwner = await mtt.owner();
        const mttTreeManager = await mtt.TreeManager();
        const canMint = mttOwner.toLowerCase() === deployer.address.toLowerCase() || 
                       mttTreeManager.toLowerCase() === deployer.address.toLowerCase();
        
        if (!canMint) {
          console.log(`   ⚠️  Deployer cannot mint MTT directly`);
          console.log(`   MTT Owner: ${mttOwner}`);
          console.log(`   MTT TreeManager: ${mttTreeManager}`);
          console.log(`   Deployer: ${deployer.address}`);
          console.log(`   Attempting to mint anyway (may fail if permissions not set)...`);
        } else {
          console.log(`   ✅ Deployer has MTT minting permissions`);
        }
        
        // STEP 5: Mint MTT tokens (trees) from tokenized pool
        console.log("STEP 5: Minting MTT tokens (trees) from tokenized pool...");
        console.log(`   📊 Tree allocation: Trees ${farmConfig.startTreeId} to ${farmConfig.startTreeId + farmConfig.treeCount - 1}`);
        console.log(`   📊 Total tokenized: ${TOTAL_TOKENIZED_TREES}, Used on Scroll: ${SCROLL_TREES_USED}, Available: ${BASE_TREES_AVAILABLE}`);
        
        let mintedTreeCount = 0;
        for (let i = 0; i < farmConfig.treeCount; i++) {
          const treeId = farmConfig.startTreeId + i;
          try {
            const existingBalance = await mtt.subBalanceOf(tbaRecipient, mltTokenId, treeId);
            if (existingBalance > 0) {
              console.log(`   ⚠️  Tree ${treeId} already minted (balance: ${existingBalance})`);
              mintedTreeCount++;
            } else {
              const tx = await mtt.mint(tbaRecipient, mltTokenId, treeId, 1);
              const receipt = await tx.wait();
              mintedTreeCount++;
              console.log(`   ✅ Tree ${treeId} minted to ${tbaRecipient} (tx: ${tx.hash})`);
              
              // Add delay between mints to avoid nonce issues
              if (i < farmConfig.treeCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
              }
            }
          } catch (error) {
            console.log(`   ❌ Failed to mint tree ${treeId}: ${error.message}`);
            if (error.reason) {
              console.log(`   Reason: ${error.reason}`);
            }
            // Continue with other trees instead of failing completely
            console.log(`   ⚠️  Continuing with remaining trees...`);
          }
        }
        
        console.log(`   ✅ ${mintedTreeCount}/${farmConfig.treeCount} trees minted (IDs: ${farmConfig.startTreeId}-${farmConfig.startTreeId + mintedTreeCount - 1})`);
        
        if (mintedTreeCount === 0) {
          throw new Error("No trees were minted. Cannot proceed with farm creation.");
        }
        
        if (mintedTreeCount < farmConfig.treeCount) {
          console.log(`   ⚠️  WARNING: Only ${mintedTreeCount} of ${farmConfig.treeCount} trees were minted.`);
          console.log(`   Farm will be created with ${mintedTreeCount} trees instead of ${farmConfig.treeCount}.`);
          farmConfig.treeCount = mintedTreeCount; // Update tree count
        }
        
        // STEP 6: Add farm to vault
        console.log("STEP 6: Adding farm to vault...");
        
        console.log(`   Farm Owner: ${farmOwner}`);
        console.log(`   TBA (Tree Holder): ${tbaRecipient}`);
        console.log(`   Tree Count: ${farmConfig.treeCount}`);
        console.log(`   Tree IDs: ${farmConfig.startTreeId}-${farmConfig.startTreeId + farmConfig.treeCount - 1}`);
        console.log(`   Target APY: ${farmConfig.targetAPY} bps (${farmConfig.targetAPY / 100}%)`);
        console.log(`   Maturity Period: ${farmConfig.maturityPeriod} months`);
        console.log(`   Bond Value: ${ethers.formatEther(farmConfig.bondValue)} USD`);
        console.log(`   Collateral Ratio: ${farmConfig.collateralRatio / 100}%`);
        console.log(`   Min Investment: ${ethers.formatEther(farmConfig.minInvestment)} MBT`);
        console.log(`   Max Investment: ${ethers.formatEther(farmConfig.maxInvestment)} MBT`);
        console.log(`   Farm Cap: ${ethers.formatEther(farmConfig.farmCap)} MBT`);
        
        try {
          // Use MTTR vault directly instead of Diamond (simpler and more direct)
          console.log(`   Calling MTTR vault.addFarm() directly...`);
          const tx = await mttrVault.addFarm(
            mltTokenId, // farmId (uses MLT token ID)
            farmConfig.name,
            tbaRecipient, // farmTokenBoundAccount (TBA that holds the trees)
            farmConfig.targetAPY,
            farmConfig.maturityPeriod,
            `${farmConfig.name} Share Token`,
            `FST${farmConfig.id}`
          );
          
          console.log(`   ⏳ Transaction submitted: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log(`   ✅ Farm ${farmConfig.id} added to vault successfully!`);
          console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
          
          // Verify farm addition (with error handling for decoding)
          try {
            const farmConfigData = await mttrVault.getFarmConfig(mltTokenId);
            console.log(`\n   Farm Details:`);
            console.log(`   - Name: ${farmConfigData.name}`);
            console.log(`   - Owner: ${farmConfigData.farmOwner}`);
            console.log(`   - Active: ${farmConfigData.active}`);
            console.log(`   - Tree Count: ${farmConfigData.treeCount.toString()}`);
            console.log(`   - Target APY: ${farmConfigData.targetAPY.toString()} bps`);
            console.log(`   - Share Token: ${farmConfigData.shareTokenAddress}`);
            console.log(`   - Share Token Symbol: ${farmConfigData.shareTokenSymbol}`);
          } catch (verifyError) {
            console.log(`\n   ⚠️  Could not decode farm config (farm was created successfully)`);
            console.log(`   Transaction hash: ${tx.hash}`);
            console.log(`   You can verify on BaseScan: https://sepolia.basescan.org/tx/${tx.hash}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Failed to add farm: ${error.message}`);
          if (error.reason) {
            console.log(`   Reason: ${error.reason}`);
          }
          throw error;
        }
      }

      console.log(`✅ Farm ${farmConfig.id} processing completed!\n`);

    } catch (error) {
      console.log(`❌ Error processing farm ${farmConfig.id}: ${error.message}`);
      console.log(`   Skipping to next farm...\n`);
    }
  }

  console.log("Farm addition script completed!");
  console.log("==============================\n");
  
  // Summary
  console.log("Summary:");
  console.log("========");
  try {
    const activeFarmIds = await mttrVault.getActiveFarmIds();
    console.log(`Total active farms: ${activeFarmIds.length}`);
    
    for (const farmId of activeFarmIds) {
      try {
        const farm = await mttrVault.getFarmConfig(farmId);
        console.log(`\nFarm ${farmId.toString()}:`);
        console.log(`  Name: ${farm.name}`);
        console.log(`  Owner: ${farm.farmOwner}`);
        console.log(`  Active: ${farm.active}`);
        console.log(`  Tree Count: ${farm.treeCount.toString()}`);
      } catch (error) {
        console.log(`\nFarm ${farmId.toString()}:`);
        console.log(`  Status: Active (config decode error: ${error.message})`);
      }
    }
  } catch (error) {
    console.log(`Could not retrieve farm summary: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
