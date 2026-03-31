const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * ICO Deployment Test Script
 * 
 * This script tests the deployed ICO contract to ensure it's working correctly.
 * It performs basic functionality tests without requiring actual token transfers.
 */

async function main() {
  console.log("🧪 Starting ICO Contract Tests...\n");

  // Get network information
  const network = await ethers.provider.getNetwork();
  let networkName = network.name === "unknown" ? "localhost" : network.name;
  
  // Handle hardhat network
  if (networkName === "hardhat") {
    networkName = "localhost";
  }
  console.log(`📡 Network: ${networkName} (Chain ID: ${network.chainId})`);

  // Get test account
  const [testAccount] = await ethers.getSigners();
  console.log(`👤 Test Account: ${testAccount.address}\n`);

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

  let testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Helper function to run tests
  async function runTest(testName, testFunction) {
    try {
      console.log(`🔍 Testing: ${testName}...`);
      await testFunction();
      console.log(`   ✅ PASSED\n`);
      testResults.passed++;
      testResults.tests.push({ name: testName, status: "PASSED" });
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}\n`);
      testResults.failed++;
      testResults.tests.push({ name: testName, status: "FAILED", error: error.message });
    }
  }

  // Test 1: Contract deployment verification
  await runTest("Contract Deployment Verification", async () => {
    const owner = await ico.owner();
    if (owner !== deploymentInfo.deployer) {
      throw new Error(`Owner mismatch: expected ${deploymentInfo.deployer}, got ${owner}`);
    }
  });

  // Test 2: Token contract verification
  await runTest("Token Contract Verification", async () => {
    const tokenAddress = await ico.token();
    if (tokenAddress !== deploymentInfo.contracts.token) {
      throw new Error(`Token address mismatch: expected ${deploymentInfo.contracts.token}, got ${tokenAddress}`);
    }
  });

  // Test 3: Price feed verification
  await runTest("Price Feed Verification", async () => {
    const prices = await ico.getCurrentPrices();
    
    // Check that prices are positive
    if (prices.ethPrice <= 0) throw new Error("ETH price is not positive");
    if (prices.usdtPrice <= 0) throw new Error("USDT price is not positive");
    if (prices.usdcPrice <= 0) throw new Error("USDC price is not positive");
    if (prices.btcPrice <= 0) throw new Error("BTC price is not positive");
    if (prices.scrPrice <= 0) throw new Error("SCR price is not positive");
    
    console.log(`   📈 ETH: $${ethers.formatEther(prices.ethPrice)}`);
    console.log(`   📈 USDT: $${ethers.formatEther(prices.usdtPrice)}`);
    console.log(`   📈 USDC: $${ethers.formatEther(prices.usdcPrice)}`);
    console.log(`   📈 BTC: $${ethers.formatEther(prices.btcPrice)}`);
    console.log(`   📈 SCR: $${ethers.formatEther(prices.scrPrice)}`);
  });

  // Test 4: Token calculation verification
  await runTest("Token Calculation Verification", async () => {
    const ethAmount = ethers.parseEther("0.1");
    const usdValue = await ico.getEthUsdPrice(ethAmount);
    const tokens = await ico.calculateTokens(usdValue);
    
    if (tokens <= 0) throw new Error("Token calculation returned zero or negative tokens");
    
    console.log(`   💰 ETH Amount: ${ethers.formatEther(ethAmount)} ETH`);
    console.log(`   💰 USD Value: $${ethers.formatEther(usdValue)}`);
    console.log(`   🪙 Tokens: ${ethers.formatEther(tokens)} MTTR`);
  });

  // Test 5: Preview function verification
  await runTest("Preview Function Verification", async () => {
    const ethAmount = ethers.parseEther("0.1");
    const preview = await ico.previewTokenPurchase("ETH", ethAmount);
    
    if (preview.tokensToReceive <= 0) throw new Error("Preview returned zero or negative tokens");
    if (preview.usdValue <= 0) throw new Error("Preview returned zero or negative USD value");
    
    console.log(`   🔍 Preview Tokens: ${ethers.formatEther(preview.tokensToReceive)} MTTR`);
    console.log(`   🔍 Preview USD: $${ethers.formatEther(preview.usdValue)}`);
  });

  // Test 6: Minimum purchase amounts verification
  await runTest("Minimum Purchase Amounts Verification", async () => {
    const minEth = await ico.minEthPurchase();
    const minUsdt = await ico.minUsdtPurchase();
    const minUsdc = await ico.minUsdcPurchase();
    const minWbtc = await ico.minWbtcPurchase();
    const minScr = await ico.minScrPurchase();
    
    if (minEth <= 0) throw new Error("Min ETH purchase is not positive");
    if (minUsdt <= 0) throw new Error("Min USDT purchase is not positive");
    if (minUsdc <= 0) throw new Error("Min USDC purchase is not positive");
    if (minWbtc <= 0) throw new Error("Min WBTC purchase is not positive");
    if (minScr <= 0) throw new Error("Min SCR purchase is not positive");
    
    console.log(`   📊 Min ETH: ${ethers.formatEther(minEth)} ETH`);
    console.log(`   📊 Min USDT: ${ethers.formatUnits(minUsdt, 6)} USDT`);
    console.log(`   📊 Min USDC: ${ethers.formatUnits(minUsdc, 6)} USDC`);
    console.log(`   📊 Min WBTC: ${ethers.formatUnits(minWbtc, 8)} WBTC`);
    console.log(`   📊 Min SCR: ${ethers.formatEther(minScr)} SCR`);
  });

  // Test 7: Slippage protection verification
  await runTest("Slippage Protection Verification", async () => {
    const maxSlippage = await ico.maxSlippageBps();
    const maxDeviation = await ico.maxPriceDeviationBps();
    
    if (maxSlippage <= 0) throw new Error("Max slippage is not positive");
    if (maxDeviation <= 0) throw new Error("Max price deviation is not positive");
    
    console.log(`   🛡️  Max Slippage: ${maxSlippage.toString()} bps (${(maxSlippage / 100).toFixed(1)}%)`);
    console.log(`   🛡️  Max Price Deviation: ${maxDeviation.toString()} bps (${(maxDeviation / 100).toFixed(1)}%)`);
  });

  // Test 8: Contract pause state verification
  await runTest("Contract Pause State Verification", async () => {
    const isPaused = await ico.paused();
    if (isPaused) {
      console.log(`   ⏸️  Contract is paused`);
    } else {
      console.log(`   ▶️  Contract is active`);
    }
  });

  // Test 9: Purchase statistics verification
  await runTest("Purchase Statistics Verification", async () => {
    const stats = await ico.getPurchaseStatistics();
    
    console.log(`   📊 Total USD Value ETH: $${ethers.formatEther(stats.totalUsdValueEth)}`);
    console.log(`   📊 Total USD Value USDT: $${ethers.formatEther(stats.totalUsdValueUsdt)}`);
    console.log(`   📊 Total USD Value USDC: $${ethers.formatEther(stats.totalUsdValueUsdc)}`);
    console.log(`   📊 Total USD Value WBTC: $${ethers.formatEther(stats.totalUsdValueWbtc)}`);
    console.log(`   📊 Total USD Value SCR: $${ethers.formatEther(stats.totalUsdValueScr)}`);
  });

  // Test 10: Token rate verification
  await runTest("Token Rate Verification", async () => {
    const tokenRate = await ico.TOKEN_RATE_USD();
    const expectedRate = ethers.parseEther("25"); // $25 per token
    
    if (tokenRate !== expectedRate) {
      throw new Error(`Token rate mismatch: expected ${ethers.formatEther(expectedRate)}, got ${ethers.formatEther(tokenRate)}`);
    }
    
    console.log(`   💰 Token Rate: $${ethers.formatEther(tokenRate)} per MTTR`);
  });

  // Display test results
  console.log("🎯 Test Results Summary:");
  console.log("=" * 50);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
  console.log("=" * 50);

  if (testResults.failed > 0) {
    console.log("\n❌ Failed Tests:");
    testResults.tests
      .filter(test => test.status === "FAILED")
      .forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
  }

  // Save test results
  const testResultsFile = path.join(__dirname, "..", "deployments", `${networkName}-ico-test-results.json`);
  const testResultsData = {
    network: networkName,
    chainId: network.chainId.toString(),
    timestamp: new Date().toISOString(),
    icoAddress: icoAddress,
    testAccount: testAccount.address,
    results: testResults
  };

  fs.writeFileSync(testResultsFile, JSON.stringify(testResultsData, null, 2));
  console.log(`\n💾 Test results saved to: ${testResultsFile}`);

  if (testResults.failed === 0) {
    console.log("\n🎉 All tests passed! The ICO contract is working correctly.");
  } else {
    console.log("\n⚠️  Some tests failed. Please review the issues above.");
    process.exit(1);
  }
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
