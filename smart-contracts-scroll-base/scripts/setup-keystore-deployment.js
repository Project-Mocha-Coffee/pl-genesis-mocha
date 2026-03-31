#!/usr/bin/env node

// setup-keystore-deployment.js
// Script to set up keystore-based deployment configuration

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Helper function to get input from user
function getInput(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

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

async function setupKeystoreDeployment() {
  console.log("🔐 Keystore Deployment Setup");
  console.log("═══════════════════════════════════════════════════════");
  console.log("This script will help you set up secure keystore-based deployment");
  console.log("for the TreeFarm Diamond system.\n");

  try {
    // Check if keystore file exists
    const keystorePath = await getInput("Enter path to keystore file (or press Enter to generate new): ");
    
    let finalKeystorePath = keystorePath;
    
    if (!keystorePath) {
      // Generate new keystore
      console.log("\n🔧 Generating new keystore...");
      const { generateWallet } = require("./generate-wallet.js");
      
      const walletInfo = await generateWallet(true); // Force keystore generation
      finalKeystorePath = `./wallets/keystore-${walletInfo.address.slice(2, 10)}.json`;
      
      console.log(`\n✅ New keystore generated: ${finalKeystorePath}`);
    } else {
      // Validate existing keystore
      if (!fs.existsSync(keystorePath)) {
        throw new Error(`Keystore file not found: ${keystorePath}`);
      }
      
      console.log("✅ Keystore file found");
    }

    // Get deployment configuration
    console.log("\n📋 Deployment Configuration:");
    
    const network = await getInput("Target network (scrollSepolia/scroll/localhost): ");
    const treasuryWallet = await getInput("Treasury wallet address (or press Enter to use deployer): ");
    const maxTokensToSell = await getInput("Max tokens to sell in ICO (or press Enter for 1M): ");
    
    // Create .env file for deployment
    const envContent = `# TreeFarm Diamond Deployment Configuration
# Generated at: ${new Date().toISOString()}

# Keystore Configuration
KEYSTORE_FILE=${finalKeystorePath}
# KEYSTORE_PASSWORD=your_password_here  # Uncomment and set for automated deployment

# Network Configuration
NETWORK=${network}

# ICO Configuration
${treasuryWallet ? `TREASURY_WALLET=${treasuryWallet}` : '# TREASURY_WALLET=0x...  # Will use deployer address'}
${maxTokensToSell ? `MAX_TOKENS_TO_SELL=${maxTokensToSell}` : '# MAX_TOKENS_TO_SELL=1000000  # 1M tokens default'}

# Deployment Notes:
# 1. Set KEYSTORE_PASSWORD for automated deployment (less secure)
# 2. Leave KEYSTORE_PASSWORD commented for interactive password entry (more secure)
# 3. Test on testnets before mainnet deployment
# 4. Never commit this file with passwords to version control
`;

    const envPath = path.join(__dirname, "..", ".env.deployment");
    fs.writeFileSync(envPath, envContent);
    
    console.log(`\n✅ Deployment configuration saved to: ${envPath}`);

    // Create deployment script
    const deploymentScript = `#!/bin/bash

# TreeFarm Diamond Deployment Script
# Generated at: ${new Date().toISOString()}

set -e

echo "🚀 Starting TreeFarm Diamond Deployment"
echo "═══════════════════════════════════════════════════════"

# Load environment variables
if [ -f .env.deployment ]; then
    echo "📋 Loading deployment configuration..."
    export $(cat .env.deployment | grep -v '^#' | xargs)
else
    echo "❌ .env.deployment file not found!"
    echo "💡 Run: node scripts/setup-keystore-deployment.js"
    exit 1
fi

# Validate keystore file
if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "❌ Keystore file not found: $KEYSTORE_FILE"
    exit 1
fi

echo "🔐 Using keystore: $KEYSTORE_FILE"
echo "🌐 Target network: $NETWORK"

# Check if password is set
if [ -z "$KEYSTORE_PASSWORD" ]; then
    echo "⚠️  KEYSTORE_PASSWORD not set - will prompt for password"
fi

# Deploy contracts
echo "🚀 Deploying contracts..."
npx hardhat run scripts/deployDiamond.js --network $NETWORK

echo "✅ Deployment completed successfully!"
echo "📁 Check deployments/ directory for deployment files"
`;

    const scriptPath = path.join(__dirname, "..", "deploy.sh");
    fs.writeFileSync(scriptPath, deploymentScript);
    fs.chmodSync(scriptPath, '755'); // Make executable
    
    console.log(`✅ Deployment script created: ${scriptPath}`);

    // Create Windows batch file
    const batchContent = `@echo off
REM TreeFarm Diamond Deployment Script (Windows)
REM Generated at: ${new Date().toISOString()}

echo 🚀 Starting TreeFarm Diamond Deployment
echo ═══════════════════════════════════════════════════════

REM Load environment variables
if exist .env.deployment (
    echo 📋 Loading deployment configuration...
    for /f "usebackq tokens=1,2 delims==" %%a in (.env.deployment) do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" set %%a=%%b
    )
) else (
    echo ❌ .env.deployment file not found!
    echo 💡 Run: node scripts/setup-keystore-deployment.js
    exit /b 1
)

REM Validate keystore file
if not exist "%KEYSTORE_FILE%" (
    echo ❌ Keystore file not found: %KEYSTORE_FILE%
    exit /b 1
)

echo 🔐 Using keystore: %KEYSTORE_FILE%
echo 🌐 Target network: %NETWORK%

REM Check if password is set
if "%KEYSTORE_PASSWORD%"=="" (
    echo ⚠️  KEYSTORE_PASSWORD not set - will prompt for password
)

REM Deploy contracts
echo 🚀 Deploying contracts...
npx hardhat run scripts/deployDiamond.js --network %NETWORK%

echo ✅ Deployment completed successfully!
echo 📁 Check deployments/ directory for deployment files
pause
`;

    const batchPath = path.join(__dirname, "..", "deploy.bat");
    fs.writeFileSync(batchPath, batchContent);
    
    console.log(`✅ Windows deployment script created: ${batchPath}`);

    // Display usage instructions
    console.log("\n📋 Usage Instructions:");
    console.log("═══════════════════════════════════════════════════════");
    console.log("1. Review and edit .env.deployment file if needed");
    console.log("2. Set KEYSTORE_PASSWORD in .env.deployment for automated deployment");
    console.log("3. Run deployment:");
    console.log("   Linux/Mac: ./deploy.sh");
    console.log("   Windows: deploy.bat");
    console.log("   Manual: npx hardhat run scripts/deployDiamond.js --network <network>");
    console.log("\n🔒 Security Notes:");
    console.log("- Never commit .env.deployment with passwords to version control");
    console.log("- Use environment variables for production deployments");
    console.log("- Test on testnets before mainnet deployment");
    console.log("- Keep keystore files secure and backed up");

  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🔐 Keystore Deployment Setup Script

Usage:
  node scripts/setup-keystore-deployment.js [options]

Options:
  --help, -h          Show this help message

This script will:
1. Help you set up keystore-based deployment
2. Generate deployment configuration files
3. Create deployment scripts for different platforms
4. Provide security best practices

Files created:
  - .env.deployment (deployment configuration)
  - deploy.sh (Linux/Mac deployment script)
  - deploy.bat (Windows deployment script)

Security features:
  - Encrypted keystore support
  - Interactive password entry
  - Environment variable configuration
  - Deployment validation
`);
    process.exit(0);
  }

  setupKeystoreDeployment();
}

module.exports = {
  setupKeystoreDeployment
};
