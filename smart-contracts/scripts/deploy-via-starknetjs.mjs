// deploy-via-starknetjs.mjs
// Deploy MBTToken + FarmRegistry to Starknet mainnet using starknet.js
import { RpcProvider, Account, Contract, CallData, hash, cairo } from "starknet";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = path.join(__dirname, "..", "target", "dev");

const RPC_URL = "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/demo";
const PRIVATE_KEY = "0x03976d7bf3fed8d56c05b3ced025e657c2ca260186389dca8b1d36b7ad663ed6";
const OWNER_ADDRESS = "0x069a1e085682601c67c0aaad1b2396dbd9729f10d71651832de2483429ea7b22";

// Class hashes from the declare transactions we already submitted
const MBT_CLASS_HASH = "0x070b54eee2f289f70d26597f1f3f443db7aeb7d3e2a069a22929e774e8876b81";
const FARM_CLASS_HASH = "0x011c67b529ae1954873d9f3b019b83f1207f8176dca7d0872d060ae78ef50e69";

async function main() {
  console.log("=== Project Mocha — Starknet Mainnet Deploy ===\n");

  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, OWNER_ADDRESS, PRIVATE_KEY, "1");

  // Verify the account exists
  const nonce = await account.getNonce();
  console.log(`Account: ${OWNER_ADDRESS}`);
  console.log(`Nonce:   ${nonce}`);

  // ── Deploy MBTToken ────────────────────────────────────────────────────────
  console.log("\n[1/2] Deploying MBTToken...");

  const mbtCalldata = CallData.compile({
    name: cairo.byteArray("Mocha Bean Token"),
    symbol: cairo.byteArray("MBT"),
    initial_owner: OWNER_ADDRESS,
  });

  const mbtDeploy = await account.deployContract({
    classHash: MBT_CLASS_HASH,
    constructorCalldata: mbtCalldata,
  });

  console.log(`  TX:      ${mbtDeploy.transaction_hash}`);
  await provider.waitForTransaction(mbtDeploy.transaction_hash);
  const mbtAddress = mbtDeploy.contract_address;
  console.log(`  Address: ${mbtAddress}`);

  // ── Deploy FarmRegistry ───────────────────────────────────────────────────
  console.log("\n[2/2] Deploying FarmRegistry...");

  const farmCalldata = CallData.compile({
    owner: OWNER_ADDRESS,
  });

  const farmDeploy = await account.deployContract({
    classHash: FARM_CLASS_HASH,
    constructorCalldata: farmCalldata,
  });

  console.log(`  TX:      ${farmDeploy.transaction_hash}`);
  await provider.waitForTransaction(farmDeploy.transaction_hash);
  const farmAddress = farmDeploy.contract_address;
  console.log(`  Address: ${farmAddress}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n==============================================");
  console.log("  Deployment complete!");
  console.log(`  MBTToken     : ${mbtAddress}`);
  console.log(`  FarmRegistry : ${farmAddress}`);
  console.log("\n  Verify on Starkscan:");
  console.log(`  https://starkscan.co/contract/${mbtAddress}`);
  console.log(`  https://starkscan.co/contract/${farmAddress}`);
  console.log("==============================================\n");
}

main().catch((err) => {
  console.error("Deployment failed:", err.message || err);
  process.exit(1);
});
