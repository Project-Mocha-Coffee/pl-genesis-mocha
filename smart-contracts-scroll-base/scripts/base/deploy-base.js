// deploy-base.js
// Base Mainnet deployment script - Dedicated for Base network deployments
// This script is a Base-specific version that uses Base network configurations

const { ethers } = require("hardhat");
const { getSelectors, FacetCutAction } = require("../libraries/diamond.js");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Import Base-specific configuration
const BASE_CONFIG = require("../../config/base/base-config.js");

// Helper function to get password from user
function getPassword(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.stdoutMuted = true;
    rl.question(prompt, (password) => {
      rl.close();
      resolve(password);
    });

    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        rl.output.write("*");
      } else {
        rl.output.write(stringToWrite);
      }
    };
  });
}

// Load wallet from keystore
async function loadWalletFromKeystore(keystorePath, password) {
  try {
    const keystoreData = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
    const wallet = await ethers.Wallet.fromEncryptedJson(keystoreData, password);
    return {
      success: true,
      wallet: wallet,
      address: wallet.address
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function deployBase() {
  // Check for keystore configuration
  const keystorePath = process.env.KEYSTORE_FILE;
  const keystorePassword = process.env.KEYSTORE_PASSWORD;
  const privateKey = process.env.PRIVATE_KEY;
  
  let deployer;
  let accounts;
  
  if (keystorePath && keystorePassword) {
    console.log("🔐 Loading deployer from keystore...");
    const result = await loadWalletFromKeystore(keystorePath, keystorePassword);
    
    if (!result.success) {
      throw new Error(`Failed to load keystore: ${result.error}`);
    }
    
    const provider = ethers.provider;
    deployer = result.wallet.connect(provider);
    accounts = [deployer];
    
    console.log("✅ Keystore wallet loaded successfully");
    console.log("📍 Deployer address:", deployer.address);
  } else if (keystorePath && !keystorePassword) {
    console.log("🔐 Keystore file found but no password provided");
    const password = await getPassword("Enter keystore password: ");
    const result = await loadWalletFromKeystore(keystorePath, password);
    
    if (!result.success) {
      throw new Error(`Failed to load keystore: ${result.error}`);
    }
    
    const provider = ethers.provider;
    deployer = result.wallet.connect(provider);
    accounts = [deployer];
    
    console.log("✅ Keystore wallet loaded successfully");
    console.log("📍 Deployer address:", deployer.address);
  } else if (privateKey) {
    // Use private key from .env file
    console.log("🔑 Loading deployer from PRIVATE_KEY...");
    const provider = ethers.provider;
    // Remove 0x prefix if present
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    deployer = new ethers.Wallet(`0x${cleanPrivateKey}`, provider);
    accounts = [deployer];
    console.log("✅ Private key wallet loaded successfully");
    console.log("📍 Deployer address:", deployer.address);
  } else {
    // Try to use Hardhat accounts (only works for local networks)
    accounts = await ethers.getSigners();
    if (accounts && accounts.length > 0) {
      deployer = accounts[0];
      console.log("🔑 Using default Hardhat accounts");
    } else {
      throw new Error("❌ No deployer found! Please set PRIVATE_KEY in .env file");
    }
  }

  // Get network information
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  const chainId = network.chainId.toString();
  
  console.log("🚀 Starting Base Mainnet Deployment...");
  console.log("═══════════════════════════════════════════════════════");
  console.log("📍 Network:", networkName, `(Chain ID: ${chainId})`);
  console.log("💼 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  
  // Verify we're on Base network
  const isBase = chainId === "8453" || chainId === "84532";
  const isBaseMainnet = chainId === "8453";
  const isBaseSepolia = chainId === "84532";
  
  if (!isBase) {
    throw new Error(`❌ This script is for Base networks only. Current chain ID: ${chainId}. Use --network base or --network baseSepolia`);
  }
  
  if (isBaseMainnet) {
    console.log("🌐 Base Mainnet - https://basescan.org");
  } else if (isBaseSepolia) {
    console.log("🧪 Base Sepolia Testnet - https://sepolia.basescan.org");
  }
  console.log("💡 Benefits: Low gas fees, Coinbase-backed, EVM compatibility");
  console.log("═══════════════════════════════════════════════════════\n");

  // Get Base configuration
  const config = BASE_CONFIG[networkName] || BASE_CONFIG[isBaseMainnet ? "base" : "baseSepolia"];
  if (!config) {
    throw new Error(`❌ No Base configuration found for network: ${networkName}`);
  }

  // Object to store all deployed addresses
  const deployedAddresses = {
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    network: networkName,
    chainId: chainId,
    isBase: isBase,
    isBaseMainnet: isBaseMainnet,
    isBaseSepolia: isBaseSepolia,
    explorerUrl: isBaseMainnet ? "https://basescan.org" : 
                 isBaseSepolia ? "https://sepolia.basescan.org" : 
                 "N/A",
    deployment: {
      method: keystorePath ? "keystore" : "hardhat_accounts",
      keystoreFile: keystorePath || null,
      accountType: keystorePath ? "encrypted_keystore" : "hardhat_default"
    },
    tokens: {},
    diamond: {},
    facets: {},
    utilities: {},
    ico: {},
    baseConfig: {
      priceFeeds: config.priceFeeds,
      tokens: config.tokens
    }
  };

  // Use Base configuration
  const priceFeedAddresses = config.priceFeeds;
  const tokenAddresses = config.tokens;

  console.log("✅ Base Network Configuration:");
  console.log("   Price Feeds:");
  console.log(`     ETH/USD: ${priceFeedAddresses.ETH_USD}`);
  console.log(`     USDC/USD: ${priceFeedAddresses.USDC_USD}`);
  console.log(`     BTC/USD: ${priceFeedAddresses.BTC_USD}`);
  console.log("   Tokens:");
  console.log(`     USDC: ${tokenAddresses.USDC}`);
  console.log(`     WETH: ${tokenAddresses.WETH}`);
  console.log("");

  // ================== DEPLOY TOKEN CONTRACTS ==================
  console.log("\n📄 Deploying Token Contracts...");

  // Deploy MochaBeanToken (MBT) - ERC20 for liquidity/rewards
  console.log("Deploying MochaBeanToken (MBT)...");
  const MochaBeanToken = await ethers.getContractFactory("MochaBeanToken");
  const mbtToken = await MochaBeanToken.deploy();
  await mbtToken.waitForDeployment();
  deployedAddresses.tokens.MochaBeanToken = await mbtToken.getAddress();
  console.log("✅ MochaBeanToken deployed at:", deployedAddresses.tokens.MochaBeanToken);

  // Deploy ERC6551 Account implementation and Registry
  console.log("Deploying ERC6551 Account implementation...");
  const ERC6551Account = await ethers.getContractFactory("ERC6551Account");
  const erc6551Account = await ERC6551Account.deploy();
  await erc6551Account.waitForDeployment();
  const erc6551AccountAddress = await erc6551Account.getAddress();
  deployedAddresses.utilities.ERC6551AccountImplementation = erc6551AccountAddress;
  console.log("✅ ERC6551Account implementation deployed at:", erc6551AccountAddress);

  console.log("Deploying ERC6551 Registry...");
  const MockERC6551Registry = await ethers.getContractFactory("MockERC6551Registry");
  const erc6551Registry = await MockERC6551Registry.deploy();
  await erc6551Registry.waitForDeployment();
  const erc6551RegistryAddress = await erc6551Registry.getAddress();
  deployedAddresses.utilities.ERC6551Registry = erc6551RegistryAddress;
  console.log("✅ ERC6551Registry deployed at:", erc6551RegistryAddress);

  // Deploy MochaLandToken (MLT) - ERC721 for land parcels
  console.log("Deploying MochaLandToken (MLT)...");
  const MochaLandToken = await ethers.getContractFactory("MochaLandToken");
  const mltToken = await MochaLandToken.deploy(erc6551RegistryAddress, erc6551AccountAddress);
  await mltToken.waitForDeployment();
  deployedAddresses.tokens.MochaLandToken = await mltToken.getAddress();
  console.log("✅ MochaLandToken deployed at:", deployedAddresses.tokens.MochaLandToken);

  // Deploy MochaTreeToken (MTT) - DLT for tokenizing trees
  console.log("Deploying MochaTreeToken (MTT)...");
  const MochaTreeToken = await ethers.getContractFactory("MochaTreeToken");
  const mttToken = await MochaTreeToken.deploy("1"); // version parameter
  await mttToken.waitForDeployment();
  deployedAddresses.tokens.MochaTreeToken = await mttToken.getAddress();
  console.log("✅ MochaTreeToken deployed at:", deployedAddresses.tokens.MochaTreeToken);

  // Continue with Diamond deployment...
  // (This is a simplified version - you can extend it with full Diamond deployment logic)
  
  console.log("\n✅ Base deployment complete!");
  console.log("📄 Deployment addresses saved to: deployments/base/");

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "../../deployments/base");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `base-${networkName}-${chainId}-${new Date().toISOString().replace(/:/g, "-")}.json`
  );

  fs.writeFileSync(deploymentFile, JSON.stringify(deployedAddresses, null, 2));
  console.log(`✅ Deployment info saved to: ${deploymentFile}`);

  console.log("\n🔗 View on Basescan:");
  if (isBaseMainnet) {
    console.log(`   https://basescan.org/address/${deployer.address}`);
  } else {
    console.log(`   https://sepolia.basescan.org/address/${deployer.address}`);
  }
}

// Run deployment
deployBase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
