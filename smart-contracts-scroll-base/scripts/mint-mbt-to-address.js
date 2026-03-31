const { ethers } = require("hardhat");
const hre = require("hardhat");
require("dotenv").config();

/**
 * Script to mint MBT tokens directly to an address
 * 
 * This is an alternative to transferring existing MBTs.
 * Use this if you need to mint new MBTs for ElementPay liquidity pool.
 * 
 * Usage:
 *   npm run mint:mbt:scroll -- --amount 10000 --to 0x...
 *   npm run mint:mbt:base -- --amount 10000 --to 0x...
 */

async function main() {
  const network = hre.network.name;
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let amount = null;
  let toAddress = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--amount' && args[i + 1]) {
      amount = ethers.parseEther(args[i + 1]);
    }
    if (args[i] === '--to' && args[i + 1]) {
      toAddress = args[i + 1];
    }
  }
  
  // Use environment variables as fallback
  if (!amount) {
    amount = process.env.MBT_AMOUNT ? ethers.parseEther(process.env.MBT_AMOUNT) : null;
  }
  if (!toAddress) {
    toAddress = process.env.MINT_TO_ADDRESS || process.env.ELEMENTPAY_LIQUIDITY_POOL_ADDRESS;
  }
  
  if (!amount || !toAddress) {
    throw new Error("❌ Missing required parameters. Use --amount <amount> --to <address> or set MBT_AMOUNT and MINT_TO_ADDRESS in .env");
  }
  
  console.log("🪙 Mint MBT Tokens");
  console.log("=".repeat(60));
  console.log(`Network: ${network} (Chain ID: ${chainId})\n`);

  // Get deployer
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not set in .env file");
  }
  
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
  console.log("Deployer:", deployer.address);
  
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
  console.log("Mint To:", toAddress);
  console.log("Amount:", ethers.formatEther(amount), "MBT\n");

  // Get MBT contract instance
  const MBT_ABI = [
    "function mint(address to, uint256 amount) external",
    "function balanceOf(address account) external view returns (uint256)",
    "function MINTER_ROLE() external view returns (bytes32)",
    "function hasRole(bytes32 role, address account) external view returns (bool)",
  ];

  const mbt = new ethers.Contract(mbtAddress, MBT_ABI, deployer);

  // Check if deployer has MINTER_ROLE
  const MINTER_ROLE = await mbt.MINTER_ROLE();
  const hasMinterRole = await mbt.hasRole(MINTER_ROLE, deployer.address);
  
  if (!hasMinterRole) {
    throw new Error("❌ Deployer does not have MINTER_ROLE. Cannot mint tokens.");
  }
  
  console.log("✅ Deployer has MINTER_ROLE");

  // Check current balance of recipient
  const currentBalance = await mbt.balanceOf(toAddress);
  console.log("Recipient Current Balance:", ethers.formatEther(currentBalance), "MBT\n");

  // Execute mint
  console.log("🔄 Minting MBT tokens...");
  try {
    const tx = await mbt.mint(toAddress, amount);
    console.log("   Transaction hash:", tx.hash);
    console.log("   Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("   ✅ Mint confirmed!");
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log("   Block:", receipt.blockNumber);
    
    // Verify mint
    const newBalance = await mbt.balanceOf(toAddress);
    
    console.log("\n✅ Mint Verification:");
    console.log("   Recipient New Balance:", ethers.formatEther(newBalance), "MBT");
    console.log("   Amount Minted:", ethers.formatEther(amount), "MBT");
    
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
    
    console.log("\n🎉 MBT tokens minted successfully!");
    
  } catch (error) {
    console.error("❌ Mint failed:", error.message);
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
