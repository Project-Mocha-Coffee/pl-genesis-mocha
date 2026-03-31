const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Usage examples:
//   npx hardhat run scripts/manage-mbt-minter-role.js --network scrollSepolia --grant 0xICOAddress
//   npx hardhat run scripts/manage-mbt-minter-role.js --network scrollSepolia --revoke 0xICOAddress
//   npx hardhat run scripts/manage-mbt-minter-role.js --network scrollSepolia --check 0xICOAddress

function getCliArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  console.log(`📡 Network: ${networkName} (Chain ID: ${network.chainId})`);

  // Load deployment JSON to get MBT token address
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deploymentFile = path.join(deploymentsDir, `${networkName}-ico-deployment.json`);
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`❌ Deployment file not found: ${deploymentFile}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const mbtAddress = deployment?.contracts?.token;
  if (!mbtAddress) throw new Error("❌ MBT token address missing in deployment file");

  console.log(`🪙 MBT Token Address: ${mbtAddress}`);

  // Get MBT contract instance
  const mbt = await ethers.getContractAt("contracts/tokens/MochaBeanToken.sol:MochaBeanToken", mbtAddress);
  
  // Get MINTER_ROLE constant
  const MINTER_ROLE = await mbt.MINTER_ROLE();
  console.log(`🔑 MINTER_ROLE: ${MINTER_ROLE}`);

  const [signer] = await ethers.getSigners();
  console.log(`👤 Signer: ${signer.address}`);

  // Check if signer has admin role
  const hasAdminRole = await mbt.hasRole(await mbt.DEFAULT_ADMIN_ROLE(), signer.address);
  if (!hasAdminRole) {
    throw new Error("❌ Signer does not have DEFAULT_ADMIN_ROLE");
  }
  console.log(`✅ Signer has admin role`);

  const targetAddress = "0x2Df7A763506708787737584248CC34a2c57E18Ad";
  if (!targetAddress) {
    throw new Error("❌ Please specify --grant, --revoke, or --check with an address");
  }

  console.log(`🎯 Target Address: ${targetAddress}`);

  // Check current role status
  const hasMinterRole = await mbt.hasRole(MINTER_ROLE, targetAddress);
  console.log(`📊 Current MINTER_ROLE status: ${hasMinterRole ? "✅ GRANTED" : "❌ NOT GRANTED"}`);

  if (true) {
    if (hasMinterRole) {
      console.log(`⚠️  Address already has MINTER_ROLE`);
    } else {
      console.log(`🔄 Granting MINTER_ROLE to ${targetAddress}...`);
      const tx = await mbt.grantRole(MINTER_ROLE, targetAddress);
      const receipt = await tx.wait();
      console.log(`✅ MINTER_ROLE granted. tx: ${receipt.hash}`);
    }
  } else if (getCliArg("revoke")) {
    if (!hasMinterRole) {
      console.log(`⚠️  Address does not have MINTER_ROLE`);
    } else {
      console.log(`🔄 Revoking MINTER_ROLE from ${targetAddress}...`);
      const tx = await mbt.revokeRole(MINTER_ROLE, targetAddress);
      const receipt = await tx.wait();
      console.log(`✅ MINTER_ROLE revoked. tx: ${receipt.hash}`);
    }
  } else if (getCliArg("check")) {
    console.log(`🔍 Role check complete.`);
  }

  // Display all current minters
  console.log(`\n📋 Current MINTER_ROLE holders:`);
  // Note: AccessControl doesn't have a direct way to enumerate role members
  // This would require additional events or a custom function
  console.log(`   (Use events or custom enumeration to see all minters)`);
}

main().catch((err) => {
  console.error("❌ Role management script failed:", err);
  process.exit(1);
});










