#!/usr/bin/env node

// generate-wallet.js
// Script to generate a new Ethereum wallet with private key, mnemonic, and address

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

async function generateWallet(useKeystore = true) {
  console.log("🔐 Generating New Ethereum Wallet");
  console.log("═══════════════════════════════════════════════════════");

  try {
    // Generate a new random wallet
    const wallet = ethers.Wallet.createRandom();
    
    // Get wallet information
    const walletInfo = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
      derivationPath: wallet.mnemonic.path,
      timestamp: new Date().toISOString(),
      network: "ethereum-compatible"
    };

    // Generate keystore if requested
    let keystoreData = null;
    if (useKeystore) {
      console.log("\n🔒 Creating encrypted keystore...");
      const password = await getPassword("Enter password for keystore (min 8 characters): ");
      
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      // Generate keystore
      keystoreData = await wallet.encrypt(password);
      walletInfo.keystore = keystoreData;
      walletInfo.hasKeystore = true;
    }

    // Display wallet information
    console.log("✅ Wallet Generated Successfully!");
    console.log("═══════════════════════════════════════════════════════");
    console.log("📍 Address:", walletInfo.address);
    console.log("🔑 Private Key:", walletInfo.privateKey);
    console.log("📝 Mnemonic Phrase:", walletInfo.mnemonic);
    console.log("🛤️  Derivation Path:", walletInfo.derivationPath);
    if (keystoreData) {
      console.log("🔒 Keystore: Generated (encrypted)");
    }
    console.log("⏰ Generated at:", walletInfo.timestamp);
    console.log("═══════════════════════════════════════════════════════");

    // Security warnings
    console.log("\n⚠️  SECURITY WARNINGS:");
    console.log("═══════════════════════════════════════════════════════");
    console.log("🔒 NEVER share your private key or mnemonic with anyone!");
    console.log("🔒 Store this information securely and offline");
    console.log("🔒 This wallet has NO funds - you need to send ETH to use it");
    console.log("🔒 Test with small amounts first on testnets");
    console.log("🔒 Consider using hardware wallets for large amounts");
    console.log("═══════════════════════════════════════════════════════");

    // Save to file
    const outputDir = path.join(__dirname, "..", "wallets");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `wallet-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    // Create wallet data (exclude sensitive info from readable format)
    const walletData = {
      ...walletInfo,
      security: {
        note: "Keep this file secure and never commit to version control",
        generatedBy: "generate-wallet.js",
        version: "1.0.0"
      }
    };

    fs.writeFileSync(filepath, JSON.stringify(walletData, null, 2));
    console.log(`\n💾 Wallet saved to: ${filepath}`);

    // Save keystore file if generated
    let keystoreFilepath = null;
    if (keystoreData) {
      const keystoreFilename = `keystore-${wallet.address.slice(2, 10)}-${timestamp}.json`;
      keystoreFilepath = path.join(outputDir, keystoreFilename);
      fs.writeFileSync(keystoreFilepath, JSON.stringify(keystoreData, null, 2));
      console.log(`🔒 Keystore saved to: ${keystoreFilepath}`);
    }

    // Create a .env template
    const envTemplate = `# Generated Wallet Configuration
# Generated at: ${walletInfo.timestamp}
# Address: ${walletInfo.address}

# Option 1: Use private key directly (less secure)
PRIVATE_KEY=${walletInfo.privateKey}

# Option 2: Use mnemonic for multiple accounts
MNEMONIC="${walletInfo.mnemonic}"
ACCOUNT_COUNT=10

# Option 3: Use keystore file (most secure)${keystoreData ? `
KEYSTORE_FILE=${keystoreFilepath ? path.basename(keystoreFilepath) : 'keystore-file.json'}
KEYSTORE_PASSWORD=your_keystore_password_here` : ''}

# Treasury wallet (optional - defaults to deployer)
TREASURY_WALLET=${walletInfo.address}

# ICO Configuration (optional)
MAX_TOKENS_TO_SELL=1000000
`;

    const envFilename = `.env.wallet-${timestamp}`;
    const envFilepath = path.join(outputDir, envFilename);
    fs.writeFileSync(envFilepath, envTemplate);
    console.log(`📄 Environment template saved to: ${envFilepath}`);

    // Create a secure version (without private key in console)
    const secureFilename = `wallet-secure-${timestamp}.txt`;
    const secureFilepath = path.join(outputDir, secureFilename);
    const secureContent = `WALLET GENERATED: ${walletInfo.timestamp}
═══════════════════════════════════════════════════════

ADDRESS: ${walletInfo.address}
PRIVATE KEY: [REDACTED - See JSON file]
MNEMONIC: [REDACTED - See JSON file]
DERIVATION PATH: ${walletInfo.derivationPath}

FILES CREATED:
- ${filename} (Complete wallet data)${keystoreData ? `
- keystore-${walletInfo.address.slice(2, 10)}-${timestamp}.json (Encrypted keystore)` : ''}
- ${envFilename} (Environment template)
- ${secureFilename} (This file)

SECURITY NOTES:
- Keep the JSON file secure and offline
- Never commit private keys to version control
- Test with small amounts on testnets first
- Consider hardware wallets for production use

NETWORK COMPATIBILITY:
- Ethereum Mainnet
- Ethereum Testnets (Sepolia, Goerli, etc.)
- Polygon
- BSC
- Arbitrum
- Optimism
- Scroll (Mainnet & Sepolia)
- And other EVM-compatible networks
`;

    fs.writeFileSync(secureFilepath, secureContent);
    console.log(`🔒 Secure info saved to: ${secureFilepath}`);

    // Usage instructions
    console.log("\n📋 USAGE INSTRUCTIONS:");
    console.log("═══════════════════════════════════════════════════════");
    console.log("1. Copy the .env template to your project root as .env");
    console.log("2. Fund the wallet with ETH for gas fees");
    console.log("3. Use with Hardhat deployment scripts");
    console.log("4. Test on testnets before mainnet use");
    console.log("═══════════════════════════════════════════════════════");

    // Network-specific instructions
    console.log("\n🌐 NETWORK SETUP:");
    console.log("═══════════════════════════════════════════════════════");
    console.log("For Scroll Sepolia Testnet:");
    console.log("1. Get testnet ETH from: https://sepoliafaucet.com/");
    console.log("2. Bridge to Scroll: https://sepolia-bridge.scroll.io/");
    console.log("3. Use network: scrollSepolia");
    console.log("");
    console.log("For local development:");
    console.log("1. Run: npx hardhat node");
    console.log("2. Use network: localhost");
    console.log("3. Fund with test ETH from Hardhat accounts");
    console.log("═══════════════════════════════════════════════════════");

    return walletInfo;

  } catch (error) {
    console.error("❌ Error generating wallet:", error.message);
    process.exit(1);
  }
}

