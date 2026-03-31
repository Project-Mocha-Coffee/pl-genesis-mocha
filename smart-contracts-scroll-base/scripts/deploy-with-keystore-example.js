#!/usr/bin/env node

// deploy-with-keystore-example.js
// Example script showing how to deploy with keystore programmatically

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function deployWithKeystore() {
  console.log("🔐 Keystore Deployment Example");
  console.log("═══════════════════════════════════════════════════════");

  try {
    // Configuration
    const keystorePath = process.env.KEYSTORE_FILE || "./wallets/keystore.json";
    const keystorePassword = process.env.KEYSTORE_PASSWORD;
    
    if (!fs.existsSync(keystorePath)) {
      throw new Error(`Keystore file not found: ${keystorePath}`);
    }

    // Load wallet from keystore
    console.log("🔐 Loading wallet from keystore...");
    const keystoreData = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
    
    let wallet;
    if (keystorePassword) {
      wallet = await ethers.Wallet.fromEncryptedJson(keystoreData, keystorePassword);
    } else {
      // Interactive password entry
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.stdoutMuted = true;
      const password = await new Promise((resolve) => {
        rl.question("Enter keystore password: ", (password) => {
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

      wallet = await ethers.Wallet.fromEncryptedJson(keystoreData, password);
    }

    // Connect wallet to provider
    const provider = ethers.provider;
    const connectedWallet = wallet.connect(provider);
    
    console.log("✅ Wallet loaded successfully");
    console.log("📍 Address:", wallet.address);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      console.log("⚠️  Wallet has no ETH - cannot deploy contracts");
      return;
    }

    // Deploy a simple contract as example
    console.log("\n🚀 Deploying example contract...");
    
    // Get network info
    const network = await provider.getNetwork();
    console.log("🌐 Network:", network.name, `(Chain ID: ${network.chainId})`);

    // Example: Deploy MochaBeanToken
    const MochaBeanToken = await ethers.getContractFactory("MochaBeanToken", connectedWallet);
    const token = await MochaBeanToken.deploy();
    await token.waitForDeployment();
    
    const tokenAddress = await token.getAddress();
    console.log("✅ MochaBeanToken deployed at:", tokenAddress);

    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId.toString(),
      deployer: wallet.address,
      contracts: {
        MochaBeanToken: tokenAddress
      },
      timestamp: new Date().toISOString(),
      deploymentMethod: "keystore",
      keystoreFile: keystorePath
    };

    const outputDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `keystore-example-${network.name}-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", filepath);

    // Display summary
    console.log("\n📊 Deployment Summary:");
    console.log("═══════════════════════════════════════════════════════");
    console.log("🌐 Network:", network.name);
    console.log("📍 Deployer:", wallet.address);
    console.log("🪙 Token:", tokenAddress);
    console.log("🔐 Method: Keystore");
    console.log("📁 Keystore:", keystorePath);
    console.log("═══════════════════════════════════════════════════════");

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

// Alternative: Use with Hardhat config
function showHardhatConfig() {
  console.log("\n🔧 Hardhat Configuration with Keystore");
  console.log("═══════════════════════════════════════════════════════");
  
  console.log("📋 Add this to your hardhat.config.js:");
  console.log(`
const { ethers } = require("hardhat");
const fs = require("fs");

// Load wallet from keystore
async function loadKeystoreWallet() {
  const keystorePath = process.env.KEYSTORE_FILE;
  const password = process.env.KEYSTORE_PASSWORD;
  
  if (!keystorePath || !password) {
    throw new Error("KEYSTORE_FILE and KEYSTORE_PASSWORD must be set");
  }
  
  if (!fs.existsSync(keystorePath)) {
    throw new Error(\`Keystore file not found: \${keystorePath}\`);
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
    },
    scroll: {
      url: "https://rpc.scroll.io/",
      chainId: 534352,
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
    showHardhatConfig();
  } else {
    deployWithKeystore();
  }
}

module.exports = {
  deployWithKeystore,
  showHardhatConfig
};
