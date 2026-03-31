#!/usr/bin/env node

// keystore-example.js
// Example script showing how to use keystores with Hardhat deployment

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Helper function to get password from user
function getPassword(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.stdoutMuted = true;
    rl.question(prompt, (password) => {
      rl.close();
      resolve(password);
    });

    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        rl.output.write("*");
      } else {
        rl.output.write(stringToWrite);
      }
    };
  });
}

async function loadWalletFromKeystore(keystorePath, password) {
  try {
    const keystoreData = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
    const wallet = await ethers.Wallet.fromEncryptedJson(keystoreData, password);
    return {
      success: true,
      wallet: wallet,
      address: wallet.address
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function deployWithKeystore() {
  console.log("🔐 Keystore Deployment Example");
  console.log("═══════════════════════════════════════════════════════");

  try {
    // Check if keystore file exists
    const keystorePath = process.env.KEYSTORE_FILE || "./wallets/keystore.json";
    
    if (!fs.existsSync(keystorePath)) {
      console.log("❌ Keystore file not found at:", keystorePath);
      console.log("💡 Generate a keystore first with: node scripts/generate-wallet.js");
      return;
    }

    // Get password from environment or prompt user
    let password = process.env.KEYSTORE_PASSWORD;
    
    if (!password) {
      console.log("🔒 Keystore password not found in environment variables");
      password = await getPassword("Enter keystore password: ");
    }

    // Load wallet from keystore
    console.log("📂 Loading wallet from keystore...");
    const result = await loadWalletFromKeystore(keystorePath, password);
    
    if (!result.success) {
      console.log("❌ Failed to load wallet:", result.error);
      return;
    }

    const wallet = result.wallet;
    console.log("✅ Wallet loaded successfully");
    console.log("📍 Address:", wallet.address);

    // Connect wallet to provider
    const provider = ethers.provider;
    const connectedWallet = wallet.connect(provider);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      console.log("⚠️  Wallet has no ETH - cannot deploy contracts");
      console.log("💡 Fund the wallet or use a different account");
      return;
    }

    // Example: Deploy a simple contract
    console.log("\n🚀 Deploying example contract...");
    
    // Get contract factory
    const SimpleContract = await ethers.getContractFactory("SimpleContract", connectedWallet);
    
    // Deploy contract
    const contract = await SimpleContract.deploy();
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("✅ Contract deployed at:", contractAddress);

    // Save deployment info
    const deploymentInfo = {
      network: await provider.getNetwork(),
      deployer: wallet.address,
      contract: contractAddress,
      timestamp: new Date().toISOString(),
      keystoreUsed: keystorePath
    };

    const outputDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `keystore-deployment-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", filepath);

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
  }
}

// Alternative: Use keystore with Hardhat config
async function setupHardhatWithKeystore() {
  console.log("\n🔧 Hardhat Configuration with Keystore");
  console.log("═══════════════════════════════════════════════════════");
  
  console.log("📋 Add this to your hardhat.config.js:");
  console.log(`
const { ethers } = require("hardhat");
const fs = require("fs");

// Load wallet from keystore
async function loadKeystoreWallet() {
  const keystorePath = process.env.KEYSTORE_FILE || "./wallets/keystore.json";
  const password = process.env.KEYSTORE_PASSWORD;
  
  if (!fs.existsSync(keystorePath) || !password) {
    throw new Error("Keystore file or password not found");
  }
  
  const keystoreData = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
  return await ethers.Wallet.fromEncryptedJson(keystoreData, password);
}

module.exports = {
  networks: {
    scrollSepolia: {
      url: "https://sepolia-rpc.scroll.io/",
      chainId: 534351,
      accounts: async () => {
        const wallet = await loadKeystoreWallet();
        return [wallet.privateKey];
      }
    }
  }
};
`);

  console.log("📋 Environment variables needed:");
  console.log("KEYSTORE_FILE=./wallets/keystore.json");
  console.log("KEYSTORE_PASSWORD=your_password_here");
}

// Run the example
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes("--config")) {
    setupHardhatWithKeystore();
  } else {
    deployWithKeystore();
  }
}

module.exports = {
  loadWalletFromKeystore,
  deployWithKeystore,
  setupHardhatWithKeystore
};
