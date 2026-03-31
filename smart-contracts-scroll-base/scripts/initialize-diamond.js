const { ethers } = require("hardhat");
const fs = require("fs");

// Deployment configuration
const DEPLOYMENT_FILE = "deployments/deployment-scrollSepolia-chain-534351-2025-08-09T09-35-04-033Z.txt";

async function loadDeploymentInfo() {
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
            trimmedLine.startsWith('TOKEN CONTRACTS:') || trimmedLine.startsWith('FACETS:') || 
            trimmedLine.startsWith('UTILITIES:') || trimmedLine.startsWith('VAULT (MTTR):')) {
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
    console.log("🔧 Initializing TreeFarm Diamond");
    console.log("================================\n");

    // Load deployment information
    const deployment = await loadDeploymentInfo();
    console.log("Parsed deployment keys:", Object.keys(deployment));
    console.log("Full deployment object:", deployment);
    
    const diamondAddress = deployment.TreeFarmDiamond;
    const mttAddress = deployment.MochaTreeToken;
    const mltAddress = deployment.MochaLandToken;
    const mbtAddress = deployment.MochaBeanToken;
    
    if (!diamondAddress || !mttAddress || !mltAddress || !mbtAddress) {
        throw new Error("Missing required contract addresses. Found: " + 
            JSON.stringify({ diamondAddress, mttAddress, mltAddress, mbtAddress }));
    }

    console.log("Contract Addresses:");
    console.log("  Diamond:", diamondAddress);
    console.log("  MTT Token:", mttAddress);
    console.log("  MLT Token:", mltAddress);
    console.log("  MBT Token:", mbtAddress);
    console.log("");

    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("");

    // Get contract instances
    const diamond = await ethers.getContractAt("InitializationFacet", diamondAddress);
    
    // Check if already initialized
    try {
        const mttToken = await diamond.MTTToken();
        const mltToken = await diamond.MLTToken();
        const mbtToken = await diamond.MBTToken();
        
        if (mttToken !== ethers.ZeroAddress && mltToken !== ethers.ZeroAddress && mbtToken !== ethers.ZeroAddress) {
            console.log("✅ Diamond is already initialized!");
            console.log("   MTT Token:", mttToken);
            console.log("   MLT Token:", mltToken);
            console.log("   MBT Token:", mbtToken);
            return;
        }
    } catch (error) {
        console.log("   Diamond not initialized yet, proceeding with initialization...");
    }

    // Initialize the Diamond
    console.log("Initializing Diamond...");
    try {
        const tx = await diamond.connect(deployer).initialize(
            mttAddress,
            mltAddress,
            mbtAddress
        );
        await tx.wait();
        console.log("✅ Diamond initialized successfully!");
        console.log("   Transaction hash:", tx.hash);
        
        // Verify initialization
        const mttToken = await diamond.MTTToken();
        const mltToken = await diamond.MLTToken();
        const mbtToken = await diamond.MBTToken();
        
        console.log("\nVerification:");
        console.log("   MTT Token:", mttToken);
        console.log("   MLT Token:", mltToken);
        console.log("   MBT Token:", mbtToken);
        
    } catch (error) {
        console.error("❌ Failed to initialize Diamond:", error.message);
        throw error;
    }
    
    console.log("\n🎉 Diamond initialization complete!");
    console.log("   The FarmManagementFacet can now recognize the MLT token.");
}

// Error handling
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
