const { ethers } = require("ethers");
require("dotenv").config();

/**
 * Script to check if MBT token is supported on various bridges
 * 
 * This script checks bridge contracts to see if MBT can be bridged
 * from Base to Scroll.
 * 
 * Usage:
 *   node scripts/check-bridge-support.js
 */

// MBT addresses
const MBT_ADDRESSES = {
  base: "0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a",
  scroll: "0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1",
};

// Bridge contract addresses (common bridges)
const BRIDGE_ADDRESSES = {
  // Orbiter Finance (if they have a contract)
  orbiter: {
    base: null, // Check Orbiter docs for contract address
    scroll: null,
  },
  // Stargate Finance
  stargate: {
    base: "0x45f1A95A4D3f3836523F5c83673c797f4d4d263B", // Stargate Router on Base
    scroll: null, // Check if Stargate supports Scroll
  },
  // LayerZero Endpoint
  layerzero: {
    base: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7", // LayerZero Endpoint on Base
    scroll: "0x3c2269811836af69497E5F486A85D7316753cf62", // LayerZero Endpoint on Scroll
  },
};

async function checkTokenSupport(provider, bridgeAddress, tokenAddress, bridgeName) {
  try {
    // Basic ERC20 check
    const tokenABI = [
      "function balanceOf(address account) external view returns (uint256)",
      "function symbol() external view returns (string)",
    ];
    
    const token = new ethers.Contract(tokenAddress, tokenABI, provider);
    const symbol = await token.symbol();
    const balance = await token.balanceOf(bridgeAddress);
    
    console.log(`   Token Symbol: ${symbol}`);
    console.log(`   Bridge Balance: ${ethers.formatEther(balance)} ${symbol}`);
    
    return {
      supported: balance > 0n || true, // If bridge has balance or token exists
      symbol,
      bridgeBalance: balance,
    };
  } catch (error) {
    return {
      supported: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log("🌉 Checking Bridge Support for MBT Token");
  console.log("=".repeat(60));
  console.log("\n📋 MBT Token Addresses:");
  console.log(`   Base Mainnet: ${MBT_ADDRESSES.base}`);
  console.log(`   Scroll Mainnet: ${MBT_ADDRESSES.scroll}\n`);
  
  // Check Base network
  const baseProvider = new ethers.JsonRpcProvider(
    process.env.BASE_RPC_URL || "https://mainnet.base.org"
  );
  
  // Check Scroll network
  const scrollProvider = new ethers.JsonRpcProvider(
    process.env.SCROLL_RPC_URL || "https://rpc.scroll.io"
  );
  
  console.log("🔍 Checking Bridges...\n");
  
  // Check LayerZero
  console.log("1️⃣ LayerZero:");
  console.log("   Base Endpoint:", BRIDGE_ADDRESSES.layerzero.base);
  console.log("   Scroll Endpoint:", BRIDGE_ADDRESSES.layerzero.scroll);
  console.log("   ⚠️  Note: LayerZero requires OFT wrapper deployment for custom tokens");
  console.log("   📚 Docs: https://layerzero.gitbook.io/docs/");
  
  // Check Stargate
  if (BRIDGE_ADDRESSES.stargate.base) {
    console.log("\n2️⃣ Stargate Finance:");
    console.log("   Base Router:", BRIDGE_ADDRESSES.stargate.base);
    try {
      const baseResult = await checkTokenSupport(
        baseProvider,
        BRIDGE_ADDRESSES.stargate.base,
        MBT_ADDRESSES.base,
        "Stargate"
      );
      if (baseResult.supported) {
        console.log("   ✅ MBT may be supported (check Stargate UI)");
      }
    } catch (error) {
      console.log("   ❌ Could not check:", error.message);
    }
    console.log("   🌐 UI: https://stargate.finance/transfer");
  }
  
  console.log("\n3️⃣ Orbiter Finance:");
  console.log("   ⚠️  No contract address available (check UI)");
  console.log("   🌐 UI: https://orbiter.finance/");
  console.log("   📝 Manual Check Required: Visit UI and check if MBT appears");
  
  console.log("\n4️⃣ Scroll Official Bridge:");
  console.log("   🌐 UI: https://scroll.io/bridge");
  console.log("   📝 Manual Check Required: Visit UI and check if MBT appears");
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 Summary");
  console.log("=".repeat(60));
  console.log("\n✅ Recommended Next Steps:");
  console.log("   1. Visit Orbiter Finance: https://orbiter.finance/");
  console.log("      - Connect wallet");
  console.log("      - Select Base → Scroll");
  console.log("      - Check if MBT token appears in list");
  console.log("\n   2. Visit Scroll Bridge: https://scroll.io/bridge");
  console.log("      - Connect wallet");
  console.log("      - Check if MBT token appears");
  console.log("\n   3. If bridges don't support MBT:");
  console.log("      - Bridge ETH from Base → Scroll");
  console.log("      - Purchase MBTs via ICO on Scroll");
  console.log("      - Transfer to ElementPay");
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
