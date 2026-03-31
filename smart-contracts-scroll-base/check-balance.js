const { ethers } = require("hardhat");

async function checkBalance() {
  try {
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const address = "0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795";
    const balance = await provider.getBalance(address);
    const ethBalance = ethers.formatEther(balance);
    console.log(`\n✅ Base Sepolia Balance Check:`);
    console.log(`   Address: ${address}`);
    console.log(`   ETH Balance: ${ethBalance} ETH`);
    
    if (parseFloat(ethBalance) > 0.001) {
      console.log(`\n🎉 You have enough ETH to deploy!`);
    } else {
      console.log(`\n⚠️  You need at least 0.001 ETH for deployment.`);
      console.log(`   Current balance: ${ethBalance} ETH`);
    }
  } catch (error) {
    console.error("Error checking balance:", error.message);
  }
}

checkBalance().catch(console.error);
