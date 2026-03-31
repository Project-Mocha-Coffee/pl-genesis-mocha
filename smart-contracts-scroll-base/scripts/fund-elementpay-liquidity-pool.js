const { ethers } = require("hardhat");
const hre = require("hardhat");
require("dotenv").config();

/**
 * Script to fund ElementPay liquidity pool with MBT tokens
 * 
 * This script transfers MBT tokens from the deployer/admin wallet
 * to ElementPay's liquidity pool contract for M-PESA payment processing.
 * 
 * Usage:
 *   npm run fund:elementpay:scroll    # Scroll Mainnet
 *   npm run fund:elementpay:base       # Base Mainnet
 */

// Configuration - UPDATE THESE VALUES
const ELEMENTPAY_LIQUIDITY_POOL_ADDRESS = process.env.ELEMENTPAY_LIQUIDITY_POOL_ADDRESS || "0x0000000000000000000000000000000000000000";
const MBT_AMOUNT_TO_TRANSFER = process.env.MBT_AMOUNT || ethers.parseEther("10000"); // Default: 10,000 MBT

async function main() {
  const network = hre.network.name;
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log("💰 Fund ElementPay Liquidity Pool");
  console.log("=".repeat(60));
  console.log(`Network: ${network} (Chain ID: ${chainId})\n`);

  // Validate ElementPay address
  if (!ELEMENTPAY_LIQUIDITY_POOL_ADDRESS || ELEMENTPAY_LIQUIDITY_POOL_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("❌ ELEMENTPAY_LIQUIDITY_POOL_ADDRESS not set in .env file");
  }

  // Get deployer
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not set in .env file");
  }
  
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
  console.log("Deployer:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer ETH balance:", ethers.formatEther(balance), "ETH\n");

  // Get MBT contract address based on network
  let mbtAddress;
  if (chainId === 534352n) { // Scroll Mainnet
    mbtAddress = "0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1";
  } else if (chainId === 8453n) { // Base Mainnet
    mbtAddress = "0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a";
  } else {
    throw new Error(`Unsupported network. Please provide MBT address for chain ID ${chainId}`);
  }

  console.log("MBT Token Address:", mbtAddress);
  console.log("ElementPay Liquidity Pool:", ELEMENTPAY_LIQUIDITY_POOL_ADDRESS);
  console.log("Amount to Transfer:", ethers.formatEther(MBT_AMOUNT_TO_TRANSFER), "MBT\n");

  // Get MBT contract instance
  const MBT_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
    "function name() external view returns (string)",
  ];

  const mbt = new ethers.Contract(mbtAddress, MBT_ABI, deployer);

  // Check deployer's MBT balance
  const deployerMBTBalance = await mbt.balanceOf(deployer.address);
  console.log("Deployer MBT Balance:", ethers.formatEther(deployerMBTBalance), "MBT");

  if (deployerMBTBalance < MBT_AMOUNT_TO_TRANSFER) {
    throw new Error(
      `❌ Insufficient MBT balance. ` +
      `Required: ${ethers.formatEther(MBT_AMOUNT_TO_TRANSFER)} MBT, ` +
      `Available: ${ethers.formatEther(deployerMBTBalance)} MBT`
    );
  }

  // Check if ElementPay pool already has MBTs
  const poolMBTBalance = await mbt.balanceOf(ELEMENTPAY_LIQUIDITY_POOL_ADDRESS);
  console.log("ElementPay Pool Current Balance:", ethers.formatEther(poolMBTBalance), "MBT\n");

  // Confirm transfer
  console.log("📋 Transfer Summary:");
  console.log("   From:", deployer.address);
  console.log("   To:", ELEMENTPAY_LIQUIDITY_POOL_ADDRESS);
  console.log("   Amount:", ethers.formatEther(MBT_AMOUNT_TO_TRANSFER), "MBT");
  console.log("   Network:", network);
  console.log("");

  // Execute transfer
  console.log("🔄 Executing transfer...");
  try {
    const tx = await mbt.transfer(ELEMENTPAY_LIQUIDITY_POOL_ADDRESS, MBT_AMOUNT_TO_TRANSFER);
    console.log("   Transaction hash:", tx.hash);
    console.log("   Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("   ✅ Transfer confirmed!");
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log("   Block:", receipt.blockNumber);
    
    // Verify transfer
    const newPoolBalance = await mbt.balanceOf(ELEMENTPAY_LIQUIDITY_POOL_ADDRESS);
    const newDeployerBalance = await mbt.balanceOf(deployer.address);
    
    console.log("\n✅ Transfer Verification:");
    console.log("   ElementPay Pool New Balance:", ethers.formatEther(newPoolBalance), "MBT");
    console.log("   Deployer Remaining Balance:", ethers.formatEther(newDeployerBalance), "MBT");
    
    // Get explorer URL
    let explorerUrl;
    if (chainId === 534352n) {
      explorerUrl = `https://scrollscan.com/tx/${tx.hash}`;
    } else if (chainId === 8453n) {
      explorerUrl = `https://basescan.org/tx/${tx.hash}`;
    }
    
    if (explorerUrl) {
      console.log("\n🔗 View on Explorer:", explorerUrl);
    }
    
    console.log("\n🎉 ElementPay liquidity pool funded successfully!");
    console.log("   The pool is now ready to process M-PESA payments.");
    
  } catch (error) {
    console.error("❌ Transfer failed:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
