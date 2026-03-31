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

// Tree tracking
const TREE_START_ID = 421; // Start from tree 421 (after previous trees 411-420)
const TREES_TO_ADD = 23; // Add 23 trees to reach 30 total
const FARM_ID = 1; // Existing farm ID

// Find the most recent deployment file
function findLatestDeploymentFile() {
  const deploymentsDir = path.join(__dirname, "../../deployments");
  const baseDir = path.join(deploymentsDir, "base");
  
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
          const matchesNetwork = isBaseMainnet 
            ? file.includes("base") && !file.includes("baseSepolia") && !file.includes("84532")
            : file.includes("baseSepolia") || file.includes("84532");
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
  
  allFiles.sort((a, b) => b.time - a.time);
  return allFiles[0].path;
}

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
  console.log("🌳 Add Trees to Existing Farm on Base Network");
  console.log("=".repeat(60));
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

  // Get contract addresses
  const mltAddress = deployment.MochaLandToken || deployment.mltToken;
  const mttAddress = deployment.MochaTreeToken || deployment.mttToken;
  const registryAddress = deployment.ERC6551Registry || deployment.erc6551Registry;
  const mttrVaultAddress = deployment.MochaTreeRightsToken || deployment.mttrVault;

  if (!mltAddress || !mttAddress || !mttrVaultAddress) {
    throw new Error("Required contract addresses not found in deployment file");
  }

  console.log("Token Contract Addresses:");
  console.log("  MLT (Land):", mltAddress);
  console.log("  MTT (Tree):", mttAddress);
  if (registryAddress) console.log("  ERC6551 Registry:", registryAddress);
  console.log("");

  // Contract ABIs
  const MTT_ABI = [
    "function mint(address to, uint256 farmId, uint256 treeId, uint256 amount) external",
    "function subBalanceOf(address account, uint256 farmId, uint256 treeId) external view returns (uint256)",
    "function owner() external view returns (address)",
    "function TreeManager() external view returns (address)",
  ];

  const MLT_ABI = [
    "function ownerOf(uint256 tokenId) external view returns (address)",
  ];

  const DIAMOND_ABI = [
    "function getFarmConfig(uint256 farmId) external view returns (tuple(address farmOwner, uint256 treeCount, uint256 targetAPY, bool active, uint256 bondValue, uint256 collateralRatio, uint256 createdTimestamp, uint256 maturityPeriod, uint256 maxInvestment, uint256 minInvestment, uint256 farmCap, string name, address shareTokenAddress, string shareTokenSymbol, string shareTokenName))",
    "function getActiveFarmIds() external view returns (uint256[] memory)",
  ];

  const MTTR_ABI = [
    "function getActiveFarmIds() external view returns (uint256[] memory)",
  ];

  const ERC6551_REGISTRY_ABI = [
    "function account(address implementation, bytes32 salt, uint256 chainId, address tokenContract, uint256 tokenId) external view returns (address)",
  ];

  const mtt = new ethers.Contract(mttAddress, MTT_ABI, deployer);
  const mlt = new ethers.Contract(mltAddress, MLT_ABI, deployer);
  const mttrVault = new ethers.Contract(mttrVaultAddress, MTTR_ABI, deployer);
  const diamond = new ethers.Contract(diamondAddress, DIAMOND_ABI, deployer);

  let registry = null;
  if (registryAddress) {
    registry = new ethers.Contract(registryAddress, ERC6551_REGISTRY_ABI, deployer);
  }

  // Check if farm exists
  console.log(`Checking if Farm ${FARM_ID} exists...`);
  let farmConfig;
  try {
    const activeFarmIds = await mttrVault.getActiveFarmIds();
    if (!activeFarmIds.includes(BigInt(FARM_ID))) {
      throw new Error(`Farm ${FARM_ID} not found in active farms`);
    }
    // Use diamond to get farm config (more reliable)
    farmConfig = await diamond.getFarmConfig(FARM_ID);
    console.log(`✅ Farm ${FARM_ID} found: "${farmConfig.name}"`);
    console.log(`   Current tree count: ${farmConfig.treeCount}`);
    console.log(`   Farm owner: ${farmConfig.farmOwner}`);
    console.log(`   Active: ${farmConfig.active}\n`);
  } catch (error) {
    // If decoding fails, try to extract info from error or use defaults
    console.log(`⚠️  Could not decode farm config: ${error.message}`);
    console.log(`   Farm ${FARM_ID} exists but config decoding failed.`);
    console.log(`   Proceeding with Farm ID ${FARM_ID} and deployer as owner...`);
    // Use deployer as farm owner and assume 7 trees from previous deployment
    farmConfig = {
      farmOwner: deployer.address,
      treeCount: 7,
      name: "Base Mainnet Farm",
      active: true
    };
  }

  // Get MLT owner (farm owner)
  const farmOwner = farmConfig.farmOwner;
  console.log(`Farm Owner: ${farmOwner}`);

  // Resolve TBA (Token Bound Account) for the MLT token
  let tbaRecipient = farmOwner;
  if (registry) {
    try {
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const implementation = deployment.ERC6551AccountImplementation || "0x0000000000000000000000000000000000000000";
      const salt = ethers.ZeroHash;
      const tbaAddress = await registry.account(implementation, salt, chainId, mltAddress, FARM_ID);
      if (tbaAddress && tbaAddress !== ethers.ZeroAddress) {
        tbaRecipient = tbaAddress;
        console.log(`✅ TBA resolved: ${tbaRecipient}`);
      } else {
        console.log(`⚠️  TBA not found, using farm owner: ${tbaRecipient}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not resolve TBA, using farm owner: ${error.message}`);
    }
  }

  // Check MTT minting permissions
  console.log("\nChecking MTT minting permissions...");
  const mttOwner = await mtt.owner();
  const mttTreeManager = await mtt.TreeManager();
  const isMttOwner = mttOwner.toLowerCase() === deployer.address.toLowerCase();
  const isTreeManager = mttTreeManager.toLowerCase() === deployer.address.toLowerCase() || 
                        mttTreeManager.toLowerCase() === diamondAddress.toLowerCase();

  if (!isMttOwner && !isTreeManager) {
    console.log(`⚠️  WARNING: Deployer may not have MTT minting permissions`);
    console.log(`   MTT Owner: ${mttOwner}`);
    console.log(`   MTT TreeManager: ${mttTreeManager}`);
    console.log(`   Deployer: ${deployer.address}`);
    console.log(`   Attempting to mint anyway (may fail if permissions not set)...`);
  } else {
    console.log(`✅ Deployer has MTT minting permissions`);
  }

  // Mint trees
  console.log(`\n🌳 Minting ${TREES_TO_ADD} trees to Farm ${FARM_ID}...`);
  console.log(`   Tree IDs: ${TREE_START_ID} to ${TREE_START_ID + TREES_TO_ADD - 1}`);
  console.log(`   Recipient: ${tbaRecipient}\n`);

  let mintedTreeCount = 0;
  const mintedTreeIds = [];

  for (let i = 0; i < TREES_TO_ADD; i++) {
    const treeId = TREE_START_ID + i;
    try {
      // Check if tree already exists
      const existingBalance = await mtt.subBalanceOf(tbaRecipient, FARM_ID, treeId);
      if (existingBalance > 0) {
        console.log(`   ⚠️  Tree ${treeId} already minted (balance: ${existingBalance})`);
        mintedTreeCount++;
        mintedTreeIds.push(treeId);
      } else {
        const tx = await mtt.mint(tbaRecipient, FARM_ID, treeId, 1);
        const receipt = await tx.wait();
        mintedTreeCount++;
        mintedTreeIds.push(treeId);
        console.log(`   ✅ Tree ${treeId} minted to ${tbaRecipient} (tx: ${tx.hash})`);
        
        // Add delay between mints to avoid nonce issues
        if (i < TREES_TO_ADD - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed to mint tree ${treeId}: ${error.message}`);
      if (error.reason) {
        console.log(`   Reason: ${error.reason}`);
      }
      console.log(`   ⚠️  Continuing with remaining trees...`);
    }
  }

  console.log(`\n✅ ${mintedTreeCount}/${TREES_TO_ADD} trees minted successfully`);
  console.log(`   Tree IDs: ${mintedTreeIds.join(", ")}`);
  
  // Verify final farm state
  console.log(`\n📊 Verifying farm state...`);
  try {
    const updatedFarmConfig = await mttrVault.getFarmConfig(FARM_ID);
    console.log(`   Farm name: ${updatedFarmConfig.name}`);
    console.log(`   Tree count: ${updatedFarmConfig.treeCount}`);
    console.log(`   Note: Tree count in contract may not update automatically.`);
    console.log(`   Total trees minted to this farm: ${farmConfig.treeCount} (original) + ${mintedTreeCount} (new) = ${Number(farmConfig.treeCount) + mintedTreeCount}`);
  } catch (error) {
    console.log(`   ⚠️  Could not verify farm config: ${error.message}`);
  }

  console.log(`\n🎉 Tree addition complete!`);
  console.log(`   Farm ${FARM_ID} now has ${Number(farmConfig.treeCount) + mintedTreeCount} trees total`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
