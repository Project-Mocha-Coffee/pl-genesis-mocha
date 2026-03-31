const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Usage:
//   npx hardhat run scripts/add-trees-to-farm.js --network <network> --farmId 1 --start 11 --count 5
//   npx hardhat run scripts/add-trees-to-farm.js --network <network> --farmId 1 --treeIds 21,22,23
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
  const startStr = ("271");
  const countStr = ("150");
  const treeIdsStr = get("--treeIds");
  const owner = get("--owner");

  let mode;
  let start = undefined;
  let count = undefined;
  let treeIds = undefined;

  if (treeIdsStr) {
    mode = "list";
    treeIds = treeIdsStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length)
      .map((s) => BigInt(s));
    if (!treeIds.length) throw new Error("--treeIds provided but empty after parsing");
  } else if (startStr && countStr) {
    mode = "range";
    start = BigInt(startStr);
    count = BigInt(countStr);
    if (count <= 0n) throw new Error("--count must be > 0");
  } else {
    throw new Error("Provide either --treeIds (comma-separated) or --start and --count");
  }

  return {
    farmId: BigInt(farmIdStr),
    mode,
    start,
    count,
    treeIds,
    owner,
  };
}

async function main() {
  console.log("Add Trees to Existing Farm");
  console.log("==========================\n");

  const { data: deployment } = loadLatestDeployment();
  const { farmId, mode, start, count, treeIds, owner } = parseArgs();

  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (chainId ${network.chainId})`);

  // Resolve contract addresses
  const mttrAddress = deployment.tokens?.MochaTreeRightsToken || deployment.diamond?.Vault?.mttrVault;
  const mltAddress = deployment.tokens?.MochaLandToken;
  const mttAddress = deployment.tokens?.MochaTreeToken;
  if (!mttrAddress || !mltAddress || !mttAddress) {
    throw new Error("Missing MTTR/MLT/MTT addresses in latest deployment file");
  }

  console.log("Contracts:");
  console.log("  MTTR:", mttrAddress);
  console.log("  MLT:", mltAddress);
  console.log("  MTT:", mttAddress);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Contract instances
  const mlt = await ethers.getContractAt("MochaLandToken", mltAddress);
  const mtt = await ethers.getContractAt("MochaTreeToken", mttAddress);
  const mttr = await ethers.getContractAt("MochaTreeRightsToken", mttrAddress);

  // Determine owner of farm (MLT owner) if not provided
  let farmOwner = owner;
  if (!farmOwner) {
    farmOwner = await mlt.ownerOf(farmId);
    console.log(`Detected farm owner from MLT.ownerOf(${farmId}): ${farmOwner}`);
  } else {
    console.log(`Using provided farm owner: ${farmOwner}`);
  }

  // Build list of tree IDs to mint
  let trees = [];
  if (mode === "list") {
    trees = treeIds;
  } else {
    for (let i = 0n; i < count; i++) {
      trees.push(start + i);
    }
  }
  console.log(`Minting ${trees.length} tree token(s) to ${farmOwner} for farm ${farmId}...`);

  let minted = 0;
  let totalGasUsed = 0n;
  let totalGasPrice = 0n;
  let totalTransactionCount = 0;
  
  for (const treeId of trees) {
    try {
      const existing = await mtt.subBalanceOf(farmOwner, farmId, treeId);
      if (existing > 0n) {
        console.log(` - Tree ${treeId} already owned, skipping`);
        continue;
      }
      const tx = await mtt.connect(deployer).mint(farmOwner, farmId, treeId, 1);
      const receipt = await tx.wait();
      
      // Track gas usage
      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.effectiveGasPrice || tx.gasPrice;
      totalGasUsed += gasUsed;
      totalGasPrice += gasPrice;
      totalTransactionCount++;
      
      minted++;
      console.log(` + Minted tree ${treeId} (gas: ${gasUsed.toString()})`);
    } catch (e) {
      console.log(` ! Failed to mint tree ${treeId}: ${e.message}`);
    }
  }

  console.log(`\nMinted ${minted}/${trees.length} tree token(s).`);

  // Gas usage summary
  if (totalTransactionCount > 0) {
    const averageGasPrice = totalGasPrice / BigInt(totalTransactionCount);
    const totalCostWei = totalGasUsed * averageGasPrice;
    const totalCostEth = ethers.formatEther(totalCostWei);
    
    console.log("\n📊 Gas Usage Summary:");
    console.log("===================");
    console.log(`Total transactions: ${totalTransactionCount}`);
    console.log(`Total gas used: ${totalGasUsed.toString()}`);
    console.log(`Average gas price: ${ethers.formatUnits(averageGasPrice, 'gwei')} gwei`);
    console.log(`Total cost: ${totalCostEth} ETH`);
    console.log(`Average gas per mint: ${(totalGasUsed / BigInt(totalTransactionCount)).toString()}`);
  } else {
    console.log("\n📊 Gas Usage Summary: No transactions executed");
  }

  // Optionally refresh farm tree info in MTTR (if function exists)
  try {
    if (mttr.refreshFarmTreeInfo) {
      console.log("Calling MTTR.refreshFarmTreeInfo to update farm data...");
      
      // Get the farm owner from MLT contract (same as token-bound account)
      const farmOwner = await mlt.ownerOf(farmId);
      console.log(`Farm owner (token-bound account): ${farmOwner}`);
      
      const tx2 = await mttr.connect(deployer).refreshFarmTreeInfo(farmId, farmOwner);
      await tx2.wait();
      console.log("✅ Farm tree info refreshed.");
    } else {
      console.log("ℹ️ MTTR.refreshFarmTreeInfo not available on this build; skipping refresh call.");
    }
  } catch (e) {
    console.log(`⚠️  Failed to refresh farm tree info: ${e.message}`);
  }

  console.log("\n✅ Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script failed:", err.message);
    process.exit(1);
  });



