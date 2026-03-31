const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Updating ICO minimum investment amounts (Custom)...\n");

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

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);

  // Connect to the ICO contract
  const ICO = await ethers.getContractFactory("ICO");
  const ico = ICO.attach(icoAddress);

  // Check if deployer has admin role
  const hasAdminRole = await ico.hasAdminRole(deployer.address);
  if (!hasAdminRole) {
    console.error("❌ Deployer does not have admin role");
    process.exit(1);
  }
  console.log("✅ Deployer has admin role");

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

  // Parse command line arguments or use environment variables
  const args = process.argv.slice(2);
  
  // Helper function to parse amounts from command line
  function parseAmount(amountStr, decimals = 18) {
    if (!amountStr || amountStr === "0") return "0";
    return ethers.parseUnits(amountStr, decimals).toString();
  }

  // Get new minimum amounts from command line arguments or environment variables
  const newMinimums = {
    // ETH minimum (in ETH units)
    minEth: parseAmount(
      args[0] || process.env.MIN_ETH || "0.01", 
      18
    ),
    
    // USDT minimum (in USDT units, 6 decimals)
    minUsdt: parseAmount(
      args[1] || process.env.MIN_USDT || "10", 
      6
    ),
    
    // USDC minimum (in USDC units, 6 decimals)
    minUsdc: parseAmount(
      args[2] || process.env.MIN_USDC || "10", 
      6
    ),
    
    // WBTC minimum (in WBTC units, 8 decimals)
    minWbtc: parseAmount(
      args[3] || process.env.MIN_WBTC || "0.001", 
      8
    ),
    
    // SCR minimum (in SCR units, 18 decimals)
    minScr: parseAmount(
      args[4] || process.env.MIN_SCR || "10", 
      18
    )
  };

  console.log("\n🔄 New minimum amounts to set:");
  console.log(`   ETH: ${ethers.formatEther(newMinimums.minEth)} ETH`);
  console.log(`   USDT: ${ethers.formatUnits(newMinimums.minUsdt, 6)} USDT`);
  console.log(`   USDC: ${ethers.formatUnits(newMinimums.minUsdc, 6)} USDC`);
  console.log(`   WBTC: ${ethers.formatUnits(newMinimums.minWbtc, 8)} WBTC`);
  console.log(`   SCR: ${ethers.formatEther(newMinimums.minScr)} SCR`);

  // Convert to BigInt for contract call
  const contractMinimums = {
    minEth: BigInt(newMinimums.minEth),
    minUsdt: BigInt(newMinimums.minUsdt),
    minUsdc: BigInt(newMinimums.minUsdc),
    minWbtc: BigInt(newMinimums.minWbtc),
    minScr: BigInt(newMinimums.minScr)
  };

  // Update the minimum amounts
  console.log("\n⏳ Updating minimum amounts...");
  
  try {
    const tx = await ico.updateMinPurchase(
      contractMinimums.minEth,
      contractMinimums.minUsdt,
      contractMinimums.minUsdc,
      contractMinimums.minWbtc,
      contractMinimums.minScr
    );

    console.log(`📝 Transaction submitted: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

    // Verify the changes
    console.log("\n🔍 Verifying updated minimum amounts:");
    const updatedMinEth = await ico.minEthPurchase();
    const updatedMinUsdt = await ico.minUsdtPurchase();
    const updatedMinUsdc = await ico.minUsdcPurchase();
    const updatedMinWbtc = await ico.minWbtcPurchase();
    const updatedMinScr = await ico.minScrPurchase();

    console.log(`   ETH: ${ethers.formatEther(updatedMinEth)} ETH`);
    console.log(`   USDT: ${ethers.formatUnits(updatedMinUsdt, 6)} USDT`);
    console.log(`   USDC: ${ethers.formatUnits(updatedMinUsdc, 6)} USDC`);
    console.log(`   WBTC: ${ethers.formatUnits(updatedMinWbtc, 8)} WBTC`);
    console.log(`   SCR: ${ethers.formatEther(updatedMinScr)} SCR`);

    // Check if all values were updated correctly
    const allUpdated = 
      updatedMinEth === contractMinimums.minEth &&
      updatedMinUsdt === contractMinimums.minUsdt &&
      updatedMinUsdc === contractMinimums.minUsdc &&
      updatedMinWbtc === contractMinimums.minWbtc &&
      updatedMinScr === contractMinimums.minScr;

    if (allUpdated) {
      console.log("\n✅ All minimum amounts updated successfully!");
    } else {
      console.log("\n⚠️  Some minimum amounts may not have been updated correctly");
    }

    // Save the updated deployment info
    const updatedDeploymentInfo = {
      ...deploymentInfo,
      lastUpdated: new Date().toISOString(),
      minimumAmounts: {
        ETH: newMinimums.minEth,
        USDT: newMinimums.minUsdt,
        USDC: newMinimums.minUsdc,
        WBTC: newMinimums.minWbtc,
        SCR: newMinimums.minScr
      }
    };

    fs.writeFileSync(deploymentFile, JSON.stringify(updatedDeploymentInfo, null, 2));
    console.log(`💾 Updated deployment info saved to ${deploymentFile}`);

  } catch (error) {
    console.error("❌ Failed to update minimum amounts:", error.message);
    
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    
    if (error.code) {
      console.error("   Error code:", error.code);
    }
    
    process.exit(1);
  }
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
