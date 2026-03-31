// deployDiamond.js
// Comprehensive deployment script for the TreeFarm Diamond system and all tokens

const { ethers } = require("hardhat");
const { getSelectors, FacetCutAction } = require("./libraries/diamond.js");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

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

async function deployDiamond() {
  // Check for keystore configuration
  const keystorePath = process.env.KEYSTORE_FILE;
  const keystorePassword = process.env.KEYSTORE_PASSWORD;
  const privateKey = process.env.PRIVATE_KEY;
  
  let deployer;
  let accounts;
  
  if (keystorePath && keystorePassword) {
    console.log("🔐 Loading deployer from keystore...");
    console.log("📂 Keystore file:", keystorePath);
    
    const result = await loadWalletFromKeystore(keystorePath, keystorePassword);
    
    if (!result.success) {
      throw new Error(`Failed to load keystore: ${result.error}`);
    }
    
    // Connect wallet to provider
    const provider = ethers.provider;
    deployer = result.wallet.connect(provider);
    
    // Create accounts array with keystore wallet as primary
    accounts = [deployer];
    
    console.log("✅ Keystore wallet loaded successfully");
    console.log("📍 Deployer address:", deployer.address);
  } else if (keystorePath && !keystorePassword) {
    console.log("🔐 Keystore file found but no password provided");
    console.log("💡 Either set KEYSTORE_PASSWORD environment variable or provide password interactively");
    
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
  
  console.log("🚀 Starting comprehensive TreeFarm system deployment...");
  console.log("═══════════════════════════════════════════════════════");
  console.log("📍 Network:", networkName, `(Chain ID: ${chainId})`);
  console.log("💼 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  
  // Check if we're on Scroll networks (mainnet 534352, sepolia 534351)
  const isScroll = chainId === "534352" || chainId === "534351";
  const isScrollMainnet = chainId === "534352";
  const isScrollSepolia = chainId === "534351";
  
  // Check if we're on Base networks (mainnet 8453, sepolia 84532)
  const isBase = chainId === "8453" || chainId === "84532";
  const isBaseMainnet = chainId === "8453";
  const isBaseSepolia = chainId === "84532";
  
  if (isScroll) {
    console.log("⚡ Deploying to Scroll zkEVM blockchain!");
    if (isScrollMainnet) {
      console.log("🌐 Scroll Mainnet - https://scrollscan.com");
    } else if (isScrollSepolia) {
      console.log("🧪 Scroll Sepolia Testnet - https://sepolia.scrollscan.com");
    }
    console.log("💡 Benefits: Lower gas fees, zkEVM security, EVM compatibility");
  } else if (isBase) {
    console.log("⚡ Deploying to Base blockchain!");
    if (isBaseMainnet) {
      console.log("🌐 Base Mainnet - https://basescan.org");
    } else if (isBaseSepolia) {
      console.log("🧪 Base Sepolia Testnet - https://sepolia.basescan.org");
    }
    console.log("💡 Benefits: Low gas fees, Coinbase-backed, EVM compatibility");
  }
  console.log("═══════════════════════════════════════════════════════\n");

  // Object to store all deployed addresses
  const deployedAddresses = {
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    network: networkName,
    chainId: chainId,
    isScroll: isScroll,
    isScrollMainnet: isScrollMainnet,
    isScrollSepolia: isScrollSepolia,
    isBase: isBase,
    isBaseMainnet: isBaseMainnet,
    isBaseSepolia: isBaseSepolia,
    explorerUrl: isScrollMainnet ? "https://scrollscan.com" : 
                 isScrollSepolia ? "https://sepolia.scrollscan.com" : 
                 isBaseMainnet ? "https://basescan.org" :
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
    ico: {}
  };

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

  // Deploy MTTR helper libraries (required for linking)
  console.log("Deploying MTTR libraries (MTTRBondLib, MTTRFarmLib, MTTRYieldLib)...");
  const MTTRBondLibFactory = await ethers.getContractFactory("MTTRBondLib");
  const mttrBondLib = await MTTRBondLibFactory.deploy();
  await mttrBondLib.waitForDeployment();
  const mttrBondLibAddress = await mttrBondLib.getAddress();
  deployedAddresses.utilities.MTTRBondLib = mttrBondLibAddress;
  console.log("✅ MTTRBondLib deployed at:", mttrBondLibAddress);

  const MTTRFarmLibFactory = await ethers.getContractFactory("MTTRFarmLib");
  const mttrFarmLib = await MTTRFarmLibFactory.deploy();
  await mttrFarmLib.waitForDeployment();
  const mttrFarmLibAddress = await mttrFarmLib.getAddress();
  deployedAddresses.utilities.MTTRFarmLib = mttrFarmLibAddress;
  console.log("✅ MTTRFarmLib deployed at:", mttrFarmLibAddress);

  const MTTRYieldLibFactory = await ethers.getContractFactory("MTTRYieldLib");
  const mttrYieldLib = await MTTRYieldLibFactory.deploy();
  await mttrYieldLib.waitForDeployment();
  const mttrYieldLibAddress = await mttrYieldLib.getAddress();
  deployedAddresses.utilities.MTTRYieldLib = mttrYieldLibAddress;
  console.log("✅ MTTRYieldLib deployed at:", mttrYieldLibAddress);

  // Deploy MochaTreeRightsToken (MTTR) - ERC4626 vault for multi-tranche bonds (link libraries)
  console.log("Deploying MochaTreeRightsToken (MTTR)...");
  const MochaTreeRightsToken = await ethers.getContractFactory("MochaTreeRightsToken", {
    libraries: {
      "contracts/diamondPattern/libraries/MTTRBondLib.sol:MTTRBondLib": mttrBondLibAddress,
      "contracts/diamondPattern/libraries/MTTRFarmLib.sol:MTTRFarmLib": mttrFarmLibAddress,
      "contracts/diamondPattern/libraries/MTTRYieldLib.sol:MTTRYieldLib": mttrYieldLibAddress,
    },
  });
  const mttrToken = await MochaTreeRightsToken.deploy(
    await mbtToken.getAddress(), // MBT as underlying asset (IERC20)
    "Mocha Tree Rights Token",
    "MTTR",
    await mltToken.getAddress(), // MLT address
    await mttToken.getAddress()  // MTT address
  );
  await mttrToken.waitForDeployment();
  deployedAddresses.tokens.MochaTreeRightsToken = await mttrToken.getAddress();
  console.log("✅ MochaTreeRightsToken deployed at:", deployedAddresses.tokens.MochaTreeRightsToken);

  // ================== DEPLOY ICO CONTRACT ==================
  console.log("\n💰 Deploying ICO Contract...");
  
  // Configuration for different networks
  const NETWORK_CONFIG = {
    // Scroll Mainnet
    scroll: {
      priceFeeds: {
        ETH_USD: "0x6bF14CB0A831078629D993FDeBcB182b21A8774C", // ETH/USD
        USDT_USD: "0xf376A91Ae078927eb3686D6010a6f1482424954E", // USDT/USD (placeholder)
        USDC_USD: "0x43d12Fb3AfCAd5347fA764EeAB105478337b7200", // USDC/USD (placeholder)
        BTC_USD: "0x61C432B58A43516899d8dF33A5F57edb8d57EB77", // BTC/USD (placeholder)
        SCR_USD: "0x26f6F7C468EE309115d19Aa2055db5A74F8cE7A5", // SCR/USD (placeholder)
      },
      tokens: {
        USDT: "0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df", // USDT (placeholder)
        USDC: "0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df", // USDC (placeholder)
        WBTC: "0x3C1BCa5a656e69edCD0D4E36BEbb3FcDAcA60Cf1", // WBTC (placeholder)
        SCR: "0xd29687c813D741E2F938F4aC377128810E217b1b", // SCR (placeholder)
      },
    },
    // Scroll Sepolia Testnet
    scrollSepolia: {
      priceFeeds: {
       ETH_USD: "0x59F1ec1f10bD7eD9B938431086bC1D9e233ECf41", // ETH/USD
      USDT_USD: "0xb84a700192A78103B2dA2530D99718A2a954cE86", // USDT/USD (placeholder - need actual address)
      USDC_USD: "0xFadA8b0737D4A3AE7118918B7E69E689034c0127", // USDC/USD (placeholder - need actual address)
      BTC_USD: "0x87dce67002e66C17BC0d723Fe20D736b80CAaFda", // BTC/USD (placeholder - need actual address)
      SCR_USD: "0x59F1ec1f10bD7eD9B938431086bC1D9e233ECf41", // SCR/USD (placeholder - need actual address)
      },
    },
    // Base Mainnet
    base: {
      priceFeeds: {
        ETH_USD: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", // ETH/USD - Verified
        USDC_USD: "0x7e8691370FB440291fBC953F988D0Ae02d82eB7d", // USDC/USD - Verified
        BTC_USD: "0x45c32aED9798C4402127A042fB956275d116a4B1", // BTC/USD - Verified
        DAI_USD: "0x6001712a3251D5bC85B81015D588E3E9D5515277", // DAI/USD - Verified
        // Note: USDT/USD may not be available on Base, using USDC/USD as alternative
        USDT_USD: "0x7e8691370FB440291fBC953F988D0Ae02d82eB7d", // Using USDC/USD as fallback
        // Note: SCR/USD not available on Base, using ETH/USD as placeholder
        SCR_USD: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", // Using ETH/USD as placeholder
      },
      tokens: {
        USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC (Native) - Verified
        WETH: "0x4200000000000000000000000000000000000006", // WETH - Verified
        DAI: "0x50c5725949A6F0c72E6C4a641F24049A917db0Cb", // DAI - Verified
        // Note: USDT and WBTC may not be available on Base
        USDT: "0xfde4C962512795FD9f0bEF2e95a5369624836D48", // USDT - Verify availability
        WBTC: "0x0000000000000000000000000000000000000000", // WBTC - May not exist, set to zero address
        // Note: SCR not available on Base, using WETH as placeholder
        SCR: "0x4200000000000000000000000000000000000006", // Using WETH as placeholder
      },
    },
    // Base Sepolia Testnet
    baseSepolia: {
      priceFeeds: {
        ETH_USD: "0x4aDC67696bA383F8DDd44C5B9f1B3c6d1911d250", // ETH/USD - Testnet
        BTC_USD: "0x6ce185860a4963106506C203335A2910413708e9", // BTC/USD - Testnet
        USDC_USD: ethers.ZeroAddress, // USDC/USD - Not available on testnet, use zero address
        USDT_USD: ethers.ZeroAddress, // USDT/USD - Not available on testnet, use zero address
      },
      tokens: {
        USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC - Testnet (verify)
        WETH: "0x4200000000000000000000000000000000000006", // WETH - Same as mainnet
        USDT: "0x0000000000000000000000000000000000000000", // USDT - May not exist on testnet
        WBTC: "0x0000000000000000000000000000000000000000", // WBTC - May not exist on testnet
      },
    },
    // Local development
    localhost: {
      priceFeeds: {
        ETH_USD: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock ETH/USD
        USDT_USD: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock USDT/USD
        USDC_USD: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock USDC/USD
        BTC_USD: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock BTC/USD
        SCR_USD: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock SCR/USD
      },
    },
    // Hardhat network (same as localhost)
    hardhat: {
      priceFeeds: {
        ETH_USD: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock ETH/USD
        USDT_USD: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock USDT/USD
        USDC_USD: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock USDC/USD
        BTC_USD: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock BTC/USD
        SCR_USD: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock SCR/USD
      },
      tokens: {
        USDT: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock USDT
        USDC: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock USDC
        WBTC: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock WBTC
        SCR: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // Mock SCR
      },
    },
  };

  // Default deployment parameters
  const DEFAULT_PARAMS = {
    maxTokensToSell: ethers.parseEther("40"), // 1M tokens max
    minEthPurchase: ethers.parseEther("0.001"), // 0.001 ETH
    minUsdtPurchase: ethers.parseUnits("1", 6), // 1 USDT (6 decimals)
    minUsdcPurchase: ethers.parseUnits("1", 6), // 1 USDC (6 decimals)
    minWbtcPurchase: ethers.parseUnits("0.00001", 8), // 0.00001 WBTC (8 decimals)
    minScrPurchase: ethers.parseEther("1"), // 1 SCR (18 decimals)
    maxSlippageBps: 500, // 5%
    maxPriceDeviationBps: 1000, // 10%
  };

  // Get network configuration
  const config = NETWORK_CONFIG[networkName];
  if (!config) {
    throw new Error(`❌ No configuration found for network: ${networkName}`);
  }

  // Check if we need to deploy mock contracts for local development
  let priceFeedAddresses, tokenAddresses;
  
  if (networkName === "localhost" || networkName === "hardhat") {
    console.log("🔧 Deploying mock contracts for local development...");
    
    // Deploy mock price feeds
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    const mockEthPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("2000", 8), 8); // $2000 ETH
    const mockUsdtPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("1", 8), 8); // $1 USDT
    const mockUsdcPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("1", 8), 8); // $1 USDC
    const mockBtcPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("40000", 8), 8); // $40000 BTC
    const mockScrPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("0.1", 8), 8); // $0.1 SCR

    await mockEthPriceFeed.waitForDeployment();
    await mockUsdtPriceFeed.waitForDeployment();
    await mockUsdcPriceFeed.waitForDeployment();
    await mockBtcPriceFeed.waitForDeployment();
    await mockScrPriceFeed.waitForDeployment();

    priceFeedAddresses = {
      ETH_USD: await mockEthPriceFeed.getAddress(),
      USDT_USD: await mockUsdtPriceFeed.getAddress(),
      USDC_USD: await mockUsdcPriceFeed.getAddress(),
      BTC_USD: await mockBtcPriceFeed.getAddress(),
      SCR_USD: await mockScrPriceFeed.getAddress(),
    };

    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUsdt = await MockERC20.deploy("Tether USD", "USDT", 6);
    const mockUsdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    const mockWbtc = await MockERC20.deploy("Wrapped Bitcoin", "WBTC", 8);
    const mockScr = await MockERC20.deploy("Scroll", "SCR", 18);

    await mockUsdt.waitForDeployment();
    await mockUsdc.waitForDeployment();
    await mockWbtc.waitForDeployment();
    await mockScr.waitForDeployment();

    tokenAddresses = {
      USDT: await mockUsdt.getAddress(),
      USDC: await mockUsdc.getAddress(),
      WBTC: await mockWbtc.getAddress(),
      SCR: await mockScr.getAddress(),
    };

    console.log(`✅ Mock Price Feeds deployed:`);
    console.log(`   ETH/USD: ${priceFeedAddresses.ETH_USD}`);
    console.log(`   USDT/USD: ${priceFeedAddresses.USDT_USD}`);
    console.log(`   USDC/USD: ${priceFeedAddresses.USDC_USD}`);
    console.log(`   BTC/USD: ${priceFeedAddresses.BTC_USD}`);
    console.log(`   SCR/USD: ${priceFeedAddresses.SCR_USD}`);
    console.log(`✅ Mock ERC20 Tokens deployed:`);
    console.log(`   USDT: ${tokenAddresses.USDT}`);
    console.log(`   USDC: ${tokenAddresses.USDC}`);
    console.log(`   WBTC: ${tokenAddresses.WBTC}`);
    console.log(`   SCR: ${tokenAddresses.SCR}\n`);
  } else if (networkName === "scrollSepolia") {
    console.log("🔧 Deploying mock ERC20 tokens for Scroll Sepolia...");

    // Use configured Chainlink feeds for scrollSepolia
    priceFeedAddresses = NETWORK_CONFIG.scrollSepolia.priceFeeds;

    // Deploy mock ERC20 tokens with correct decimals
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUsdt = await MockERC20.deploy("Tether USD", "USDT", 6);
    const mockUsdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    const mockWbtc = await MockERC20.deploy("Wrapped Bitcoin", "WBTC", 8);
    const mockScr = await MockERC20.deploy("Scroll", "SCR", 18);
  } else if (networkName === "base") {
    console.log("🔧 Using Base Mainnet configuration with mock contracts for missing tokens...");
    
    // Use real Chainlink feeds where available
    const baseConfig = NETWORK_CONFIG.base;
    priceFeedAddresses = {
      ETH_USD: baseConfig.priceFeeds.ETH_USD,
      USDC_USD: baseConfig.priceFeeds.USDC_USD,
      BTC_USD: baseConfig.priceFeeds.BTC_USD,
      USDT_USD: baseConfig.priceFeeds.USDT_USD,
    };
    tokenAddresses = {
      USDC: baseConfig.tokens.USDC,
      WETH: baseConfig.tokens.WETH,
    };
    
    // Deploy mock contracts for missing tokens/feeds (SCR, WBTC, SCR_USD)
    console.log("Deploying mock SCR/USD price feed...");
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    const mockScrPriceFeed = await MockPriceFeed.deploy(10e8, 8); // $10 SCR
    await mockScrPriceFeed.waitForDeployment();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    priceFeedAddresses.SCR_USD = await mockScrPriceFeed.getAddress();
    
    // Deploy mock tokens for WBTC and SCR
    console.log("Deploying mock WBTC token...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockWbtc = await MockERC20.deploy("Wrapped Bitcoin", "WBTC", 8);
    await mockWbtc.waitForDeployment();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log("Deploying mock SCR token...");
    const mockScr = await MockERC20.deploy("Scroll", "SCR", 18);
    await mockScr.waitForDeployment();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    tokenAddresses.WBTC = await mockWbtc.getAddress();
    tokenAddresses.SCR = await mockScr.getAddress();
    
    // Use real USDT if available, otherwise deploy mock
    if (baseConfig.tokens.USDT && baseConfig.tokens.USDT !== "0x0000000000000000000000000000000000000000") {
      tokenAddresses.USDT = baseConfig.tokens.USDT;
    } else {
      console.log("Deploying mock USDT token...");
      const mockUsdt = await MockERC20.deploy("Tether USD", "USDT", 6);
      await mockUsdt.waitForDeployment();
      await new Promise(resolve => setTimeout(resolve, 5000));
      tokenAddresses.USDT = await mockUsdt.getAddress();
    }
    
    console.log("✅ Base Mainnet Configuration:");
    console.log("   Real Price Feeds:");
    console.log(`     ETH/USD: ${priceFeedAddresses.ETH_USD}`);
    console.log(`     USDC/USD: ${priceFeedAddresses.USDC_USD}`);
    console.log(`     BTC/USD: ${priceFeedAddresses.BTC_USD}`);
    console.log(`     USDT/USD: ${priceFeedAddresses.USDT_USD}`);
    console.log("   Mock Price Feeds:");
    console.log(`     SCR/USD: ${priceFeedAddresses.SCR_USD}`);
    console.log("   Real Tokens:");
    console.log(`     USDC: ${tokenAddresses.USDC}`);
    console.log(`     WETH: ${tokenAddresses.WETH}`);
    console.log("   Mock Tokens:");
    console.log(`     USDT: ${tokenAddresses.USDT}`);
    console.log(`     WBTC: ${tokenAddresses.WBTC}`);
    console.log(`     SCR: ${tokenAddresses.SCR}`);
  } else if (networkName === "baseSepolia") {
    console.log("🔧 Deploying mock price feeds and tokens for Base Sepolia...");

    // For Base Sepolia, we use mock price feeds and tokens (like localhost)
    // so that the ICO constructor gets valid, non-zero addresses.
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    console.log("Deploying mock ETH/USD price feed...");
    const mockEthPriceFeed = await MockPriceFeed.deploy(2000e8, 8);
    await mockEthPriceFeed.waitForDeployment();
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    console.log("Deploying mock USDT/USD price feed...");
    const mockUsdtPriceFeed = await MockPriceFeed.deploy(1e8, 8);
    await mockUsdtPriceFeed.waitForDeployment();
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Deploying mock USDC/USD price feed...");
    const mockUsdcPriceFeed = await MockPriceFeed.deploy(1e8, 8);
    await mockUsdcPriceFeed.waitForDeployment();
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Deploying mock BTC/USD price feed...");
    const mockBtcPriceFeed = await MockPriceFeed.deploy(30000e8, 8);
    await mockBtcPriceFeed.waitForDeployment();
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Deploying mock SCR/USD price feed...");
    const mockScrPriceFeed = await MockPriceFeed.deploy(10e8, 8);
    await mockScrPriceFeed.waitForDeployment();
    await new Promise(resolve => setTimeout(resolve, 5000));

    await mockEthPriceFeed.waitForDeployment();
    await mockUsdtPriceFeed.waitForDeployment();
    await mockUsdcPriceFeed.waitForDeployment();
    await mockBtcPriceFeed.waitForDeployment();
    await mockScrPriceFeed.waitForDeployment();

    priceFeedAddresses = {
      ETH_USD: await mockEthPriceFeed.getAddress(),
      USDT_USD: await mockUsdtPriceFeed.getAddress(),
      USDC_USD: await mockUsdcPriceFeed.getAddress(),
      BTC_USD: await mockBtcPriceFeed.getAddress(),
      SCR_USD: await mockScrPriceFeed.getAddress(),
    };

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUsdt = await MockERC20.deploy("Tether USD", "USDT", 6);
    const mockUsdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    const mockWbtc = await MockERC20.deploy("Wrapped Bitcoin", "WBTC", 8);
    const mockScr = await MockERC20.deploy("Scroll", "SCR", 18);

    await mockUsdt.waitForDeployment();
    await mockUsdc.waitForDeployment();
    await mockWbtc.waitForDeployment();
    await mockScr.waitForDeployment();

    tokenAddresses = {
      USDT: await mockUsdt.getAddress(),
      USDC: await mockUsdc.getAddress(),
      WBTC: await mockWbtc.getAddress(),
      SCR: await mockScr.getAddress(),
    };

    console.log("✅ Base Sepolia Mock Price Feeds:");
    console.log(`   ETH/USD: ${priceFeedAddresses.ETH_USD}`);
    console.log(`   USDT/USD: ${priceFeedAddresses.USDT_USD}`);
    console.log(`   USDC/USD: ${priceFeedAddresses.USDC_USD}`);
    console.log(`   BTC/USD: ${priceFeedAddresses.BTC_USD}`);
    console.log(`   SCR/USD: ${priceFeedAddresses.SCR_USD}`);
    console.log("✅ Base Sepolia Mock Tokens:");
    console.log(`   USDT: ${tokenAddresses.USDT}`);
    console.log(`   USDC: ${tokenAddresses.USDC}`);
    console.log(`   WBTC: ${tokenAddresses.WBTC}`);
    console.log(`   SCR: ${tokenAddresses.SCR}`);
  } else if (networkName === "scroll") {
    console.log("🔧 Using Scroll Mainnet configuration...");
    priceFeedAddresses = NETWORK_CONFIG.scroll.priceFeeds;
    tokenAddresses = NETWORK_CONFIG.scroll.tokens;
  } else {
    // Use configured addresses for mainnet/testnet
    console.log("🌐 Using configured addresses for mainnet/testnet...\n");
    
    priceFeedAddresses = config.priceFeeds;
    tokenAddresses = config.tokens;
    
    console.log(`📋 Using configured addresses:`);
    console.log(`   ETH/USD Price Feed: ${priceFeedAddresses.ETH_USD}`);
    console.log(`   USDT/USD Price Feed: ${priceFeedAddresses.USDT_USD}`);
    console.log(`   USDC/USD Price Feed: ${priceFeedAddresses.USDC_USD}`);
    console.log(`   BTC/USD Price Feed: ${priceFeedAddresses.BTC_USD}`);
    console.log(`   SCR/USD Price Feed: ${priceFeedAddresses.SCR_USD}`);
    console.log(`   USDT Token: ${tokenAddresses.USDT}`);
    console.log(`   USDC Token: ${tokenAddresses.USDC}`);
    console.log(`   WBTC Token: ${tokenAddresses.WBTC}`);
    console.log(`   SCR Token: ${tokenAddresses.SCR}\n`);
  }

  // Deploy ICO contract
  console.log("🚀 Deploying ICO contract...");
  const ICO = await ethers.getContractFactory("ICO");
  
  // Set treasury wallet (use deployer as default, can be changed later by admin)
  const treasuryWallet = "0x9B628779b452eEc5aF2eb769e1954539625EAb9B";
  const maxTokensToSell = DEFAULT_PARAMS.maxTokensToSell;
    DEFAULT_PARAMS.maxTokensToSell;
  
  console.log(`📋 ICO Configuration:`);
  console.log(`   Max Tokens to Sell: ${ethers.formatEther(maxTokensToSell)}`);
  console.log(`   Treasury Wallet: ${treasuryWallet}`);
  console.log(`   Token Address: ${await mbtToken.getAddress()}\n`);
  
  // Helper function to safely checksum addresses
  function safeGetAddress(addr) {
    if (!addr || addr === ethers.ZeroAddress || addr === "0x0000000000000000000000000000000000000000") {
      return ethers.ZeroAddress;
    }
    try {
      // Convert to lowercase first, then checksum
      return ethers.getAddress(addr.toLowerCase());
    } catch (error) {
      console.warn(`Warning: Invalid address format ${addr}, using zero address`);
      return ethers.ZeroAddress;
    }
  }
  
  // Ensure all addresses are properly checksummed
  const checksummedPriceFeeds = {
    ETH_USD: safeGetAddress(priceFeedAddresses.ETH_USD),
    USDT_USD: safeGetAddress(priceFeedAddresses.USDT_USD),
    USDC_USD: safeGetAddress(priceFeedAddresses.USDC_USD),
    BTC_USD: safeGetAddress(priceFeedAddresses.BTC_USD),
    SCR_USD: safeGetAddress(priceFeedAddresses.SCR_USD),
  };
  
  const checksummedTokens = {
    USDT: safeGetAddress(tokenAddresses.USDT),
    USDC: safeGetAddress(tokenAddresses.USDC),
    WBTC: safeGetAddress(tokenAddresses.WBTC),
    SCR: safeGetAddress(tokenAddresses.SCR),
  };
  
  const ico = await ICO.deploy(
    await mbtToken.getAddress(), // Use MBT token as the ICO token
    maxTokensToSell,
    treasuryWallet,
    checksummedPriceFeeds.ETH_USD,
    checksummedPriceFeeds.USDT_USD,
    checksummedPriceFeeds.USDC_USD,
    checksummedPriceFeeds.BTC_USD,
    checksummedPriceFeeds.SCR_USD,
    checksummedTokens.USDT,
    checksummedTokens.USDC,
    checksummedTokens.WBTC,
    checksummedTokens.SCR
  );

  await ico.waitForDeployment();
  const icoAddress = await ico.getAddress();
  console.log(`✅ ICO contract deployed at: ${icoAddress}\n`);

  // Store ICO deployment information
  deployedAddresses.ico.contract = icoAddress;
  deployedAddresses.ico.token = await mbtToken.getAddress();
  deployedAddresses.ico.priceFeeds = priceFeedAddresses;
  deployedAddresses.ico.tokens = tokenAddresses;
  deployedAddresses.ico.parameters = {
    maxTokensToSell: maxTokensToSell.toString(),
    treasuryWallet: treasuryWallet,
    minEthPurchase: DEFAULT_PARAMS.minEthPurchase.toString(),
    minUsdtPurchase: DEFAULT_PARAMS.minUsdtPurchase.toString(),
    minUsdcPurchase: DEFAULT_PARAMS.minUsdcPurchase.toString(),
    minWbtcPurchase: DEFAULT_PARAMS.minWbtcPurchase.toString(),
    minScrPurchase: DEFAULT_PARAMS.minScrPurchase.toString(),
    maxSlippageBps: DEFAULT_PARAMS.maxSlippageBps,
    maxPriceDeviationBps: DEFAULT_PARAMS.maxPriceDeviationBps,
  };

  // Grant ICO contract MINTER_ROLE on MBT token
  console.log("🔐 Granting MINTER_ROLE to ICO contract...");
  const mbtTokenContract = await ethers.getContractAt("MochaBeanToken", await mbtToken.getAddress());
  const minterRole = await mbtTokenContract.MINTER_ROLE();
  const grantTx = await mbtTokenContract.grantRole(minterRole, icoAddress);
  await grantTx.wait();
  console.log("✅ MINTER_ROLE granted to ICO contract\n");

  // Grant MTTR vault BURNER_ROLE on MBT so it can burn during bond purchases
  try {
    console.log("🔐 Granting BURNER_ROLE to MTTR vault on MBT token...");
    const burnerRole = await mbtTokenContract.BURNER_ROLE();
    const grantBurnTx = await mbtTokenContract.grantRole(burnerRole, await mttrToken.getAddress());
    await grantBurnTx.wait();
    console.log("✅ BURNER_ROLE granted to MTTR vault\n");

    deployedAddresses.roles = deployedAddresses.roles || {};
    deployedAddresses.roles.MBT = deployedAddresses.roles.MBT || {};
    deployedAddresses.roles.MBT.BURNER_ROLE = await mttrToken.getAddress();
  } catch (e) {
    console.log("⚠️  Could not grant BURNER_ROLE to MTTR vault:", e.message);
  }

  // Verify MTTR storage pointers (new architecture)
  try {
    const mttrRead = await ethers.getContractAt(
      "MochaTreeRightsToken",
      deployedAddresses.tokens.MochaTreeRightsToken
    );
    const configuredMLT = await mttrRead.mochaLandToken();
    const configuredMTT = await mttrRead.mochaTreeToken();
    console.log("   🔎 MTTR.mochaLandToken:", configuredMLT);
    console.log("   🔎 MTTR.mochaTreeToken:", configuredMTT);

    deployedAddresses.tokens.MTTR_Config = {
      mochaLandToken: configuredMLT,
      mochaTreeToken: configuredMTT,
    };
  } catch (e) {
    console.log("   ⚠️  Could not read MTTR storage pointers (view functions not available yet):", e.message);
  }

  // ================== DEPLOY DIAMOND FACETS ==================
  console.log("\n💎 Deploying Diamond Facets...");

  // Deploy DiamondCutFacet
  console.log("Deploying DiamondCutFacet...");
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.waitForDeployment();
  deployedAddresses.facets.DiamondCutFacet = await diamondCutFacet.getAddress();
  console.log("✅ DiamondCutFacet deployed at:", deployedAddresses.facets.DiamondCutFacet);

  // Deploy core Diamond facets
  const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
  const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
  await diamondLoupeFacet.waitForDeployment();
  deployedAddresses.facets.DiamondLoupeFacet = await diamondLoupeFacet.getAddress();
  console.log("✅ DiamondLoupeFacet deployed at:", deployedAddresses.facets.DiamondLoupeFacet);

  const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
  const ownershipFacet = await OwnershipFacet.deploy();
  await ownershipFacet.waitForDeployment();
  deployedAddresses.facets.OwnershipFacet = await ownershipFacet.getAddress();
  console.log("✅ OwnershipFacet deployed at:", deployedAddresses.facets.OwnershipFacet);

  const InitializationFacet = await ethers.getContractFactory("InitializationFacet");
  const initializationFacet = await InitializationFacet.deploy();
  await initializationFacet.waitForDeployment();
  deployedAddresses.facets.InitializationFacet = await initializationFacet.getAddress();
  console.log("✅ InitializationFacet deployed at:", deployedAddresses.facets.InitializationFacet);

  // Deploy business logic facets
  console.log("Deploying business logic facets...");
  const FarmManagementFacet = await ethers.getContractFactory("FarmManagementFacet");
  const farmManagementFacet = await FarmManagementFacet.deploy();
  await farmManagementFacet.waitForDeployment();
  deployedAddresses.facets.FarmManagementFacet = await farmManagementFacet.getAddress();
  console.log("✅ FarmManagementFacet deployed at:", deployedAddresses.facets.FarmManagementFacet);

  const TreeManagementFacet = await ethers.getContractFactory("TreeManagementFacet");
  const treeManagementFacet = await TreeManagementFacet.deploy();
  await treeManagementFacet.waitForDeployment();
  deployedAddresses.facets.TreeManagementFacet = await treeManagementFacet.getAddress();
  console.log("✅ TreeManagementFacet deployed at:", deployedAddresses.facets.TreeManagementFacet);

  const YieldManagementFacet = await ethers.getContractFactory("YieldManagementFacet");
  const yieldManagementFacet = await YieldManagementFacet.deploy();
  await yieldManagementFacet.waitForDeployment();
  deployedAddresses.facets.YieldManagementFacet = await yieldManagementFacet.getAddress();
  console.log("✅ YieldManagementFacet deployed at:", deployedAddresses.facets.YieldManagementFacet);

  // (No staking facets in current codebase)

  // Deploy additional facets that were missing from original script
  console.log("Deploying additional facets...");
  
  const BondManagementFacet = await ethers.getContractFactory("BondManagementFacet");
  const bondManagementFacet = await BondManagementFacet.deploy();
  await bondManagementFacet.waitForDeployment();
  deployedAddresses.facets.BondManagementFacet = await bondManagementFacet.getAddress();
  console.log("✅ BondManagementFacet deployed at:", deployedAddresses.facets.BondManagementFacet);

  const MultiTrancheVaultFacet = await ethers.getContractFactory("MultiTrancheVaultFacet");
  const multiTrancheVaultFacet = await MultiTrancheVaultFacet.deploy();
  await multiTrancheVaultFacet.waitForDeployment();
  deployedAddresses.facets.MultiTrancheVaultFacet = await multiTrancheVaultFacet.getAddress();
  console.log("✅ MultiTrancheVaultFacet deployed at:", deployedAddresses.facets.MultiTrancheVaultFacet);

  const FarmShareTokenFacet = await ethers.getContractFactory("FarmShareTokenFacet");
  const farmShareTokenFacet = await FarmShareTokenFacet.deploy();
  await farmShareTokenFacet.waitForDeployment();
  deployedAddresses.facets.FarmShareTokenFacet = await farmShareTokenFacet.getAddress();
  console.log("✅ FarmShareTokenFacet deployed at:", deployedAddresses.facets.FarmShareTokenFacet);

  // ================== DEPLOY DIAMOND ==================
  console.log("\n💎 Deploying TreeFarm Diamond...");
  
  // Deploy Diamond with DiamondCutFacet address
  const Diamond = await ethers.getContractFactory("TreeFarmDiamond");
  const diamond = await Diamond.deploy(deployer.address, await diamondCutFacet.getAddress());
  await diamond.waitForDeployment();
  deployedAddresses.diamond.TreeFarmDiamond = await diamond.getAddress();
  console.log("✅ TreeFarmDiamond deployed at:", deployedAddresses.diamond.TreeFarmDiamond);

  // ================== GRANT ROLES ON MTTR TO DEPLOYER ==================
  console.log("\n🔐 Granting roles on MTTR vault to the Deployer...");
  const mttrVault = await ethers.getContractAt(
    "MochaTreeRightsToken",
    await mttrToken.getAddress()
  );
  const VAULT_MANAGER_ROLE = await mttrVault.VAULT_MANAGER_ROLE();
  const BOND_MANAGER_ROLE = await mttrVault.BOND_MANAGER_ROLE();
  const ORACLE_ROLE = await mttrVault.ORACLE_ROLE();

  const diamondAddress = await diamond.getAddress();
  const txGrant1 = await mttrVault.grantRole(VAULT_MANAGER_ROLE, deployer.address );
  await txGrant1.wait();
  const txGrant2 = await mttrVault.grantRole(BOND_MANAGER_ROLE, deployer.address);
  await txGrant2.wait();
  const txGrant3 = await mttrVault.grantRole(ORACLE_ROLE, deployer.address);
  await txGrant3.wait();
  console.log("✅ Roles granted: VAULT_MANAGER_ROLE, BOND_MANAGER_ROLE, ORACLE_ROLE");

  deployedAddresses.roles = deployedAddresses.roles || {};
  deployedAddresses.roles.MTTR = {
    VAULT_MANAGER_ROLE: deployer.address  ,
    BOND_MANAGER_ROLE: deployer.address,
    ORACLE_ROLE: deployer.address,
  };

  // ================== GET FUNCTION SELECTORS ==================
  console.log("\n🔧 Preparing facet function selectors...");
  
  const diamondLoupeFacetSelectors = getSelectors(diamondLoupeFacet);
  const ownershipFacetSelectors = getSelectors(ownershipFacet);
  const initializationFacetSelectors = getSelectors(initializationFacet);
  const farmManagementFacetSelectors = getSelectors(farmManagementFacet);
  const treeManagementFacetSelectors = getSelectors(treeManagementFacet);
  const yieldManagementFacetSelectors = getSelectors(yieldManagementFacet);
  // Staking selectors removed (not applicable)
  const bondManagementFacetSelectors = getSelectors(bondManagementFacet);
  const multiTrancheVaultFacetSelectors = getSelectors(multiTrancheVaultFacet);
  const farmShareTokenFacetSelectors = getSelectors(farmShareTokenFacet);

  console.log("✅ Function selectors prepared");

  // ================== ADD FACETS TO DIAMOND ==================
  console.log("\n🔗 Adding facets to the diamond...");

  // Get diamondCut function to call it
  const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());

  // Add all facets in a single transaction
  const facetCuts = [
      {
        facetAddress: await diamondLoupeFacet.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: diamondLoupeFacetSelectors,
      },
      {
        facetAddress: await ownershipFacet.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: ownershipFacetSelectors,
      },
      {
        facetAddress: await initializationFacet.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: initializationFacetSelectors,
      },
      {
        facetAddress: await farmManagementFacet.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: farmManagementFacetSelectors,
      },
      {
        facetAddress: await treeManagementFacet.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: treeManagementFacetSelectors,
      },
      {
        facetAddress: await yieldManagementFacet.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: yieldManagementFacetSelectors,
      },
      // Staking facets not included
    {
      facetAddress: await bondManagementFacet.getAddress(),
      action: FacetCutAction.Add,
      functionSelectors: bondManagementFacetSelectors,
    },
    {
      facetAddress: await multiTrancheVaultFacet.getAddress(),
      action: FacetCutAction.Add,
      functionSelectors: multiTrancheVaultFacetSelectors,
    },
    {
      facetAddress: await farmShareTokenFacet.getAddress(),
      action: FacetCutAction.Add,
      functionSelectors: farmShareTokenFacetSelectors,
    },
  ];

  const tx2 = await diamondCut.diamondCut(facetCuts, ethers.ZeroAddress, "0x");
  await tx2.wait();
  console.log("✅ All facets added to diamond");

  // ================== INITIALIZE DIAMOND ==================
  console.log("\n⚙️ Initializing the diamond...");

  const initFacet = await ethers.getContractAt("InitializationFacet", await diamond.getAddress());
  const tx3 = await initFacet.initialize(
    await mttToken.getAddress(),
    await mltToken.getAddress(),
    await mbtToken.getAddress()
  );
  await tx3.wait();
  console.log("✅ Diamond initialized");

  // Initialize vault system in diamond
  const vaultFacet = await ethers.getContractAt("MultiTrancheVaultFacet", await diamond.getAddress());
  const tx4 = await vaultFacet.initializeVault(
    await mttrToken.getAddress(),
    await mbtToken.getAddress()
  );
  await tx4.wait();
  console.log("✅ Vault system initialized in diamond");

  // Read back vault info from the diamond (new architecture)
  try {
    const vaultInfo = await vaultFacet.getVaultInfo();
    deployedAddresses.diamond.Vault = {
      mttrVault: vaultInfo[0],
      mbtToken: vaultInfo[1],
      initialized: vaultInfo[2],
      totalFarms: vaultInfo[3].toString(),
      totalActiveBonds: vaultInfo[4].toString(),
    };
    console.log("   🔎 Diamond Vault Info:", deployedAddresses.diamond.Vault);
  } catch (e) {
    console.log("   ⚠️  Could not read vault info from diamond:", e.message);
  }

  // Optional: set MTTR's token pointers if needed (already set in MTTR constructor)
  // await (await mttrVault.updateMochaLandToken(await mltToken.getAddress())).wait();
  // await (await mttrVault.updateMochaTreeToken(await mttToken.getAddress())).wait();

  // ================== POST-DEPLOYMENT SETUP ==================
  console.log("\n🔧 Setting up contract relationships...");
  
  // Set TreeManager address in MochaTreeToken
  await mttToken.setTreeManagerAddress(await diamond.getAddress());
  console.log("✅ MochaTreeToken configured with diamond address");

  // Set Diamond contract in MochaBeanToken (grants roles)
  await mbtToken.setDiamondContract(await diamond.getAddress());
  console.log("✅ MochaBeanToken configured with diamond address");

  // Set FarmManager address in MochaLandToken
  await mltToken.setFarmManagerAddress(await diamond.getAddress());
  console.log("✅ MochaLandToken configured with diamond address");

  // ================== SAVE DEPLOYED ADDRESSES ==================
  console.log("\n💾 Saving deployment information...");
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Deterministic filenames per chain and timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `deployment-${networkName}-chain-${chainId}-${timestamp}`;

  // Save as JSON
  const jsonFilePath = path.join(deploymentsDir, `${baseName}.json`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(deployedAddresses, null, 2));
  console.log("✅ Deployment addresses saved to:", jsonFilePath);

  // Save as TXT for easy reading
  const txtFilePath = path.join(deploymentsDir, `${baseName}.txt`);
  let txtContent = `TreeFarm System Deployment Summary\n`;
  txtContent += `=====================================\n`;
  txtContent += `Deployed at: ${deployedAddresses.timestamp}\n`;
  txtContent += `Network: ${deployedAddresses.network} (Chain ID: ${deployedAddresses.chainId})\n`;
  txtContent += `Deployer: ${deployedAddresses.deployer}\n`;
  txtContent += `Deployment Method: ${deployedAddresses.deployment.method}\n`;
  if (deployedAddresses.deployment.keystoreFile) {
    txtContent += `Keystore File: ${deployedAddresses.deployment.keystoreFile}\n`;
  }
  txtContent += `\n`;
  txtContent += `NOTE: FarmShareToken contracts are NOT deployed at this stage.\n`;
  txtContent += `They are created dynamically when calling addFarm on the MTTR vault.\n\n`;
  
  txtContent += `TOKEN CONTRACTS:\n`;
  txtContent += `================\n`;
  Object.entries(deployedAddresses.tokens).forEach(([name, address]) => {
    txtContent += `${name}: ${address}\n`;
  });
  
  txtContent += `\nICO CONTRACT:\n`;
  txtContent += `=============\n`;
  txtContent += `ICO Contract: ${deployedAddresses.ico.contract}\n`;
  txtContent += `ICO Token (MBT): ${deployedAddresses.ico.token}\n`;
  txtContent += `Treasury Wallet: ${deployedAddresses.ico.parameters.treasuryWallet}\n`;
  txtContent += `Max Tokens to Sell: ${deployedAddresses.ico.parameters.maxTokensToSell}\n`;
  txtContent += `\nPrice Feeds:\n`;
  Object.entries(deployedAddresses.ico.priceFeeds).forEach(([name, address]) => {
    txtContent += `  ${name}: ${address}\n`;
  });
  txtContent += `\nPayment Tokens:\n`;
  Object.entries(deployedAddresses.ico.tokens).forEach(([name, address]) => {
    txtContent += `  ${name}: ${address}\n`;
  });
  
  txtContent += `\nDIAMOND:\n`;
  txtContent += `========\n`;
  Object.entries(deployedAddresses.diamond).forEach(([name, address]) => {
    txtContent += `${name}: ${address}\n`;
  });
  
  txtContent += `\nFACETS:\n`;
  txtContent += `=======\n`;
  Object.entries(deployedAddresses.facets).forEach(([name, address]) => {
    txtContent += `${name}: ${address}\n`;
  });
  
  txtContent += `\nUTILITIES:\n`;
  txtContent += `==========\n`;
  Object.entries(deployedAddresses.utilities).forEach(([name, address]) => {
    txtContent += `${name}: ${address}\n`;
  });

   // Vault details section (new architecture)
  if (deployedAddresses.diamond && deployedAddresses.diamond.Vault) {
    txtContent += `\nVAULT (MTTR)\n`;
    txtContent += `===========\n`;
    const v = deployedAddresses.diamond.Vault;
    txtContent += `mttrVault: ${v.mttrVault}\n`;
    txtContent += `mbtToken: ${v.mbtToken}\n`;
    txtContent += `initialized: ${v.initialized}\n`;
    txtContent += `totalFarms: ${v.totalFarms}\n`;
    txtContent += `totalActiveBonds: ${v.totalActiveBonds}\n`;
    txtContent += `shareTokens: Created on-demand per farm via addFarm()\n`;
  }

  fs.writeFileSync(txtFilePath, txtContent);
  console.log("✅ Deployment summary saved to:", txtFilePath);

  // ================== DEPLOYMENT COMPLETE ==================
  console.log("\n🎉 DEPLOYMENT COMPLETE! 🎉");
  console.log("═══════════════════════════════════════════════════════");
  console.log("💎 Diamond Address:", deployedAddresses.diamond.TreeFarmDiamond);
  console.log("💰 ICO Contract:", deployedAddresses.ico.contract);
  console.log("📊 Total Facets Deployed:", Object.keys(deployedAddresses.facets).length);
  console.log("🪙 Total Tokens Deployed:", Object.keys(deployedAddresses.tokens).length);
  console.log("🔧 Utility Contracts:", Object.keys(deployedAddresses.utilities).length);
  
  if (isScroll) {
    console.log("\n⚡ Scroll zkEVM Deployment Success!");
    console.log("🔍 View on Explorer:", deployedAddresses.explorerUrl);
    console.log("💰 Gas Savings: ~70-90% vs Ethereum mainnet");
    console.log("🔒 Security: zkEVM with full EVM compatibility");
  }
  
  console.log("\n🚀 Your TreeFarm coffee investment platform is live!");
  console.log("📱 Use the contract addresses to configure your frontend");
  console.log("🔗 All addresses saved in deployments/ directory");
  console.log("═══════════════════════════════════════════════════════");

  return {
    diamond,
    tokens: { mbtToken, mttToken, mltToken, mttrToken },
    ico: ico,
    utilities: {},
    deployedAddresses,
  };
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🚀 TreeFarm Diamond Deployment Script

