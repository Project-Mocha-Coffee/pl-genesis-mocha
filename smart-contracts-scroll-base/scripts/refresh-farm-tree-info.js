const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Usage:
//   npx hardhat run scripts/refresh-farm-tree-info.js --network <network> --farmId 1
//   ...optional: --owner 0xOwnerAddress (defaults to MLT.ownerOf(farmId))

const DEPLOYMENTS_DIR = path.join(__dirname, "../deployments");

function loadLatestDeployment() {
  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    throw new Error(`Deployments directory not found: ${DEPLOYMENTS_DIR}`);
  }
  const files = fs
    .readdirSync(DEPLOYMENTS_DIR)
    .filter((f) => f.startsWith("deployment-") && f.endsWith(".json"))
    .sort((a, b) => fs.statSync(path.join(DEPLOYMENTS_DIR, b)).mtimeMs - fs.statSync(path.join(DEPLOYMENTS_DIR, a)).mtimeMs);
  if (!files.length) throw new Error("No deployment files found in deployments/");
  const p = path.join(DEPLOYMENTS_DIR, files[0]);
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  return { file: p, data: json };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const farmIdStr = ("1");
  if (!farmIdStr) throw new Error("--farmId is required");
  const owner = get("--owner");

  return {
    farmId: BigInt(farmIdStr),
    owner,
  };
}

async function main() {
  console.log("Refresh Farm Tree Info");
  console.log("=====================\n");

  const { data: deployment } = loadLatestDeployment();
  const { farmId, owner } = parseArgs();

  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (chainId ${network.chainId})`);

  // Resolve contract addresses
  const mttrAddress = deployment.tokens?.MochaTreeRightsToken || deployment.diamond?.Vault?.mttrVault;
  const mltAddress = deployment.tokens?.MochaLandToken;
  if (!mttrAddress || !mltAddress) {
    throw new Error("Missing MTTR/MLT addresses in latest deployment file");
  }

  console.log("Contracts:");
  console.log("  MTTR:", mttrAddress);
  console.log("  MLT:", mltAddress);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Contract instances
  const mlt = await ethers.getContractAt("MochaLandToken", mltAddress);
  const mttr = await ethers.getContractAt("MochaTreeRightsToken", mttrAddress);

  // Determine farm owner if not provided
  let farmOwner = owner;
  if (true) {
    farmOwner = await mlt.ownerOf(farmId);
    console.log(`Detected farm owner from MLT.ownerOf(${farmId}): ${farmOwner}`);
  } else {
    console.log(`Using provided farm owner: ${farmOwner}`);
  }

  // Check if farm exists in vault
  try {
    const isFarmValid = await mttr.isFarmValid(farmId);
    if (!isFarmValid) {
      throw new Error(`Farm ${farmId} is not valid in the vault`);
    }
    console.log(`✅ Farm ${farmId} is valid in vault`);
  } catch (e) {
    console.log(`❌ Farm ${farmId} validation failed: ${e.message}`);
    throw e;
  }

  // Get current farm tree info before refresh
  try {
    const currentTreeCount = await mttr.getFarmTreeCount(farmId);
    console.log(`Current tree count: ${currentTreeCount}`);
  } catch (e) {
    console.log(`⚠️  Could not get current tree count: ${e.message}`);
  }

  // Refresh farm tree info
  try {
    console.log("Calling MTTR.refreshFarmTreeInfo to update farm data...");
    console.log(`Farm owner (token-bound account): ${farmOwner}`);
    
    const tx = await mttr.connect(deployer).refreshFarmTreeInfo(farmId, farmOwner);
    console.log(`Transaction hash: ${tx.hash}`);
    
    await tx.wait();
    console.log("✅ Farm tree info refreshed successfully.");
    
    // Get updated farm tree info after refresh
    try {
      const updatedTreeCount = await mttr.getFarmTreeCount(farmId);
      console.log(`Updated tree count: ${updatedTreeCount}`);
    } catch (e) {
      console.log(`⚠️  Could not get updated tree count: ${e.message}`);
    }
    
  } catch (e) {
    console.log(`❌ Failed to refresh farm tree info: ${e.message}`);
    throw e;
  }

  console.log("\n✅ Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script failed:", err.message);
    process.exit(1);
  });
