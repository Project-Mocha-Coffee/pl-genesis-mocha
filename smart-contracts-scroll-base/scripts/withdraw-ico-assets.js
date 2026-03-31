const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Usage examples:
//   npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia
//   npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --withdraw-eth
//   npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --withdraw-all
//   npx hardhat run scripts/withdraw-ico-assets.js --network scrollSepolia --emergency-withdraw-usdt 100

function getCliArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

function hasCliArg(name) {
  return process.argv.includes(`--${name}`);
}

async function loadDeploymentInfo() {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deploymentFile = path.join(deploymentsDir, "scrollSepolia-ico-deployment.json");
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`❌ Deployment file not found: ${deploymentFile}`);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  return deployment;
}

async function getContractBalances(ico, deployment) {
  console.log("💰 Checking contract balances...");
  
  const balances = {};
  
  // Check ETH balance
  const ethBalance = await ethers.provider.getBalance(ico.target);
  balances.ETH = ethBalance;
  console.log(`   ETH: ${ethers.formatEther(ethBalance)} ETH`);
  
  // Check ERC20 token balances
  const tokenAddresses = {
    USDT: deployment.contracts.tokens.USDT,
    USDC: deployment.contracts.tokens.USDC,
    WBTC: deployment.contracts.tokens.WBTC,
    SCR: deployment.contracts.tokens.SCR
  };
  
  for (const [symbol, address] of Object.entries(tokenAddresses)) {
    try {
      const token = await ethers.getContractAt("IERC20", address);
      const balance = await token.balanceOf(ico.target);
      balances[symbol] = balance;
      
      // Format balance based on token decimals
      let formattedBalance;
      if (symbol === "USDT" || symbol === "USDC") {
        formattedBalance = ethers.formatUnits(balance, 6);
      } else if (symbol === "WBTC") {
        formattedBalance = ethers.formatUnits(balance, 8);
      } else {
        formattedBalance = ethers.formatEther(balance);
      }
      
      console.log(`   ${symbol}: ${formattedBalance} ${symbol}`);
    } catch (error) {
      console.log(`   ${symbol}: Error checking balance - ${error.message}`);
      balances[symbol] = ethers.BigNumber.from(0);
    }
  }
  
  return balances;
}

