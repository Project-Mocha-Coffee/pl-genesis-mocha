/**
 * Grant MINTER_ROLE on Scroll Mainnet MBT to an address.
 * Caller must have DEFAULT_ADMIN_ROLE (e.g. deployer or current admin).
 *
 * Usage (from smart-contracts-erc4626-scroll-base):
 *   npm run grant:minter:scroll -- --to 0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795
 *
 * In .env use EITHER:
 *   PRIVATE_KEY=<deployer_key>              (if deployer is your only key)
 *   SCROLL_DEPLOYER_PRIVATE_KEY=<deployer_key>   (to keep existing PRIVATE_KEY; grant script uses this first)
 */

const { ethers } = require("ethers");
require("dotenv").config();

const SCROLL_MBT = "0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1";
const SCROLL_RPC = process.env.SCROLL_RPC_URL || "https://rpc.scroll.io";

const MBT_ABI = [
  "function grantRole(bytes32 role, address account) external",
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
  "function MINTER_ROLE() external view returns (bytes32)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
];

async function main() {
  const args = process.argv.slice(2);
  let toAddress = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--to" && args[i + 1]) {
      toAddress = args[i + 1];
      break;
    }
  }
  if (!toAddress) {
    console.error("Usage: node scripts/grant-minter-role-scroll.js --to <address>");
    process.exit(1);
  }
  toAddress = ethers.getAddress(toAddress);

  // Use Scroll deployer key if set (so you can keep PRIVATE_KEY as your normal wallet)
  const privateKey =
    process.env.SCROLL_DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("Set SCROLL_DEPLOYER_PRIVATE_KEY or PRIVATE_KEY in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(SCROLL_RPC);
  const signer = new ethers.Wallet(privateKey, provider);
  const mbt = new ethers.Contract(SCROLL_MBT, MBT_ABI, signer);

  const DEFAULT_ADMIN_ROLE = await mbt.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE = await mbt.MINTER_ROLE();

  const hasAdmin = await mbt.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
  if (!hasAdmin) {
    console.error("Caller does not have DEFAULT_ADMIN_ROLE. Signer:", signer.address);
    process.exit(1);
  }

  const alreadyMinter = await mbt.hasRole(MINTER_ROLE, toAddress);
  if (alreadyMinter) {
    console.log("Address already has MINTER_ROLE:", toAddress);
    process.exit(0);
  }

  console.log("Granting MINTER_ROLE on Scroll MBT");
  console.log("  MBT:  ", SCROLL_MBT);
  console.log("  To:   ", toAddress);
  console.log("  From: ", signer.address);

  const tx = await mbt.grantRole(MINTER_ROLE, toAddress);
  console.log("  Tx:   ", tx.hash);
  console.log("  Explorer: https://scrollscan.com/tx/" + tx.hash);

  await tx.wait();
  console.log("Done. MINTER_ROLE granted to", toAddress);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
