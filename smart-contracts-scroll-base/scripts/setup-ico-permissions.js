const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment information
const deploymentFile = path.join(__dirname, "..", "deployments", "scrollSepolia-ico-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

async function main() {
    console.log("🔧 Setting up ICO Contract Permissions");
    console.log("=".repeat(50));

    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);

    // Connect to contracts
    const ico = await ethers.getContractAt("ICO", deployment.contracts.ico);
    const token = await ethers.getContractAt("MochaBeanToken", deployment.contracts.token);

    console.log(`📋 ICO Contract: ${deployment.contracts.ico}`);
    console.log(`🪙 Token Contract: ${deployment.contracts.token}\n`);

    // Check current permissions
    console.log("🔍 Checking current permissions...");
    const icoAddress = deployment.contracts.ico;
    const hasMinterRole = await token.hasRole(await token.MINTER_ROLE(), icoAddress);
    const hasAdminRole = await token.hasRole(await token.DEFAULT_ADMIN_ROLE(), deployer.address);

    console.log(`   ICO has MINTER_ROLE: ${hasMinterRole}`);
    console.log(`   Deployer has ADMIN_ROLE: ${hasAdminRole}\n`);

    if (!hasMinterRole) {
        console.log("🔐 Granting MINTER_ROLE to ICO contract...");
        try {
            const tx = await token.grantRole(await token.MINTER_ROLE(), icoAddress);
            await tx.wait();
            console.log("✅ MINTER_ROLE granted successfully!\n");
        } catch (error) {
            console.log(`❌ Failed to grant MINTER_ROLE: ${error.message}\n`);
        }
    } else {
        console.log("✅ ICO already has MINTER_ROLE\n");
    }

    // Verify permissions
    console.log("🔍 Verifying permissions...");
    const hasMinterRoleAfter = await token.hasRole(await token.MINTER_ROLE(), icoAddress);
    console.log(`   ICO has MINTER_ROLE: ${hasMinterRoleAfter}\n`);

    if (hasMinterRoleAfter) {
        console.log("🎉 ICO permissions setup completed successfully!");
        console.log("   The ICO contract can now mint tokens for purchases.");
    } else {
        console.log("❌ ICO permissions setup failed!");
        console.log("   The ICO contract cannot mint tokens.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
