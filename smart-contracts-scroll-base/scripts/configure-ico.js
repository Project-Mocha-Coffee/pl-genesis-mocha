const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * ICO Configuration Script
 * 
 * This script configures the ICO contract after deployment with:
 * - Minimum purchase amounts
 * - Slippage protection settings
 * - Price deviation protection settings
 * - Initial price recordings
 */

async function main() {
  console.log("🔧 Starting ICO Contract Configuration...\n");

  // Get network information
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  
  // Handle hardhat network
  if (networkName === "hardhat") {
    networkName = "localhost";
  }
  console.log(`📡 Network: ${networkName} (Chain ID: ${network.chainId})`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Configurer: ${deployer.address}\n`);

  // Load deployment information
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`❌ Deployment file not found: ${deploymentFile}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  console.log(`📋 ICO Contract Address: ${icoAddress}`);

  // Get ICO contract instance
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);

  // Configuration parameters
  const config = {
    // Minimum purchase amounts
    minEthPurchase: ethers.parseEther("0.001"), // 0.001 ETH
    minUsdtPurchase: ethers.parseUnits("1", 6), // 1 USDT
    minUsdcPurchase: ethers.parseUnits("1", 6), // 1 USDC
    minWbtcPurchase: ethers.parseUnits("0.0001", 8), // 0.0001 WBTC
    minScrPurchase: ethers.parseEther("1"), // 1 SCR
    
    // Slippage protection (5% default)
    maxSlippageBps: 500, // 5%
    
    // Price deviation protection (10% default)
    maxPriceDeviationBps: 1000, // 10%
  };

  console.log("⚙️  Configuring ICO contract...\n");

  try {
    // 1. Update minimum purchase amounts
    console.log("1️⃣  Setting minimum purchase amounts...");
    const tx1 = await ico.updateMinPurchase(
      config.minEthPurchase,
      config.minUsdtPurchase,
      config.minUsdcPurchase,
      config.minWbtcPurchase,
      config.minScrPurchase
    );
    await tx1.wait();
    console.log("   ✅ Minimum purchase amounts updated");

    // 2. Update slippage protection
    console.log("2️⃣  Setting slippage protection...");
    const tx2 = await ico.updateSlippageProtection(config.maxSlippageBps);
    await tx2.wait();
    console.log("   ✅ Slippage protection updated");

    // 3. Update price deviation protection
    console.log("3️⃣  Setting price deviation protection...");
    const tx3 = await ico.updatePriceDeviationProtection(config.maxPriceDeviationBps);
    await tx3.wait();
    console.log("   ✅ Price deviation protection updated");

    // 4. Record initial prices (for price deviation protection)
    console.log("4️⃣  Recording initial prices...");
    try {
      const prices = await ico.getCurrentPrices();
      
      // Record ETH price
      if (prices.ethPrice > 0) {
        const tx4a = await ico.updateRecordedPrice("ETH", prices.ethPrice);
        await tx4a.wait();
        console.log("   ✅ ETH price recorded");
      }
      
      // Record USDT price
      if (prices.usdtPrice > 0) {
        const tx4b = await ico.updateRecordedPrice("USDT", prices.usdtPrice);
        await tx4b.wait();
        console.log("   ✅ USDT price recorded");
      }
      
      // Record USDC price
      if (prices.usdcPrice > 0) {
        const tx4c = await ico.updateRecordedPrice("USDC", prices.usdcPrice);
        await tx4c.wait();
        console.log("   ✅ USDC price recorded");
      }
      
      // Record BTC price
      if (prices.btcPrice > 0) {
        const tx4d = await ico.updateRecordedPrice("BTC", prices.btcPrice);
        await tx4d.wait();
        console.log("   ✅ BTC price recorded");
      }
      
      // Record SCR price
      if (prices.scrPrice > 0) {
        const tx4e = await ico.updateRecordedPrice("SCR", prices.scrPrice);
        await tx4e.wait();
        console.log("   ✅ SCR price recorded");
      }
    } catch (error) {
      console.log(`   ⚠️  Price recording failed: ${error.message}`);
    }

    console.log("\n✅ ICO contract configuration completed successfully!");

    // Verify configuration
    console.log("\n🔍 Verifying configuration...");
    
    const minEth = await ico.minEthPurchase();
    const minUsdt = await ico.minUsdtPurchase();
    const minUsdc = await ico.minUsdcPurchase();
    const minWbtc = await ico.minWbtcPurchase();
    const minScr = await ico.minScrPurchase();
    const maxSlippage = await ico.maxSlippageBps();
    const maxDeviation = await ico.maxPriceDeviationBps();

    console.log("📊 Current Configuration:");
    console.log(`   Min ETH Purchase: ${ethers.formatEther(minEth)} ETH`);
    console.log(`   Min USDT Purchase: ${ethers.formatUnits(minUsdt, 6)} USDT`);
    console.log(`   Min USDC Purchase: ${ethers.formatUnits(minUsdc, 6)} USDC`);
    console.log(`   Min WBTC Purchase: ${ethers.formatUnits(minWbtc, 8)} WBTC`);
    console.log(`   Min SCR Purchase: ${ethers.formatEther(minScr)} SCR`);
    console.log(`   Max Slippage: ${maxSlippage.toString()} bps (${(maxSlippage / 100).toFixed(1)}%)`);
    console.log(`   Max Price Deviation: ${maxDeviation.toString()} bps (${(maxDeviation / 100).toFixed(1)}%)`);

    // Test price feeds
    console.log("\n🔍 Testing price feeds...");
    try {
      const prices = await ico.getCurrentPrices();
      console.log("📈 Current Prices:");
      console.log(`   ETH: $${ethers.formatEther(prices.ethPrice)}`);
      console.log(`   USDT: $${ethers.formatEther(prices.usdtPrice)}`);
      console.log(`   USDC: $${ethers.formatEther(prices.usdcPrice)}`);
      console.log(`   BTC: $${ethers.formatEther(prices.btcPrice)}`);
      console.log(`   SCR: $${ethers.formatEther(prices.scrPrice)}`);
    } catch (error) {
      console.log(`   ⚠️  Price feed test failed: ${error.message}`);
    }

    // Test token calculation
    console.log("\n🔍 Testing token calculation...");
    try {
      const ethAmount = ethers.parseEther("0.1");
      const usdValue = await ico.getEthUsdPrice(ethAmount);
      const tokens = await ico.calculateTokens(usdValue);
      console.log(`📊 Token Calculation Test:`);
      console.log(`   ETH Amount: ${ethers.formatEther(ethAmount)} ETH`);
      console.log(`   USD Value: $${ethers.formatEther(usdValue)}`);
      console.log(`   Tokens to Receive: ${ethers.formatEther(tokens)} MTTR`);
    } catch (error) {
      console.log(`   ⚠️  Token calculation test failed: ${error.message}`);
    }

    // Update deployment info with configuration
    deploymentInfo.configuration = {
      timestamp: new Date().toISOString(),
      configurer: deployer.address,
      parameters: config,
    };

    // Save updated deployment info
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Updated deployment info saved to: ${deploymentFile}`);

    console.log("\n🎉 ICO Contract Configuration Complete!");
    console.log("=" * 50);
    console.log("The ICO contract is now ready for use!");
    console.log("=" * 50);

  } catch (error) {
    console.error("❌ Configuration failed:", error);
    throw error;
  }
}

/**
 * Update Treasury Wallet Address
 * @param {string} newTreasuryWallet - The new treasury wallet address
 */
async function updateTreasuryWallet(newTreasuryWallet) {
  console.log("🏦 Updating Treasury Wallet...");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const tx = await ico.updateTreasuryWallet(newTreasuryWallet);
  await tx.wait();
  console.log(`✅ Treasury wallet updated to: ${newTreasuryWallet}`);
}

/**
 * Update Slippage Protection Settings
 * @param {number} maxSlippageBps - Maximum slippage in basis points (e.g., 500 = 5%)
 */
async function updateSlippageProtection(maxSlippageBps) {
  console.log("🛡️ Updating Slippage Protection...");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const tx = await ico.updateSlippageProtection(maxSlippageBps);
  await tx.wait();
  console.log(`✅ Slippage protection updated to: ${maxSlippageBps} bps (${(maxSlippageBps / 100).toFixed(1)}%)`);
}

/**
 * Update Price Deviation Protection Settings
 * @param {number} maxDeviationBps - Maximum price deviation in basis points (e.g., 1000 = 10%)
 */
async function updatePriceDeviationProtection(maxDeviationBps) {
  console.log("📊 Updating Price Deviation Protection...");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const tx = await ico.updatePriceDeviationProtection(maxDeviationBps);
  await tx.wait();
  console.log(`✅ Price deviation protection updated to: ${maxDeviationBps} bps (${(maxDeviationBps / 100).toFixed(1)}%)`);
}

/**
 * Update Maximum MBT Tokens Per Wallet
 * @param {string} newCap - The new cap in wei (use ethers.parseEther for tokens)
 */
async function updateMaxMBTTokensPerWallet(newCap) {
  console.log("👛 Updating Max MBT Tokens Per Wallet...");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const tx = await ico.updateMaxMBTTokensPerWallet(newCap);
  await tx.wait();
  console.log(`✅ Max MBT tokens per wallet updated to: ${ethers.formatEther(newCap)} MTTR`);
}

/**
 * Update Maximum Tokens To Sell
 * @param {string} newMaxTokens - The new maximum tokens to sell in wei
 */
async function updateMaxTokensToSell(newMaxTokens) {
  console.log("📈 Updating Max Tokens To Sell...");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const tx = await ico.updateMaxTokensToSell(newMaxTokens);
  await tx.wait();
  console.log(`✅ Max tokens to sell updated to: ${ethers.formatEther(newMaxTokens)} MTTR`);
}

/**
 * Manually Update Recorded Price for an Asset
 * @param {string} asset - Asset identifier ("ETH", "USDT", "USDC", "BTC", "SCR")
 * @param {string} price - New price to record in wei
 */
async function updateRecordedPrice(asset, price) {
  console.log(`💰 Updating Recorded Price for ${asset}...`);
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const tx = await ico.updateRecordedPrice(asset, price);
  await tx.wait();
  console.log(`✅ Recorded price for ${asset} updated to: ${ethers.formatEther(price)} USD`);
}

/**
 * Pause the ICO
 */
async function pauseICO() {
  console.log("⏸️ Pausing ICO...");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const tx = await ico.pause();
  await tx.wait();
  console.log("✅ ICO paused successfully");
}

/**
 * Unpause the ICO
 */
async function unpauseICO() {
  console.log("▶️ Unpausing ICO...");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const tx = await ico.unpause();
  await tx.wait();
  console.log("✅ ICO unpaused successfully");
}

/**
 * Emergency ETH Withdrawal
 */
async function emergencyWithdrawEth() {
  console.log("🚨 Emergency ETH Withdrawal...");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const balance = await ethers.provider.getBalance(icoAddress);
  console.log(`Contract ETH balance: ${ethers.formatEther(balance)} ETH`);
  
  const tx = await ico.emergencyWithdrawEth();
  await tx.wait();
  console.log("✅ Emergency ETH withdrawal completed");
}

/**
 * Emergency ERC20 Token Withdrawal (Full Balance)
 * @param {string} tokenAddress - The address of the ERC20 token to withdraw
 */
async function emergencyWithdrawErc20(tokenAddress) {
  console.log(`🚨 Emergency ERC20 Withdrawal for token: ${tokenAddress}...`);
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const token = await ethers.getContractAt("IERC20", tokenAddress);
  const balance = await token.balanceOf(icoAddress);
  console.log(`Contract token balance: ${ethers.formatEther(balance)} tokens`);
  
  const tx = await ico.emergencyWithdrawErc20(tokenAddress);
  await tx.wait();
  console.log("✅ Emergency ERC20 withdrawal completed");
}

/**
 * Emergency Withdraw Specific Amount of Tokens
 * @param {string} tokenAddress - The address of the ERC20 token to withdraw
 * @param {string} amount - The amount to withdraw in wei
 */
async function emergencyWithdraw(tokenAddress, amount) {
  console.log(`🚨 Emergency Withdrawal: ${ethers.formatEther(amount)} tokens from ${tokenAddress}...`);
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const tx = await ico.emergencyWithdraw(tokenAddress, amount);
  await tx.wait();
  console.log("✅ Emergency withdrawal completed");
}

/**
 * Grant Admin Role to an Account
 * @param {string} account - The account address to grant admin role to
 */
async function grantAdminRole(account) {
  console.log(`👑 Granting Admin Role to: ${account}...`);
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const tx = await ico.grantAdminRole(account);
  await tx.wait();
  console.log(`✅ Admin role granted to: ${account}`);
}

/**
 * Revoke Admin Role from an Account
 * @param {string} account - The account address to revoke admin role from
 */
async function revokeAdminRole(account) {
  console.log(`🚫 Revoking Admin Role from: ${account}...`);
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const tx = await ico.revokeAdminRole(account);
  await tx.wait();
  console.log(`✅ Admin role revoked from: ${account}`);
}

/**
 * Check if an Account has Admin Role
 * @param {string} account - The account address to check
 */
async function hasAdminRole(account) {
  console.log(`🔍 Checking Admin Role for: ${account}...`);
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const hasRole = await ico.hasAdminRole(account);
  console.log(`${account} has admin role: ${hasRole}`);
  return hasRole;
}

/**
 * Get ICO Status and Statistics
 */
async function getICOStatus() {
  console.log("📊 Getting ICO Status...");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const [
    totalTokensSold,
    maxTokensToSell,
    remainingTokens,
    isActive,
    isPaused,
    treasuryWallet,
    maxSlippageBps,
    maxPriceDeviationBps,
    maxMBTTokensPerWallet
  ] = await Promise.all([
    ico.totalTokensSold(),
    ico.maxTokensToSell(),
    ico.getRemainingTokens(),
    ico.isIcoActive(),
    ico.paused(),
    ico.treasuryWallet(),
    ico.maxSlippageBps(),
    ico.maxPriceDeviationBps(),
    ico.maxMBTTokensPerWallet()
  ]);
  
  console.log("📈 ICO Status:");
  console.log(`   Total Tokens Sold: ${ethers.formatEther(totalTokensSold)} MTTR`);
  console.log(`   Max Tokens To Sell: ${ethers.formatEther(maxTokensToSell)} MTTR`);
  console.log(`   Remaining Tokens: ${ethers.formatEther(remainingTokens)} MTTR`);
  console.log(`   Is Active: ${isActive}`);
  console.log(`   Is Paused: ${isPaused}`);
  console.log(`   Treasury Wallet: ${treasuryWallet}`);
  console.log(`   Max Slippage: ${maxSlippageBps.toString()} bps (${(maxSlippageBps / 100).toFixed(1)}%)`);
  console.log(`   Max Price Deviation: ${maxPriceDeviationBps.toString()} bps (${(maxPriceDeviationBps / 100).toFixed(1)}%)`);
  console.log(`   Max MBT Tokens Per Wallet: ${ethers.formatEther(maxMBTTokensPerWallet)} MTTR`);
  
  return {
    totalTokensSold,
    maxTokensToSell,
    remainingTokens,
    isActive,
    isPaused,
    treasuryWallet,
    maxSlippageBps,
    maxPriceDeviationBps,
    maxMBTTokensPerWallet
  };
}

/**
 * Get All Token and Price Feed Addresses
 * ⚠️  NOTE: These addresses are IMMUTABLE and cannot be updated after deployment
 */
async function getTokenAndFeedAddresses() {
  console.log("🔗 Getting Token and Price Feed Addresses...");
  console.log("⚠️  NOTE: These addresses are IMMUTABLE and cannot be updated after deployment");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const [
    tokenAddress,
    usdtAddress,
    usdcAddress,
    wbtcAddress,
    scrAddress
  ] = await Promise.all([
    ico.token(),
    ico.usdt(),
    ico.usdc(),
    ico.wbtc(),
    ico.scr()
  ]);
  
  console.log("🪙 Token Addresses:");
  console.log(`   ICO Token (MTTR): ${tokenAddress}`);
  console.log(`   USDT: ${usdtAddress}`);
  console.log(`   USDC: ${usdcAddress}`);
  console.log(`   WBTC: ${wbtcAddress}`);
  console.log(`   SCR: ${scrAddress}`);
  
  // Note: Price feed addresses are private, so we can't read them directly
  // They would need to be stored in deployment info or made public in the contract
  
  return {
    tokenAddress,
    usdtAddress,
    usdcAddress,
    wbtcAddress,
    scrAddress
  };
}

/**
 * Validate Token Addresses
 * Checks if the token addresses are valid and accessible
 */
async function validateTokenAddresses() {
  console.log("✅ Validating Token Addresses...");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  const addresses = await getTokenAndFeedAddresses();
  const validationResults = {};
  
  // Validate each token address
  for (const [tokenName, address] of Object.entries(addresses)) {
    try {
      if (address === ethers.ZeroAddress) {
        validationResults[tokenName] = { valid: false, error: "Zero address" };
        continue;
      }
      
      const code = await ethers.provider.getCode(address);
      if (code === "0x") {
        validationResults[tokenName] = { valid: false, error: "No contract at address" };
        continue;
      }
      
      // Try to get token info
      if (tokenName !== "tokenAddress") {
        const token = await ethers.getContractAt("IERC20", address);
        const [name, symbol, decimals] = await Promise.all([
          token.name().catch(() => "Unknown"),
          token.symbol().catch(() => "Unknown"),
          token.decimals().catch(() => 18)
        ]);
        
        validationResults[tokenName] = {
          valid: true,
          name,
          symbol,
          decimals: decimals.toString()
        };
      } else {
        // For the main ICO token, try to get more info
        const token = await ethers.getContractAt("ERC20", address);
        const [name, symbol, decimals, totalSupply] = await Promise.all([
          token.name().catch(() => "Unknown"),
          token.symbol().catch(() => "Unknown"),
          token.decimals().catch(() => 18),
          token.totalSupply().catch(() => 0)
        ]);
        
        validationResults[tokenName] = {
          valid: true,
          name,
          symbol,
          decimals: decimals.toString(),
          totalSupply: ethers.formatEther(totalSupply)
        };
      }
    } catch (error) {
      validationResults[tokenName] = { valid: false, error: error.message };
    }
  }
  
  console.log("📋 Validation Results:");
  for (const [tokenName, result] of Object.entries(validationResults)) {
    if (result.valid) {
      console.log(`   ✅ ${tokenName}: ${result.symbol} (${result.name}) - ${result.decimals} decimals`);
      if (result.totalSupply) {
        console.log(`      Total Supply: ${result.totalSupply} ${result.symbol}`);
      }
    } else {
      console.log(`   ❌ ${tokenName}: ${result.error}`);
    }
  }
  
  return validationResults;
}

/**
 * Get Current Price Feed Information
 * Tests the price feeds to ensure they're working
 */
async function testPriceFeeds() {
  console.log("📊 Testing Price Feeds...");
  
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";
  
  const [deployer] = await ethers.getSigners();
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-deployment.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;
  
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);
  
  try {
    const prices = await ico.getCurrentPrices();
    
    console.log("💰 Current Prices:");
    console.log(`   ETH: $${ethers.formatEther(prices.ethPrice)}`);
    console.log(`   USDT: $${ethers.formatEther(prices.usdtPrice)}`);
    console.log(`   USDC: $${ethers.formatEther(prices.usdcPrice)}`);
    console.log(`   BTC: $${ethers.formatEther(prices.btcPrice)}`);
    console.log(`   SCR: $${ethers.formatEther(prices.scrPrice)}`);
    
    return prices;
  } catch (error) {
    console.log(`❌ Price feed test failed: ${error.message}`);
    return null;
  }
}

/**
 * Display Address Update Information
 * Shows information about immutable addresses and potential solutions
 */
function displayAddressUpdateInfo() {
  console.log("ℹ️  Address Update Information:");
  console.log("=" * 60);
  console.log("🔒 IMMUTABLE ADDRESSES:");
  console.log("   The following addresses are set as 'immutable' in the ICO contract:");
  console.log("   • ICO Token Address (MTTR)");
  console.log("   • USDT Token Address");
  console.log("   • USDC Token Address");
  console.log("   • WBTC Token Address");
  console.log("   • SCR Token Address");
  console.log("   • ETH/USD Price Feed Address");
  console.log("   • USDT/USD Price Feed Address");
  console.log("   • USDC/USD Price Feed Address");
  console.log("   • BTC/USD Price Feed Address");
  console.log("   • SCR/USD Price Feed Address");
  console.log("");
  console.log("⚠️  These addresses CANNOT be updated after deployment!");
  console.log("");
  console.log("💡 POTENTIAL SOLUTIONS:");
  console.log("   1. Deploy a new ICO contract with updated addresses");
  console.log("   2. Use a proxy pattern for upgradeable contracts");
  console.log("   3. Implement a factory pattern for ICO creation");
  console.log("   4. Use a diamond pattern for modular upgrades");
  console.log("");
  console.log("🔧 CURRENT WORKAROUNDS:");
  console.log("   • Update treasury wallet (mutable)");
  console.log("   • Update protection settings (mutable)");
  console.log("   • Update token limits (mutable)");
  console.log("   • Pause/unpause ICO (mutable)");
  console.log("   • Emergency withdrawals (mutable)");
  console.log("=" * 60);
}

/**
 * Update ERC20 Payment Token Address
 * @param {"USDT"|"USDC"|"WBTC"|"SCR"} asset - The asset identifier
 * @param {string} newAddress - The new ERC20 token contract address
 */
async function updatePaymentTokenAddress(asset, newAddress) {
  console.log(`🔁 Updating payment token address for ${asset} -> ${newAddress} ...`);

  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  if (networkName === "hardhat") networkName = "localhost";

  if (!newAddress || newAddress === ethers.ZeroAddress) {
    throw new Error("Invalid newAddress supplied");
  }

  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `${networkName}-ico-deployment.json`
  );
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const icoAddress = deploymentInfo.contracts.ico;

  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);

  const tx = await ico.updatePaymentTokenAddress(asset, newAddress);
  await tx.wait();
  console.log(`✅ Updated ${asset} token address to ${newAddress}`);
}

// Export functions for use in other scripts
module.exports = {
  main,
  updateTreasuryWallet,
  updateSlippageProtection,
  updatePriceDeviationProtection,
  updateMaxMBTTokensPerWallet,
  updateMaxTokensToSell,
  updateRecordedPrice,
  pauseICO,
  unpauseICO,
  emergencyWithdrawEth,
  emergencyWithdrawErc20,
  emergencyWithdraw,
  grantAdminRole,
  revokeAdminRole,
  hasAdminRole,
  getICOStatus,
  getTokenAndFeedAddresses,
  validateTokenAddresses,
  testPriceFeeds,
  displayAddressUpdateInfo,
  updatePaymentTokenAddress
};

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Configuration failed:", error);
    process.exit(1);
  });
