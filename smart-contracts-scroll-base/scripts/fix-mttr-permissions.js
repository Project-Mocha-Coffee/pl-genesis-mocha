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
    console.log("🔧 Fixing MTTR Contract Permissions");
    console.log("===================================");

    // Load deployment information
    const deployment = await loadDeploymentInfo();
    const mttrAddress = deployment.MochaTreeRightsToken;
    const mbtAddress = deployment.MochaBeanToken;
    
    console.log("Contract Addresses:");
    console.log("  MTTR (MochaTreeRightsToken):", mttrAddress);
    console.log("  MBT (MochaBeanToken):", mbtAddress);
    console.log("");

    // Get deployer signer
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    // Get contract instances
    const mbt = await ethers.getContractAt("MochaBeanToken", mbtAddress);
    const mttr = await ethers.getContractAt("MochaTreeRightsToken", mttrAddress);

    console.log("\n📋 Checking current permissions...");

    // Check if deployer has DEFAULT_ADMIN_ROLE on MBT
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // 0x0000000000000000000000000000000000000000000000000000000000000000
    const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

    const deployerHasAdminRole = await mbt.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    console.log(`   Deployer has DEFAULT_ADMIN_ROLE on MBT: ${deployerHasAdminRole}`);

    const mttrHasBurnerRole = await mbt.hasRole(BURNER_ROLE, mttrAddress);
    console.log(`   MTTR has BURNER_ROLE on MBT: ${mttrHasBurnerRole}`);

    const mttrHasMinterRole = await mbt.hasRole(MINTER_ROLE, mttrAddress);
    console.log(`   MTTR has MINTER_ROLE on MBT: ${mttrHasMinterRole}`);

    if (!deployerHasAdminRole) {
        console.log("❌ Deployer does not have DEFAULT_ADMIN_ROLE on MBT token");
        console.log("   Cannot grant roles to MTTR contract");
        return;
    }

    if (!mttrHasBurnerRole) {
        console.log("\n🔧 Granting BURNER_ROLE to MTTR contract...");
        try {
            const tx = await mbt.connect(deployer).grantRole(BURNER_ROLE, mttrAddress);
            await tx.wait();
            console.log("✅ BURNER_ROLE granted to MTTR contract");
        } catch (error) {
            console.log("❌ Failed to grant BURNER_ROLE:", error.message);
            return;
        }
    } else {
        console.log("✅ MTTR already has BURNER_ROLE");
    }

   /*  if (!mttrHasMinterRole) {
        console.log("\n🔧 Granting MINTER_ROLE to MTTR contract...");
        try {
            const tx = await mbt.connect(deployer).grantRole(MINTER_ROLE, mttrAddress);
            await tx.wait();
            console.log("✅ MINTER_ROLE granted to MTTR contract");
        } catch (error) {
            console.log("❌ Failed to grant MINTER_ROLE:", error.message);
            return;
        }
    } else {
        console.log("✅ MTTR already has MINTER_ROLE");
    } */

    // Verify the roles were granted
    console.log("\n📋 Verifying permissions...");
    const mttrHasBurnerRoleAfter = await mbt.hasRole(BURNER_ROLE, mttrAddress);
    const mttrHasMinterRoleAfter = await mbt.hasRole(MINTER_ROLE, mttrAddress);
    
    console.log(`   MTTR has BURNER_ROLE: ${mttrHasBurnerRoleAfter}`);
    console.log(`   MTTR has MINTER_ROLE: ${mttrHasMinterRoleAfter}`);

    if (mttrHasBurnerRoleAfter ) {
        console.log("\n🎉 MTTR contract permissions fixed successfully!");
        console.log("   The contract should now be able to burn MBT tokens during bond purchases.");
    } else {
        console.log("\n❌ Failed to grant all necessary permissions to MTTR contract");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
