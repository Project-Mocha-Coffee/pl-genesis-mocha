const { ethers } = require("ethers");
require("dotenv").config();

/**
 * Script to bridge MBT tokens from Base to Scroll
 * 
 * ⚠️ IMPORTANT: This script provides a template for bridging.
 * Most bridges require UI interaction or specific contract integration.
 * 
 * This script will:
 * 1. Check your MBT balance on Base
 * 2. Provide instructions for bridging
 * 3. Optionally help with approval if bridge contract is known
 * 
 * Usage:
 *   node scripts/bridge-mbt-base-to-scroll.js --amount 10000
 */

// MBT addresses
const MBT_ADDRESSES = {
  base: "0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a",
  scroll: "0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1",
};

// Wallet address
const WALLET_ADDRESS = "0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795";

// MBT ABI
const MBT_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
];

async function main() {
  console.log("🌉 Bridge MBT from Base to Scroll");
  console.log("=".repeat(60));
  
  // Parse arguments
  const args = process.argv.slice(2);
  let amount = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--amount' && args[i + 1]) {
      amount = ethers.parseEther(args[i + 1]);
    }
  }
  
  if (!amount) {
    amount = process.env.MBT_AMOUNT ? ethers.parseEther(process.env.MBT_AMOUNT) : null;
  }
  
  if (!amount) {
    throw new Error("❌ Please specify amount: --amount <amount> or set MBT_AMOUNT in .env");
  }
  
  // Get providers
  const baseProvider = new ethers.JsonRpcProvider(
    process.env.BASE_RPC_URL || "https://mainnet.base.org"
  );
  
  const scrollProvider = new ethers.JsonRpcProvider(
    process.env.SCROLL_RPC_URL || "https://rpc.scroll.io"
  );
  
  // Get deployer
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not set in .env file");
  }
  
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, baseProvider);
  console.log("Wallet:", deployer.address);
  console.log("Amount:", ethers.formatEther(amount), "MBT\n");
  
  // Check Base balance
  const mbtBase = new ethers.Contract(MBT_ADDRESSES.base, MBT_ABI, baseProvider);
  const baseBalance = await mbtBase.balanceOf(deployer.address);
  const symbol = await mbtBase.symbol();
  
  console.log("📊 Base Mainnet Balance:");
  console.log(`   ${ethers.formatEther(baseBalance)} ${symbol}`);
  
  if (baseBalance < amount) {
    throw new Error(`❌ Insufficient balance. Have ${ethers.formatEther(baseBalance)} ${symbol}, need ${ethers.formatEther(amount)}`);
  }
  
  // Check Scroll balance (to verify after bridge)
  const mbtScroll = new ethers.Contract(MBT_ADDRESSES.scroll, MBT_ABI, scrollProvider);
  const scrollBalanceBefore = await mbtScroll.balanceOf(deployer.address);
  
  console.log("\n📊 Scroll Mainnet Balance (Before):");
  console.log(`   ${ethers.formatEther(scrollBalanceBefore)} ${symbol}`);
  
  console.log("\n" + "=".repeat(60));
  console.log("🌉 Bridge Options");
  console.log("=".repeat(60));
  
  console.log("\n⚠️  IMPORTANT: Most bridges require UI interaction.");
  console.log("   This script cannot automatically bridge custom tokens.");
  console.log("   You'll need to use a bridge UI or deploy bridge integration.\n");
  
  console.log("📋 Recommended Steps:\n");
  
  console.log("1️⃣  Check Bridge Support:");
  console.log("   - Visit: https://orbiter.finance/");
  console.log("   - Select: Base → Scroll");
  console.log("   - Check if MBT appears in token list\n");
  
  console.log("2️⃣  If MBT is Supported:");
  console.log("   - Connect wallet to bridge UI");
  console.log("   - Select MBT token");
  console.log("   - Enter amount:", ethers.formatEther(amount));
  console.log("   - Approve token spending (if needed)");
  console.log("   - Initiate bridge transaction");
  console.log("   - Wait for confirmation (~5-30 minutes)\n");
  
  console.log("3️⃣  If MBT is NOT Supported:");
  console.log("   Option A: Bridge ETH instead");
  console.log("      - Bridge ETH from Base → Scroll");
  console.log("      - Purchase MBTs via ICO on Scroll");
  console.log("      - Transfer to ElementPay\n");
  console.log("   Option B: Deploy LayerZero OFT Wrapper");
  console.log("      - Deploy OFT wrapper on both chains");
  console.log("      - Lock MBTs in wrapper");
  console.log("      - Bridge via LayerZero\n");
  
  console.log("4️⃣  After Bridging:");
  console.log("   - Verify balance on Scroll");
  console.log("   - Transfer to ElementPay:");
  console.log("     npm run fund:elementpay:scroll\n");
  
  console.log("=".repeat(60));
  console.log("💡 Alternative: Use ICO Purchase Method");
  console.log("=".repeat(60));
  console.log("\nSince you have MINTER_ROLE on Base but not Scroll:");
  console.log("1. Bridge ETH from Base → Scroll (standard bridge, easy)");
  console.log("2. Purchase MBTs via ICO on Scroll using bridged ETH");
  console.log("3. Transfer purchased MBTs to ElementPay");
  console.log("\nThis avoids custom token bridging complexity!\n");
  
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
