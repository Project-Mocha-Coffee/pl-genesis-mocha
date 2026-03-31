const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("📊 Reading ICO minimum investment amounts...\n");

  // Get the network name
  const networkName = hre.network.name;
  console.log(`📡 Network: ${networkName}`);

  // Load deployment info - try multiple possible file names
  const possibleFiles = [
    `deployments/${networkName}-ico-deployment.json`,
    `deployments/deployment-scroll-chain-534352-2025-09-26T09-14-05-430Z.json`,
    `deployments/scroll-ico-deployment.json`
  ];
  
  let deploymentInfo;
  let deploymentFile;
  
  for (const file of possibleFiles) {
    try {
      if (fs.existsSync(file)) {
        const deploymentData = fs.readFileSync(file, "utf8");
        deploymentInfo = JSON.parse(deploymentData);
        deploymentFile = file;
        console.log(`📄 Loaded deployment info from ${file}`);
        break;
      }
    } catch (error) {
      continue;
    }
  }
  
  if (!deploymentInfo) {
    console.error(`❌ Failed to load deployment info from any of: ${possibleFiles.join(", ")}`);
    process.exit(1);
  }

  // Get ICO address from deployment info
  const icoAddress = deploymentInfo.ico?.contract || deploymentInfo.contracts?.ico;
  if (!icoAddress) {
    console.error("❌ ICO contract address not found in deployment info");
    console.error("Available keys:", Object.keys(deploymentInfo));
    process.exit(1);
  }

  console.log(`📍 ICO Contract: ${icoAddress}`);

  // Connect to the ICO contract
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);

  // Get current minimum amounts
  console.log("\n📊 Current minimum amounts:");
  const currentMinEth = await ico.minEthPurchase();
  const currentMinUsdt = await ico.minUsdtPurchase();
  const currentMinUsdc = await ico.minUsdcPurchase();
  const currentMinWbtc = await ico.minWbtcPurchase();
  const currentMinScr = await ico.minScrPurchase();

  console.log(`   ETH: ${ethers.formatEther(currentMinEth)} ETH`);
  console.log(`   USDT: ${ethers.formatUnits(currentMinUsdt, 6)} USDT`);
  console.log(`   USDC: ${ethers.formatUnits(currentMinUsdc, 6)} USDC`);
  console.log(`   WBTC: ${ethers.formatUnits(currentMinWbtc, 8)} WBTC`);
  console.log(`   SCR: ${ethers.formatEther(currentMinScr)} SCR`);

  // Get other ICO parameters
  console.log("\n📊 Other ICO parameters:");
  const maxTokensToSell = await ico.maxTokensToSell();
  const totalTokensSold = await ico.totalTokensSold();
  const maxMBTTokensPerWallet = await ico.maxMBTTokensPerWallet();
  const tokenRateUsd = await ico.TOKEN_RATE_USD();
  const maxSlippageBps = await ico.maxSlippageBps();
  const maxPriceDeviationBps = await ico.maxPriceDeviationBps();

  console.log(`   Max tokens to sell: ${ethers.formatEther(maxTokensToSell)} MBT`);
  console.log(`   Total tokens sold: ${ethers.formatEther(totalTokensSold)} MBT`);
  console.log(`   Max MBT per wallet: ${ethers.formatEther(maxMBTTokensPerWallet)} MBT`);
  console.log(`   Token rate: $${ethers.formatEther(tokenRateUsd)} USD per MBT`);
  console.log(`   Max slippage: ${maxSlippageBps.toString()} bps (${(maxSlippageBps / 100).toFixed(1)}%)`);
  console.log(`   Max price deviation: ${maxPriceDeviationBps.toString()} bps (${(maxPriceDeviationBps / 100).toFixed(1)}%)`);

  // Get remaining tokens
  const remainingTokens = await ico.getRemainingTokens();
  console.log(`   Remaining tokens: ${ethers.formatEther(remainingTokens)} MBT`);

  // Check if ICO is active
  const isIcoActive = await ico.isIcoActive();
  console.log(`   ICO active: ${isIcoActive ? "✅ Yes" : "❌ No"}`);

  // Get treasury wallet
  const treasuryWallet = await ico.treasuryWallet();
  console.log(`   Treasury wallet: ${treasuryWallet}`);

  console.log("\n💡 To update minimum amounts, use:");
  console.log("   npx hardhat run scripts/update-ico-minimums.js --network <network>");
  console.log("   npx hardhat run scripts/update-ico-minimums-custom.js --network <network> [eth] [usdt] [usdc] [wbtc] [scr]");
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = main;
