const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Configuration files
const DEPLOYMENT_FILE = "deployments/deployment-scrollSepolia-chain-534351-2025-08-11T14-58-45-568Z.txt";

async function loadDeploymentInfo() {
    // Check if deployment file exists
    if (!fs.existsSync(DEPLOYMENT_FILE)) {
        throw new Error(`Deployment file not found: ${DEPLOYMENT_FILE}`);
    }
    
    const deploymentContent = fs.readFileSync(DEPLOYMENT_FILE, "utf8");
    const deployment = {};
    
    // Parse the deployment file to extract contract addresses
    const lines = deploymentContent.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and headers
        if (!trimmedLine || trimmedLine.startsWith('=') || trimmedLine.startsWith('TreeFarm System') || 
            trimmedLine.startsWith('Deployed at:') || trimmedLine.startsWith('Network:') || 
            trimmedLine.startsWith('Deployer:') || trimmedLine.startsWith('NOTE:') || 
            trimmedLine.startsWith('TOKEN CONTRACTS:') || trimmedLine.startsWith('DIAMOND:') || 
            trimmedLine.startsWith('FACETS:') || trimmedLine.startsWith('UTILITIES:') || 
            trimmedLine.startsWith('VAULT (MTTR):') || trimmedLine.startsWith('DIAMOND TOKEN ADDRESSES:')) {
            continue;
        }
        
        // Parse contract addresses
        if (trimmedLine.includes(':')) {
            const colonIndex = trimmedLine.indexOf(':');
            const key = trimmedLine.substring(0, colonIndex).trim();
            const value = trimmedLine.substring(colonIndex + 1).trim();
            
            // Check if value looks like an Ethereum address
            if (value.startsWith('0x') && value.length === 42) {
                deployment[key] = value;
            }
        }
    }
    
    return deployment;
}

async function main() {
    console.log("🔧 Granting ORACLE_ROLE to Deployer");
    console.log("===================================");

    // Load deployment information
    const deployment = await loadDeploymentInfo();
    const mttrAddress = deployment.MochaTreeRightsToken;
    
    console.log("Contract Addresses:");
    console.log("  MTTR (MochaTreeRightsToken):", mttrAddress);
    console.log("");

    // Get deployer signer
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    // Get contract instance
    const mttr = await ethers.getContractAt("MochaTreeRightsToken", mttrAddress);

    // Check current roles
    const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
    const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // 0x0000000000000000000000000000000000000000000000000000000000000000

    console.log("\n📋 Checking current roles...");
    const hasOracleRole = await mttr.hasRole(ORACLE_ROLE, deployer.address);
    const hasAdminRole = await mttr.hasRole(ADMIN_ROLE, deployer.address);
    const hasDefaultAdminRole = await mttr.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    
    console.log(`   Deployer has ORACLE_ROLE: ${hasOracleRole}`);
    console.log(`   Deployer has ADMIN_ROLE: ${hasAdminRole}`);
    console.log(`   Deployer has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole}`);

    if (hasOracleRole) {
        console.log("✅ Deployer already has ORACLE_ROLE");
        return;
    }

    // Check if deployer can grant roles
    if (!hasDefaultAdminRole && !hasAdminRole) {
        console.log("❌ Deployer does not have ADMIN_ROLE or DEFAULT_ADMIN_ROLE");
        console.log("   Cannot grant ORACLE_ROLE");
        return;
    }

    console.log("\n🔧 Granting ORACLE_ROLE to deployer...");
    try {
        const tx = await mttr.connect(deployer).grantRole(ORACLE_ROLE, deployer.address);
        console.log(`   📝 Transaction submitted: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Verify the role was granted
        const hasOracleRoleAfter = await mttr.hasRole(ORACLE_ROLE, deployer.address);
        console.log(`   📋 Deployer has ORACLE_ROLE: ${hasOracleRoleAfter}`);
        
        if (hasOracleRoleAfter) {
            console.log("\n🎉 ORACLE_ROLE granted successfully!");
            console.log("   The deployer can now update collateral valuations.");
        } else {
            console.log("\n❌ Failed to grant ORACLE_ROLE");
        }
        
    } catch (error) {
        console.log("❌ Failed to grant ORACLE_ROLE:", error.message);
        
        // Try to decode the error
        if (error.data) {
            try {
                const decodedError = mttr.interface.parseError(error.data);
                console.log(`   Decoded Error: ${decodedError.name}`);
                console.log(`   Error Args: ${JSON.stringify(decodedError.args)}`);
            } catch (decodeError) {
                console.log(`   Could not decode error: ${decodeError.message}`);
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });


