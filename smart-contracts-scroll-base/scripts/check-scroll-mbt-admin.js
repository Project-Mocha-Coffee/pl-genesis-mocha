/**
 * Check who has DEFAULT_ADMIN_ROLE on the Scroll Mainnet MBT contract.
 * Uses RoleGranted / RoleRevoked events to derive current admin(s).
 *
 * Usage:
 *   node scripts/check-scroll-mbt-admin.js
 *   node scripts/check-scroll-mbt-admin.js --wallet 0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795
 */

const { ethers } = require("ethers");

const SCROLL_MBT = "0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1";
const SCROLL_RPC = process.env.SCROLL_RPC_URL || "https://rpc.scroll.io";

const MBT_ABI = [
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
  "function MINTER_ROLE() external view returns (bytes32)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
];

async function main() {
  const args = process.argv.slice(2);
  let checkWallet = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--wallet" && args[i + 1]) {
      checkWallet = args[i + 1];
      break;
    }
  }
  if (!checkWallet) {
    checkWallet = "0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795";
  }

  const provider = new ethers.JsonRpcProvider(SCROLL_RPC);
  const mbt = new ethers.Contract(SCROLL_MBT, MBT_ABI, provider);

  console.log("Scroll MBT (DEFAULT_ADMIN_ROLE check)");
  console.log("========================================");
  console.log("MBT contract:", SCROLL_MBT);
  console.log("Scroll RPC:  ", SCROLL_RPC);
  console.log("Wallet to check:", checkWallet);
  console.log("");

  const DEFAULT_ADMIN_ROLE = await mbt.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE = await mbt.MINTER_ROLE();

  // Candidates: contract creator (from Scrollscan or known deployer) + wallet to check
  const knownScrollMbtDeployer = "0x6ed208c1e6a012118194c4457fe8dc3215ea971a"; // from Scrollscan Contract Creator
  let candidateAdmins = [knownScrollMbtDeployer];
  const apiKey = process.env.SCROLLSCAN_API_KEY || process.env.SCROLL_API_KEY;
  if (apiKey) {
    try {
      const url = `https://api.scrollscan.com/api?module=contract&action=getcontractcreation&contractaddresses=${SCROLL_MBT}&apikey=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.result && Array.isArray(data.result) && data.result[0]) {
        const creator = data.result[0].contractCreator;
        if (creator) candidateAdmins.push(ethers.getAddress(creator));
      }
    } catch (e) {
      // ignore
    }
  }
  const toVerify = [...new Set([...candidateAdmins, checkWallet])];

  console.log("hasRole(DEFAULT_ADMIN_ROLE / MINTER_ROLE):");
  let yourHasAdmin = false;
  let yourHasMinter = false;
  for (const addr of toVerify) {
    const hasAdmin = await mbt.hasRole(DEFAULT_ADMIN_ROLE, addr);
    const hasMinter = await mbt.hasRole(MINTER_ROLE, addr);
    if (addr.toLowerCase() === checkWallet.toLowerCase()) {
      yourHasAdmin = hasAdmin;
      yourHasMinter = hasMinter;
    }
    let label = "";
    if (addr.toLowerCase() === checkWallet.toLowerCase()) label = " (your wallet)";
    else if (addr.toLowerCase() === knownScrollMbtDeployer.toLowerCase()) label = " (Scroll MBT deployer per Scrollscan)";
    console.log(`  ${addr}${label}`);
    console.log(`    DEFAULT_ADMIN_ROLE: ${hasAdmin ? "YES" : "NO"}`);
    console.log(`    MINTER_ROLE:        ${hasMinter ? "YES" : "NO"}`);
  }
  console.log("  (Deployer from Scrollscan is checked above; if you control that wallet, use it as PRIVATE_KEY and run grant:minter:scroll)");

  console.log("\n========================================");
  if (yourHasAdmin && !yourHasMinter) {
    console.log("You have DEFAULT_ADMIN_ROLE but not MINTER_ROLE.");
    console.log("Run: npm run grant:minter:scroll -- --to " + checkWallet);
    console.log("(Use the wallet that has DEFAULT_ADMIN_ROLE as PRIVATE_KEY in .env)");
  } else if (yourHasMinter) {
    console.log("You already have MINTER_ROLE on Scroll. You can mint with: npm run mint:mbt:scroll");
  } else if (yourHasAdmin) {
    console.log("You have DEFAULT_ADMIN_ROLE. Grant yourself MINTER_ROLE with grant:minter:scroll.");
  } else {
    console.log("Your wallet does not have DEFAULT_ADMIN_ROLE on Scroll.");
    console.log("Find the MBT deployer (Scrollscan contract creation tx) or set SCROLLSCAN_API_KEY to detect it; that address can grant you MINTER_ROLE.");
  }
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