async function checkAdminRole(ico, signer) {
  console.log("🔐 Checking admin role...");
  
  try {
    const hasRole = await ico.hasAdminRole(signer.address);
    if (hasRole) {
      console.log(`   ✅ ${signer.address} has admin role`);
      return true;
    } else {
      console.log(`   ❌ ${signer.address} does not have admin role`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error checking admin role: ${error.message}`);
    return false;
  }
}

async function withdrawETH(ico, signer) {
  console.log("\n💸 Withdrawing ETH...");
  
  try {
    const balance = await ethers.provider.getBalance(ico.target);
    if (balance === 0n) {
      console.log("   ℹ️  No ETH to withdraw");
      return;
    }
    
    console.log(`   Withdrawing ${ethers.formatEther(balance)} ETH...`);
    
    const tx = await ico.connect(signer).withdrawEth();
    console.log(`   📝 Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ ETH withdrawal successful! Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check new balance
    const newBalance = await ethers.provider.getBalance(ico.target);
    console.log(`   💰 New ETH balance: ${ethers.formatEther(newBalance)} ETH`);
    
  } catch (error) {
    console.log(`   ❌ ETH withdrawal failed: ${error.message}`);
    if (error.reason) {
      console.log(`   Reason: ${error.reason}`);
    }
  }
}

async function withdrawERC20(ico, signer, tokenAddress, symbol) {
  console.log(`\n💸 Withdrawing ${symbol}...`);
  
  try {
    const token = await ethers.getContractAt("IERC20", tokenAddress);
    const balance = await token.balanceOf(ico.target);
    
    if (balance === 0n) {
      console.log(`   ℹ️  No ${symbol} to withdraw`);
      return;
    }
    
    // Format balance for display
    let formattedBalance;
    if (symbol === "USDT" || symbol === "USDC") {
      formattedBalance = ethers.formatUnits(balance, 6);
    } else if (symbol === "WBTC") {
      formattedBalance = ethers.formatUnits(balance, 8);
    } else {
      formattedBalance = ethers.formatEther(balance);
    }
    
    console.log(`   Withdrawing ${formattedBalance} ${symbol}...`);
    
    const tx = await ico.connect(signer).withdrawErc20(tokenAddress);
    console.log(`   📝 Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ ${symbol} withdrawal successful! Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check new balance
    const newBalance = await token.balanceOf(ico.target);
    let newFormattedBalance;
    if (symbol === "USDT" || symbol === "USDC") {
      newFormattedBalance = ethers.formatUnits(newBalance, 6);
    } else if (symbol === "WBTC") {
      newFormattedBalance = ethers.formatUnits(newBalance, 8);
    } else {
      newFormattedBalance = ethers.formatEther(newBalance);
    }
    
    console.log(`   💰 New ${symbol} balance: ${newFormattedBalance} ${symbol}`);
    
  } catch (error) {
    console.log(`   ❌ ${symbol} withdrawal failed: ${error.message}`);
    if (error.reason) {
      console.log(`   Reason: ${error.reason}`);
    }
  }
}

async function emergencyWithdraw(ico, signer, tokenAddress, amount, symbol) {
  console.log(`\n🚨 Emergency withdrawing ${symbol}...`);
  
  try {
    const token = await ethers.getContractAt("IERC20", tokenAddress);
    const balance = await token.balanceOf(ico.target);
    
    if (balance === 0n) {
      console.log(`   ℹ️  No ${symbol} to withdraw`);
      return;
    }
    
    // Use provided amount or full balance
    const withdrawAmount = amount || balance;
    
    // Format amount for display
    let formattedAmount;
    if (symbol === "USDT" || symbol === "USDC") {
      formattedAmount = ethers.formatUnits(withdrawAmount, 6);
    } else if (symbol === "WBTC") {
      formattedAmount = ethers.formatUnits(withdrawAmount, 8);
    } else {
      formattedAmount = ethers.formatEther(withdrawAmount);
    }
    
    console.log(`   Emergency withdrawing ${formattedAmount} ${symbol}...`);
    
    const tx = await ico.connect(signer).emergencyWithdraw(tokenAddress, withdrawAmount);
    console.log(`   📝 Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Emergency ${symbol} withdrawal successful! Gas used: ${receipt.gasUsed.toString()}`);
    
  } catch (error) {
    console.log(`   ❌ Emergency ${symbol} withdrawal failed: ${error.message}`);
    if (error.reason) {
      console.log(`   Reason: ${error.reason}`);
    }
  }
}

async function withdrawAllAssets(ico, signer, deployment) {
  console.log("\n🔄 Withdrawing all assets...");
  
  // Withdraw ETH
  await withdrawETH(ico, signer);
  
  // Withdraw all ERC20 tokens
  const tokenAddresses = {
    USDT: deployment.contracts.tokens.USDT,
    USDC: deployment.contracts.tokens.USDC,
    WBTC: deployment.contracts.tokens.WBTC,
    SCR: deployment.contracts.tokens.SCR
  };
  
  for (const [symbol, address] of Object.entries(tokenAddresses)) {
    await withdrawERC20(ico, signer, address, symbol);
  }
}

async function getICOStatus(ico) {
  console.log("\n📊 ICO Status:");
  
  try {
    const totalSold = await ico.totalTokensSold();
    const maxTokens = await ico.maxTokensToSell();
    const remaining = await ico.getRemainingTokens();
    const isActive = await ico.isIcoActive();
    
    console.log(`   Total tokens sold: ${ethers.formatEther(totalSold)}`);
    console.log(`   Max tokens to sell: ${ethers.formatEther(maxTokens)}`);
    console.log(`   Remaining tokens: ${ethers.formatEther(remaining)}`);
    console.log(`   ICO active: ${isActive ? "✅ Yes" : "❌ No"}`);
    
    // Get purchase statistics
    const stats = await ico.getPurchaseStatistics();
    console.log("\n📈 Purchase Statistics:");
    console.log(`   ETH volume: ${ethers.formatEther(stats.totalVolumeEth)} ETH`);
    console.log(`   USDT volume: ${ethers.formatUnits(stats.totalVolumeUsdt, 6)} USDT`);
    console.log(`   USDC volume: ${ethers.formatUnits(stats.totalVolumeUsdc, 6)} USDC`);
    console.log(`   WBTC volume: ${ethers.formatUnits(stats.totalVolumeWbtc, 8)} WBTC`);
    console.log(`   SCR volume: ${ethers.formatEther(stats.totalVolumeScr)} SCR`);
    
  } catch (error) {
    console.log(`   ❌ Error getting ICO status: ${error.message}`);
  }
}

async function main() {
  console.log("🚀 ICO Asset Withdrawal Script");
  console.log("================================");
  
  try {
    // Load deployment info
    const deployment = await loadDeploymentInfo();
    console.log(`📍 ICO Contract: ${deployment.contracts.ico}`);
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // Connect to ICO contract
    const ico = await ethers.getContractAt("ICO", deployment.contracts.ico);
    
    // Check admin role
   /*  const hasAdminRole = await checkAdminRole(ico, signer);
    if (!hasAdminRole) {
      console.log("❌ Cannot proceed without admin role");
      return;
    } */
    
    // Get ICO status
    await getICOStatus(ico);
    
    // Get current balances
    const balances = await getContractBalances(ico, deployment);
    
    // Check if there are any assets to withdraw
    const hasAssets = Object.values(balances).some(balance => balance > 0n);
    if (!hasAssets) {
      console.log("\n💡 No assets to withdraw from the contract");
      return;
    }
    
    // Handle different withdrawal options
    if (true) {
      await withdrawAllAssets(ico, signer, deployment);
    } else if (hasCliArg("withdraw-eth")) {
      await withdrawETH(ico, signer);
    } else if (hasCliArg("withdraw-usdt")) {
      await withdrawERC20(ico, signer, deployment.contracts.tokens.USDT, "USDT");
    } else if (hasCliArg("withdraw-usdc")) {
      await withdrawERC20(ico, signer, deployment.contracts.tokens.USDC, "USDC");
    } else if (hasCliArg("withdraw-wbtc")) {
      await withdrawERC20(ico, signer, deployment.contracts.tokens.WBTC, "WBTC");
    } else if (hasCliArg("withdraw-scr")) {
      await withdrawERC20(ico, signer, deployment.contracts.tokens.SCR, "SCR");
    } else if (hasCliArg("emergency-withdraw-usdt")) {
      const amount = getCliArg("emergency-withdraw-usdt");
      const parsedAmount = amount ? ethers.parseUnits(amount, 6) : null;
      await emergencyWithdraw(ico, signer, deployment.contracts.tokens.USDT, parsedAmount, "USDT");
    } else if (hasCliArg("emergency-withdraw-usdc")) {
      const amount = getCliArg("emergency-withdraw-usdc");
      const parsedAmount = amount ? ethers.parseUnits(amount, 6) : null;
      await emergencyWithdraw(ico, signer, deployment.contracts.tokens.USDC, parsedAmount, "USDC");
    } else if (hasCliArg("emergency-withdraw-wbtc")) {
      const amount = getCliArg("emergency-withdraw-wbtc");
      const parsedAmount = amount ? ethers.parseUnits(amount, 8) : null;
      await emergencyWithdraw(ico, signer, deployment.contracts.tokens.WBTC, parsedAmount, "WBTC");
    } else if (hasCliArg("emergency-withdraw-scr")) {
      const amount = getCliArg("emergency-withdraw-scr");
      const parsedAmount = amount ? ethers.parseEther(amount) : null;
      await emergencyWithdraw(ico, signer, deployment.contracts.tokens.SCR, parsedAmount, "SCR");
    } else {
      console.log("\n💡 No withdrawal action specified. Available options:");
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
      console.log("\n📋 Current balances:");
      for (const [symbol, balance] of Object.entries(balances)) {
        if (balance > 0n) {
          let formatted;
          if (symbol === "ETH") {
            formatted = ethers.formatEther(balance);
          } else if (symbol === "USDT" || symbol === "USDC") {
            formatted = ethers.formatUnits(balance, 6);
          } else if (symbol === "WBTC") {
            formatted = ethers.formatUnits(balance, 8);
          } else {
            formatted = ethers.formatEther(balance);
          }
          console.log(`   ${symbol}: ${formatted}`);
        }
      }
    }
    
    console.log("\n✅ Withdrawal script completed!");
    
  } catch (error) {
    console.error("❌ Script failed:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Unhandled error:", error);
      process.exit(1);
    });
}

module.exports = {
  main,
  withdrawETH,
  withdrawERC20,
  emergencyWithdraw,
  withdrawAllAssets,
  getContractBalances,
  checkAdminRole,
  getICOStatus
};
