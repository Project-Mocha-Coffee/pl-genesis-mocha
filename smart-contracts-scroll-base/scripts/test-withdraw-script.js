const { ethers } = require("hardhat");
const { expect } = require("chai");

// Test script to verify withdrawal functionality
async function testWithdrawalScript() {
  console.log("🧪 Testing ICO Withdrawal Script Functions");
  console.log("==========================================");
  
  try {
    // Import the withdrawal script functions
    const withdrawalScript = require('./withdraw-ico-assets.js');
    
    // Test that all expected functions are exported
    const expectedFunctions = [
      'main',
      'withdrawETH',
      'withdrawERC20',
      'emergencyWithdraw',
      'withdrawAllAssets',
      'getContractBalances',
      'checkAdminRole',
      'getICOStatus'
    ];
    
    console.log("✅ Checking function exports...");
    for (const funcName of expectedFunctions) {
      if (typeof withdrawalScript[funcName] === 'function') {
        console.log(`   ✅ ${funcName} - exported`);
      } else {
        console.log(`   ❌ ${funcName} - missing`);
        throw new Error(`Function ${funcName} is not exported`);
      }
    }
    
    console.log("\n✅ All withdrawal script functions are properly exported!");
    console.log("\n📋 Available withdrawal options:");
    console.log("   --withdraw-all              Withdraw all assets");
    console.log("   --withdraw-eth              Withdraw ETH only");
    console.log("   --withdraw-usdt             Withdraw USDT only");
    console.log("   --withdraw-usdc             Withdraw USDC only");
    console.log("   --withdraw-wbtc             Withdraw WBTC only");
    console.log("   --withdraw-scr              Withdraw SCR only");
    console.log("   --emergency-withdraw-usdt <amount>   Emergency withdraw specific USDT amount");
    console.log("   --emergency-withdraw-usdc <amount>   Emergency withdraw specific USDC amount");
    console.log("   --emergency-withdraw-wbtc <amount>   Emergency withdraw specific WBTC amount");
    console.log("   --emergency-withdraw-scr <amount>    Emergency withdraw specific SCR amount");
    
    console.log("\n🎯 Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testWithdrawalScript()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Unhandled test error:", error);
      process.exit(1);
    });
}

module.exports = { testWithdrawalScript };
