const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration for different networks
const NETWORK_CONFIG = {
  // Scroll Mainnet
  scroll: {
    // Chainlink Price Feeds on Scroll Mainnet
    priceFeeds: {
      ETH_USD: "0x6bF14CB0A831078629D993FDeBcB182b21A8774C", // ETH/USD
      USDT_USD: "0xf376A91Ae078927eb3686D6010a6f1482424954E", // USDT/USD (placeholder)
      USDC_USD: "0x43d12Fb3AfCAd5347fA764EeAB105478337b7200", // USDC/USD (placeholder)
      BTC_USD: "0x61C432B58A43516899d8dF33A5F57edb8d57EB77", // BTC/USD (placeholder)
      SCR_USD: "0x26f6F7C468EE309115d19Aa2055db5A74F8cE7A5", // SCR/USD (placeholder)
    },
    // Token addresses on Scroll Mainnet
    tokens: {
      USDT: "0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df", // USDT (placeholder)
      USDC: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4", // USDC (placeholder)
      WBTC: "0x3C1BCa5a656e69edCD0D4E36BEbb3FcDAcA60Cf1", // WBTC (placeholder)
      SCR: "0xd29687c813D741E2F938F4aC377128810E217b1b", // SCR (placeholder)
    },
  },
  // Scroll Sepolia Testnet
  scrollSepolia: {
    // Chainlink Price Feeds on Scroll Sepolia
    priceFeeds: {
      ETH_USD: "0x59F1ec1f10bD7eD9B938431086bC1D9e233ECf41", // ETH/USD
      USDT_USD: "0xb84a700192A78103B2dA2530D99718A2a954cE86", // USDT/USD (placeholder - need actual address)
      USDC_USD: "0xFadA8b0737D4A3AE7118918B7E69E689034c0127", // USDC/USD (placeholder - need actual address)
      BTC_USD: "0x87dce67002e66C17BC0d723Fe20D736b80CAaFda", // BTC/USD (placeholder - need actual address)
      SCR_USD: "0x59F1ec1f10bD7eD9B938431086bC1D9e233ECf41", // SCR/USD (placeholder - need actual address)
    },
    // Token addresses on Scroll Sepolia
  /*   tokens: {
      USDT: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // USDT (placeholder - need actual address)
      USDC: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // USDC (placeholder - need actual address)
      WBTC: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // WBTC (placeholder - need actual address)
      SCR: "0x168A5d4b4C0B4B4B4B4B4B4B4B4B4B4B4B4B4B4B", // SCR (placeholder - need actual address)
    }, */
  },
  // Local development
  localhost: {
    // Mock addresses for local development
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
    // Mock addresses for hardhat network
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
  // ICO Configuration
  maxTokensToSell: ethers.parseEther("2000"), // 1M tokens max (can be overridden via env var)
  
  // Minimum purchase amounts
  minEthPurchase: ethers.parseEther("0.00025"), // 0.001 ETH
  minUsdtPurchase: ethers.parseUnits("1", 6), // 1 USDT (6 decimals)
  minUsdcPurchase: ethers.parseUnits("1", 6), // 1 USDC (6 decimals)
  minWbtcPurchase: ethers.parseUnits("0.00000909", 8), // 0.0001 WBTC (8 decimals)
  minScrPurchase: ethers.parseEther("4.54545"), // 1 SCR (18 decimals)
  
  // Slippage protection (5% default)
  maxSlippageBps: 500, // 5%
  
  // Price deviation protection (10% default)
  maxPriceDeviationBps: 1000, // 10%
};

async function main() {
  console.log("🚀 Starting ICO Contract Deployment...\n");

  // Get network information
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  console.log(`📡 Network: ${networkName} (Chain ID: ${network.chainId})`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Deployer Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // Get network configuration
  const config = NETWORK_CONFIG[networkName];
  if (!config) {
    throw new Error(`❌ No configuration found for network: ${networkName}`);
  }

  // Check if we need to deploy mock contracts for local development
  let tokenAddress, priceFeedAddresses, tokenAddresses;
  
  if (networkName === "localhost" || networkName === "hardhat") {
    console.log("🔧 Deploying mock contracts for local development...\n");
    
    // Deploy mock token (MochaTreeRightsToken)
    const MockToken = await ethers.getContractFactory("MockMintableToken");
    const mockToken = await MockToken.deploy("Mocha Tree Rights Token", "MTTR", 18);
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    console.log(`✅ Mock Token deployed at: ${tokenAddress}`);

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
    console.log("🔧 Deploying mock ERC20 tokens for Scroll Sepolia...\n");

    // Use configured Chainlink feeds (if available) for scrollSepolia
    priceFeedAddresses = NETWORK_CONFIG.scrollSepolia.priceFeeds;

    // Deploy mock ERC20 tokens with correct decimals
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

    // MTTR/ICO token: use existing MBT token on Scroll Sepolia via env var
    tokenAddress = "0xb75083585DcB841b8B04ffAC89c78a16f2a5598B";
    if (!tokenAddress) {
      throw new Error("❌ MBT_TOKEN_ADDRESS environment variable not set for Scroll Sepolia deployment");
    }

    console.log(`✅ Using MBT Token at: ${tokenAddress}`);
    console.log("✅ Mock ERC20 Tokens deployed:");
    console.log(`   USDT: ${tokenAddresses.USDT}`);
    console.log(`   USDC: ${tokenAddresses.USDC}`);
    console.log(`   WBTC: ${tokenAddresses.WBTC}`);
    console.log(`   SCR: ${tokenAddresses.SCR}\n`);
  } else {
    // Use configured addresses for mainnet/testnet
    console.log("🌐 Using configured addresses for mainnet/testnet...\n");
    
    // For production, you would need to deploy the actual MochaTreeRightsToken first
    // or provide the address of an existing deployment
    tokenAddress = "0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1";
    if (!tokenAddress) {
      throw new Error("❌ MTTR_TOKEN_ADDRESS environment variable not set for production deployment");
    }
    
    priceFeedAddresses = config.priceFeeds;
    tokenAddresses = config.tokens;
    
    console.log(`📋 Using configured addresses:`);
    console.log(`   MTTR Token: ${tokenAddress}`);
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
  const treasuryWallet = "0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795";
  const maxTokensToSell = DEFAULT_PARAMS.maxTokensToSell;
  
  console.log(`📋 ICO Configuration:`);
  console.log(`   Max Tokens to Sell: ${ethers.formatEther(maxTokensToSell)}`);
  console.log(`   Treasury Wallet: ${treasuryWallet}`);
  console.log(`   Token Address: ${tokenAddress}\n`);
  
  const ico = await ICO.deploy(
    tokenAddress,
    maxTokensToSell,
    treasuryWallet,
    priceFeedAddresses.ETH_USD,
    priceFeedAddresses.USDT_USD,
    priceFeedAddresses.USDC_USD,
    priceFeedAddresses.BTC_USD,
    priceFeedAddresses.SCR_USD,
    tokenAddresses.USDT,
    tokenAddresses.USDC,
    tokenAddresses.WBTC,
    tokenAddresses.SCR
  );

  await ico.waitForDeployment();
  const icoAddress = await ico.getAddress();
  console.log(`✅ ICO contract deployed at: ${icoAddress}\n`);

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const tokenContract = await ethers.getContractAt("contracts/tokens/MochaBeanToken.sol:MochaBeanToken", tokenAddress);
  const tokenName = await tokenContract.name();
  const tokenSymbol = await tokenContract.symbol();
  const tokenDecimals = await tokenContract.decimals();
  
  console.log(`✅ Token verification:`);
  console.log(`   Name: ${tokenName}`);
  console.log(`   Symbol: ${tokenSymbol}`);
  console.log(`   Decimals: ${tokenDecimals}`);

  // Test price feeds
  console.log(`✅ Price feed verification:`);
  try {
    const ethPrice = await ico.getEthUsdPrice(ethers.parseEther("1"));
    console.log(`   ETH Price: $${ethers.formatEther(ethPrice)}`);
  } catch (error) {
    console.log(`   ⚠️  ETH Price feed test failed: ${error.message}`);
  }

  // Save deployment information
  const deploymentInfo = {
    network: networkName,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ico: icoAddress,
      token: tokenAddress,
      priceFeeds: priceFeedAddresses,
      tokens: tokenAddresses,
    },
    parameters: {
      ...DEFAULT_PARAMS,
      maxTokensToSell: maxTokensToSell.toString(),
      treasuryWallet: treasuryWallet,
    },
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info (convert BigInt -> string for JSON)
  const deploymentFile = path.join(deploymentsDir, `${networkName}-ico-deployment.json`);
  const jsonSafe = JSON.stringify(
    deploymentInfo,
    (key, value) => (typeof value === 'bigint' ? value.toString() : value),
    2
  );
  fs.writeFileSync(deploymentFile, jsonSafe);
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

  // Save a Markdown summary alongside the JSON for easy sharing
  const mdLines = [];
  mdLines.push(`# ICO Deployment (${networkName})`);
  mdLines.push("");
  mdLines.push(`- Timestamp: ${deploymentInfo.timestamp}`);
  mdLines.push(`- Chain ID: ${deploymentInfo.chainId}`);
  mdLines.push("\n## Contracts");
  mdLines.push(`- ICO: ${icoAddress}`);
  mdLines.push(`- MBT Token: ${tokenAddress}`);
  mdLines.push("\n### Price Feeds");
  mdLines.push(`- ETH/USD: ${priceFeedAddresses.ETH_USD}`);
  mdLines.push(`- USDT/USD: ${priceFeedAddresses.USDT_USD}`);
  mdLines.push(`- USDC/USD: ${priceFeedAddresses.USDC_USD}`);
  mdLines.push(`- BTC/USD: ${priceFeedAddresses.BTC_USD}`);
  mdLines.push(`- SCR/USD: ${priceFeedAddresses.SCR_USD}`);
  mdLines.push("\n### Payment Tokens");
  mdLines.push(`- USDT: ${tokenAddresses.USDT}`);
  mdLines.push(`- USDC: ${tokenAddresses.USDC}`);
  mdLines.push(`- WBTC: ${tokenAddresses.WBTC}`);
  mdLines.push(`- SCR: ${tokenAddresses.SCR}`);
  mdLines.push("\n## Parameters");
  mdLines.push(`- maxTokensToSell: ${maxTokensToSell.toString()}`);
  mdLines.push(`- treasuryWallet: ${treasuryWallet}`);
  mdLines.push(`- minEthPurchase: ${DEFAULT_PARAMS.minEthPurchase.toString()}`);
  mdLines.push(`- minUsdtPurchase: ${DEFAULT_PARAMS.minUsdtPurchase.toString()}`);
  mdLines.push(`- minUsdcPurchase: ${DEFAULT_PARAMS.minUsdcPurchase.toString()}`);
  mdLines.push(`- minWbtcPurchase: ${DEFAULT_PARAMS.minWbtcPurchase.toString()}`);
  mdLines.push(`- minScrPurchase: ${DEFAULT_PARAMS.minScrPurchase.toString()}`);
  mdLines.push(`- maxSlippageBps: ${DEFAULT_PARAMS.maxSlippageBps}`);
  mdLines.push(`- maxPriceDeviationBps: ${DEFAULT_PARAMS.maxPriceDeviationBps}`);

  const mdFile = path.join(deploymentsDir, `${networkName}-ico-deployment.md`);
  fs.writeFileSync(mdFile, mdLines.join("\n"));
  console.log(`💾 Deployment markdown saved to: ${mdFile}`);

  // Display summary
  console.log("\n🎉 Deployment Summary:");
  console.log("=".repeat(50));
  console.log(`Network: ${networkName}`);
  console.log(`ICO Contract: ${icoAddress}`);
  console.log(`Token Contract: ${tokenAddress}`);
  console.log(`Treasury Wallet: ${treasuryWallet}`);
  console.log(`Max Tokens to Sell: ${ethers.formatEther(maxTokensToSell)}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Gas Used: ${(await ico.deploymentTransaction().wait()).gasUsed.toString()}`);
  console.log("=".repeat(50));

  // Display next steps
  console.log("\n📋 Next Steps:");
  console.log("1. Verify the contract on block explorer (if on mainnet/testnet)");
  console.log("2. Set up initial configuration (minimum purchases, slippage protection)");
  console.log("3. Grant necessary permissions to the ICO contract");
  console.log("4. Update treasury wallet address if needed (currently set to deployer)");
  console.log("5. Test the contract with small amounts");
  console.log("6. Update frontend with the new contract address");

  // Display contract interaction examples
  console.log("\n🔧 Contract Interaction Examples:");
  console.log("```javascript");
  console.log("// Get current prices");
  console.log("const prices = await ico.getCurrentPrices();");
  console.log("console.log('ETH Price:', ethers.formatEther(prices.ethPrice));");
  console.log("");
  console.log("// Preview token purchase");
  console.log("const preview = await ico.previewTokenPurchase('ETH', ethers.parseEther('0.1'));");
  console.log("console.log('Tokens to receive:', ethers.formatEther(preview.tokensToReceive));");
  console.log("");
  console.log("// Buy tokens with ETH (funds automatically go to treasury)");
  console.log("await ico.buyTokensWithEth(userAddress, 0, { value: ethers.parseEther('0.1') });");
  console.log("");
  console.log("// Update treasury wallet (admin only)");
  console.log("await ico.updateTreasuryWallet(newTreasuryAddress);");
  console.log("");
  console.log("// Check ICO status");
  console.log("const remaining = await ico.getRemainingTokens();");
  console.log("const isActive = await ico.isIcoActive();");
  console.log("console.log('Remaining tokens:', ethers.formatEther(remaining));");
  console.log("console.log('ICO active:', isActive);");
  console.log("```");

  return {
    icoAddress,
    tokenAddress,
    priceFeedAddresses,
    tokenAddresses,
    deploymentInfo,
  };
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
