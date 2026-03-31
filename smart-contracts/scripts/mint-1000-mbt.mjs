// mint-1000-mbt.mjs — Mint 1,000 MBT on Starknet Mainnet
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const starknetPath = path.join(
  __dirname, "..", "..", "smart-contracts-erc4626-scroll-base",
  "node_modules", "starknet", "dist", "index.js"
);
const { RpcProvider, Account } = await import(starknetPath);

const RPC_URL  = "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/demo";
const PRIVKEY  = "0x03976d7bf3fed8d56c05b3ced025e657c2ca260186389dca8b1d36b7ad663ed6";
const OWNER    = "0x069a1e085682601c67c0aaad1b2396dbd9729f10d71651832de2483429ea7b22";
const MBT_ADDR = "0x04a91f423a6f8795820e35784d6fbd94cca7dc4250b7721ec3c9d8ff761047ec";

const provider = new RpcProvider({ nodeUrl: RPC_URL });
const account  = new Account(provider, OWNER, PRIVKEY, "1");

console.log("Minting 1,000 MBT on Starknet mainnet...");

const AMOUNT_WEI = 1000n * (10n ** 18n);
const low128  = "0x" + (AMOUNT_WEI & ((1n << 128n) - 1n)).toString(16);

const mintTx = await account.execute({
  contractAddress: MBT_ADDR,
  entrypoint: "mint",
  calldata: [OWNER, low128, "0x0"],
});

console.log("TX:", mintTx.transaction_hash);
await provider.waitForTransaction(mintTx.transaction_hash);
console.log("1,000 MBT minted successfully to", OWNER);
console.log("View: https://starkscan.co/tx/" + mintTx.transaction_hash);