Usage:
  npx hardhat run scripts/deployDiamond.js [options]
  node scripts/deployDiamond.js [options]

Options:
  --help, -h                    Show this help message
  --keystore <path>             Use keystore file for deployment
  --password <password>         Keystore password (not recommended for production)

Environment Variables:
  KEYSTORE_FILE                 Path to keystore file
  KEYSTORE_PASSWORD             Keystore password
  TREASURY_WALLET               Treasury wallet address (defaults to deployer)
  MAX_TOKENS_TO_SELL            Maximum tokens to sell in ICO

Examples:
  # Deploy with default Hardhat accounts
  npx hardhat run scripts/deployDiamond.js --network scrollSepolia
  
  # Deploy with keystore file
  KEYSTORE_FILE=./wallets/keystore.json KEYSTORE_PASSWORD=mypassword npx hardhat run scripts/deployDiamond.js --network scrollSepolia
  
  # Deploy with keystore file (interactive password)
  KEYSTORE_FILE=./wallets/keystore.json npx hardhat run scripts/deployDiamond.js --network scrollSepolia
  
  # Deploy with custom treasury wallet
  TREASURY_WALLET=0x1234... npx hardhat run scripts/deployDiamond.js --network scrollSepolia

Security Notes:
  - Keystore files provide encrypted wallet storage
  - Never commit keystore files or passwords to version control
  - Use environment variables for production deployments
  - Test on testnets before mainnet deployment

Generated Files:
  - deployments/<network>-diamond-deployment.json
  - deployments/<network>-diamond-deployment.txt
  - deployments/<network>-diamond-deployment.md
`);
    process.exit(0);
  }
  
  // Handle command line keystore options
  const keystoreIndex = args.indexOf("--keystore");
  if (keystoreIndex !== -1 && args[keystoreIndex + 1]) {
    process.env.KEYSTORE_FILE = args[keystoreIndex + 1];
  }
  
  const passwordIndex = args.indexOf("--password");
  if (passwordIndex !== -1 && args[passwordIndex + 1]) {
    process.env.KEYSTORE_PASSWORD = args[passwordIndex + 1];
  }

  deployDiamond()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error.message);
      process.exit(1);
    });
}

exports.deployDiamond = deployDiamond;
