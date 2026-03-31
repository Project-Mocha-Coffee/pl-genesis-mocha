// seed-and-mint.mjs — Seed Farm v1 + Mint 1,000 MBT on Starknet Mainnet
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Resolve starknet from the scroll-base project's node_modules
const starknetPath = path.join(
  __dirname, "..", "..", "smart-contracts-erc4626-scroll-base",
  "node_modules", "starknet", "dist", "index.js"
);
const { RpcProvider, Account, CallData } = await import(starknetPath);

const RPC_URL  = "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/demo";
const PRIVKEY  = "0x03976d7bf3fed8d56c05b3ced025e657c2ca260186389dca8b1d36b7ad663ed6";
const OWNER    = "0x069a1e085682601c67c0aaad1b2396dbd9729f10d71651832de2483429ea7b22";
const MBT_ADDR = "0x04a91f423a6f8795820e35784d6fbd94cca7dc4250b7721ec3c9d8ff761047ec";
const FARM_ADR = "0x01f260921259669dd5660e9ea52c8745f537c3c250303478c4c4a933d4be7278";

const provider = new RpcProvider({ nodeUrl: RPC_URL });
const account  = new Account(provider, OWNER, PRIVKEY, "1");

console.log("=========================================");
console.log("  Project Mocha — Starknet Farm v1 Setup");
console.log("=========================================\n");
console.log("  Pilot farm   : 2,500 trees total");
console.log("  Scroll       : 2,000 trees already minted");
console.log("  Starknet v1  : 500 remaining trees");
console.log("  MBT mint     : 1,000 MBT ($25,000 @ $25/MBT)");
console.log("    └ 500 MBT  = 1:1 tree shares");
console.log("    └ 500 MBT  = protocol reserve");
console.log("  APY          : 12%  |  Maturity: 5 years\n");

// ── 1. Register Starknet Farm v1 ──────────────────────────────────────────
console.log("[1/2] Registering Farm v1 (500 trees, 12% APY, 5yr)...");

const farmTx = await account.execute({
  contractAddress: FARM_ADR,
  entrypoint: "register_farm",
  calldata: [
    "1",    // farm id = 1
    "500",  // total_trees: 500 remaining from 2,500-tree pilot
    "1200", // apy_bps: 12.00%
    "5",    // maturity_years: 5
  ],
});

console.log("  TX:", farmTx.transaction_hash);
await provider.waitForTransaction(farmTx.transaction_hash);
console.log("  Farm v1 registered ✓\n");

// ── 2. Mint 1,000 MBT to owner ────────────────────────────────────────────
console.log("[2/2] Minting 1,000 MBT to owner reserve...");

const AMOUNT_WEI = 1000n * (10n ** 18n);
const low128  = "0x" + (AMOUNT_WEI & ((1n << 128n) - 1n)).toString(16);
const high128 = "0x0";

const mintTx = await account.execute({
  contractAddress: MBT_ADDR,
  entrypoint: "mint",
  calldata: [OWNER, low128, high128],
});

console.log("  TX:", mintTx.transaction_hash);
await provider.waitForTransaction(mintTx.transaction_hash);
console.log("  1,000 MBT minted ✓\n");

console.log("=========================================");
console.log("  All done! Starknet Farm v1 is live.");
console.log("");
console.log("  Farm trees     : 500 (remaining from pilot)");
console.log("  MBT supply     : 1,000 MBT = $25,000");
console.log("    500 MBT      : available for tree investments");
console.log("    500 MBT      : protocol reserve");
console.log("  Price per MBT  : $25 USD");
console.log("  APY            : 12%");
console.log("  Maturity       : 5 years");
console.log("");
console.log("  MBTToken      :", MBT_ADDR);
console.log("  FarmRegistry  :", FARM_ADR);
console.log("");
console.log("  View on Starkscan:");
console.log("  https://starkscan.co/contract/" + MBT_ADDR);
console.log("  https://starkscan.co/contract/" + FARM_ADR);
console.log("=========================================");