// Additional utility functions
function generateMultipleWallets(count = 5) {
  console.log(`\n🔐 Generating ${count} Wallets`);
  console.log("═══════════════════════════════════════════════════════");

  const wallets = [];
  for (let i = 0; i < count; i++) {
    const wallet = ethers.Wallet.createRandom();
    wallets.push({
      index: i,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase
    });
    console.log(`Wallet ${i + 1}: ${wallet.address}`);
  }

  return wallets;
}

function validateWallet(privateKey) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return {
      valid: true,
      address: wallet.address,
      checksumAddress: ethers.getAddress(wallet.address)
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

// Keystore utility functions
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

async function createKeystoreFromPrivateKey(privateKey, password, outputPath) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    const keystoreData = await wallet.encrypt(password);
    
    fs.writeFileSync(outputPath, JSON.stringify(keystoreData, null, 2));
    
    return {
      success: true,
      keystorePath: outputPath,
      address: wallet.address
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function validateKeystore(keystorePath) {
  try {
    const keystoreData = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
    
    // Basic keystore validation
    const requiredFields = ['version', 'id', 'address', 'crypto'];
    const hasRequiredFields = requiredFields.every(field => keystoreData.hasOwnProperty(field));
    
    if (!hasRequiredFields) {
      return {
        valid: false,
        error: "Invalid keystore format - missing required fields"
      };
    }
    
    return {
      valid: true,
      address: keystoreData.address,
      version: keystoreData.version
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🔐 Wallet Generator Script

Usage:
  node scripts/generate-wallet.js [options]

Options:
  --help, -h                    Show this help message
  --multiple, -m                Generate multiple wallets (default: 5)
  --count, -c <num>             Number of wallets to generate (with --multiple)
  --validate <key>              Validate a private key
  --no-keystore                 Generate wallet without keystore (less secure)
  --keystore-only               Generate only keystore (no private key in files)
  --validate-keystore <path>    Validate a keystore file
  --load-keystore <path>        Load wallet from keystore (requires password)
  --create-keystore <key>       Create keystore from existing private key

Examples:
  node scripts/generate-wallet.js
  node scripts/generate-wallet.js --keystore-only
  node scripts/generate-wallet.js --no-keystore
  node scripts/generate-wallet.js --multiple --count 10
  node scripts/generate-wallet.js --validate 0x1234...
  node scripts/generate-wallet.js --validate-keystore ./wallets/keystore.json
  node scripts/generate-wallet.js --create-keystore 0x1234...

Files created:
  - wallets/wallet-<timestamp>.json (Complete wallet data)
  - wallets/keystore-<address>-<timestamp>.json (Encrypted keystore)
  - wallets/.env.wallet-<timestamp> (Environment template)
  - wallets/wallet-secure-<timestamp>.txt (Secure info)

Security Features:
  - Keystore encryption with password protection
  - Multiple wallet generation options
  - Keystore validation and loading utilities
  - Secure password input (hidden characters)
`);
    process.exit(0);
  }

  if (args.includes("--validate")) {
    const keyIndex = args.indexOf("--validate");
    const privateKey = args[keyIndex + 1];
    
    if (!privateKey) {
      console.error("❌ Please provide a private key to validate");
      process.exit(1);
    }

    const result = validateWallet(privateKey);
    if (result.valid) {
      console.log("✅ Valid private key");
      console.log("📍 Address:", result.address);
      console.log("🔍 Checksum Address:", result.checksumAddress);
    } else {
      console.log("❌ Invalid private key:", result.error);
    }
    process.exit(0);
  }

  if (args.includes("--validate-keystore")) {
    const pathIndex = args.indexOf("--validate-keystore");
    const keystorePath = args[pathIndex + 1];
    
    if (!keystorePath) {
      console.error("❌ Please provide a keystore file path to validate");
      process.exit(1);
    }

    const result = validateKeystore(keystorePath);
    if (result.valid) {
      console.log("✅ Valid keystore file");
      console.log("📍 Address:", result.address);
      console.log("📋 Version:", result.version);
    } else {
      console.log("❌ Invalid keystore file:", result.error);
    }
    process.exit(0);
  }

  if (args.includes("--load-keystore")) {
    const pathIndex = args.indexOf("--load-keystore");
    const keystorePath = args[pathIndex + 1];
    
    if (!keystorePath) {
      console.error("❌ Please provide a keystore file path to load");
      process.exit(1);
    }

    (async () => {
      const password = await getPassword("Enter keystore password: ");
      const result = await loadWalletFromKeystore(keystorePath, password);
      
      if (result.success) {
        console.log("✅ Wallet loaded successfully");
        console.log("📍 Address:", result.address);
        console.log("🔑 Private Key:", result.wallet.privateKey);
      } else {
        console.log("❌ Failed to load wallet:", result.error);
      }
    })();
    process.exit(0);
  }

  if (args.includes("--create-keystore")) {
    const keyIndex = args.indexOf("--create-keystore");
    const privateKey = args[keyIndex + 1];
    
    if (!privateKey) {
      console.error("❌ Please provide a private key to create keystore");
      process.exit(1);
    }

    (async () => {
      const password = await getPassword("Enter password for keystore: ");
      const outputDir = path.join(__dirname, "..", "wallets");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const outputPath = path.join(outputDir, `keystore-${timestamp}.json`);
      
      const result = await createKeystoreFromPrivateKey(privateKey, password, outputPath);
      
      if (result.success) {
        console.log("✅ Keystore created successfully");
        console.log("📍 Address:", result.address);
        console.log("🔒 Keystore saved to:", result.keystorePath);
      } else {
        console.log("❌ Failed to create keystore:", result.error);
      }
    })();
    process.exit(0);
  }

  if (args.includes("--multiple") || args.includes("-m")) {
    const countIndex = args.indexOf("--count") || args.indexOf("-c");
    const count = countIndex !== -1 ? parseInt(args[countIndex + 1]) || 5 : 5;
    
    generateMultipleWallets(count);
  } else {
    const useKeystore = !args.includes("--no-keystore");
    const keystoreOnly = args.includes("--keystore-only");
    
    if (keystoreOnly) {
      generateWallet(true); // Force keystore generation
    } else {
      generateWallet(useKeystore);
    }
  }
}

module.exports = {
  generateWallet,
  generateMultipleWallets,
  validateWallet,
  loadWalletFromKeystore,
  createKeystoreFromPrivateKey,
  validateKeystore
};
