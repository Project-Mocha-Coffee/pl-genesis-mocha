const { ethers } = require("hardhat");
const hre = require("hardhat");

/**
 * Script to check if a wallet address has MINTER_ROLE on MBT contracts
 * 
 * Usage:
 *   npm run check:minter:role
 *   Or: node scripts/check-minter-role.js --wallet 0x...
 */

// MBT contract addresses
const MBT_ADDRESSES = {
  scroll: "0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1",
  base: "0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a",
  baseSepolia: "0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a", // Update if different
};

// Wallet address to check
const WALLET_ADDRESS = "0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795";

// MBT ABI (minimal)
const MBT_ABI = [
  "function MINTER_ROLE() external view returns (bytes32)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
];

async function checkMinterRole(networkName, mbtAddress, walletAddress, provider) {
  try {
    console.log(`\n📋 Checking ${networkName}...`);
    console.log(`   MBT Address: ${mbtAddress}`);
    console.log(`   Wallet: ${walletAddress}`);
    
    const mbt = new ethers.Contract(mbtAddress, MBT_ABI, provider);
    
    // Get MINTER_ROLE
    const MINTER_ROLE = await mbt.MINTER_ROLE();
    console.log(`   MINTER_ROLE: ${MINTER_ROLE}`);
    
    // Check if wallet has MINTER_ROLE
    const hasMinterRole = await mbt.hasRole(MINTER_ROLE, walletAddress);
    
    // Also check DEFAULT_ADMIN_ROLE
    const DEFAULT_ADMIN_ROLE = await mbt.DEFAULT_ADMIN_ROLE();
    const hasAdminRole = await mbt.hasRole(DEFAULT_ADMIN_ROLE, walletAddress);
    
    console.log(`\n   ✅ Results:`);
    console.log(`      MINTER_ROLE: ${hasMinterRole ? '✅ YES' : '❌ NO'}`);
    console.log(`      DEFAULT_ADMIN_ROLE: ${hasAdminRole ? '✅ YES' : '❌ NO'}`);
    
    return {
      network: networkName,
      mbtAddress,
      walletAddress,
      hasMinterRole,
      hasAdminRole,
    };
  } catch (error) {
    console.error(`   ❌ Error checking ${networkName}:`, error.message);
    return {
      network: networkName,
      mbtAddress,
      walletAddress,
      hasMinterRole: false,
      hasAdminRole: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log("🔍 Checking MINTER_ROLE Status");
  console.log("=".repeat(60));
  console.log(`Wallet Address: ${WALLET_ADDRESS}\n`);
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let walletAddress = WALLET_ADDRESS;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--wallet' && args[i + 1]) {
      walletAddress = args[i + 1];
    }
  }
  
  const results = [];
  
  // Check Scroll Mainnet
  try {
    const scrollProvider = new ethers.JsonRpcProvider(process.env.SCROLL_RPC_URL || "https://rpc.scroll.io");
    const scrollResult = await checkMinterRole(
      "Scroll Mainnet",
      MBT_ADDRESSES.scroll,
      walletAddress,
      scrollProvider
    );
    results.push(scrollResult);
  } catch (error) {
    console.error("❌ Failed to check Scroll Mainnet:", error.message);
  }
  
  // Check Base Mainnet
  try {
    const baseProvider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || "https://mainnet.base.org");
    const baseResult = await checkMinterRole(
      "Base Mainnet",
      MBT_ADDRESSES.base,
      walletAddress,
      baseProvider
    );
    results.push(baseResult);
  } catch (error) {
    console.error("❌ Failed to check Base Mainnet:", error.message);
  }
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  
  results.forEach(result => {
    if (result.error) {
      console.log(`\n${result.network}: ❌ Error - ${result.error}`);
    } else {
      console.log(`\n${result.network}:`);
      console.log(`   MINTER_ROLE: ${result.hasMinterRole ? '✅ YES' : '❌ NO'}`);
      console.log(`   ADMIN_ROLE: ${result.hasAdminRole ? '✅ YES' : '❌ NO'}`);
      if (result.hasMinterRole) {
        console.log(`   ✅ Can mint MBT tokens directly`);
      } else if (result.hasAdminRole) {
        console.log(`   ⚠️  Has admin role but not minter role`);
        console.log(`   💡 Can grant MINTER_ROLE to self or others`);
      } else {
        console.log(`   ❌ Cannot mint MBT tokens`);
      }
    }
  });
  
  console.log("\n" + "=".repeat(60));
  
  // Final recommendation
  const hasMinterOnAny = results.some(r => r.hasMinterRole && !r.error);
  const hasAdminOnAny = results.some(r => r.hasAdminRole && !r.error);
  
  if (hasMinterOnAny) {
    console.log("✅ Your wallet CAN mint MBT tokens on at least one network");
    console.log("   You can use: npm run mint:mbt:scroll or npm run mint:mbt:base");
  } else if (hasAdminOnAny) {
    console.log("⚠️  Your wallet has ADMIN_ROLE but not MINTER_ROLE");
    console.log("   You can grant MINTER_ROLE to yourself using:");
    console.log("   mbt.grantRole(MINTER_ROLE, YOUR_WALLET_ADDRESS)");
  } else {
    console.log("❌ Your wallet does NOT have MINTER_ROLE on any network");
    console.log("   Contact the contract admin to grant you MINTER_ROLE");
  }
  
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
