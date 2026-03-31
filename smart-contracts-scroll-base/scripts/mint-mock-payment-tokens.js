const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Usage examples:
//   npx hardhat run scripts/mint-mock-payment-tokens.js --network scrollSepolia
//   npx hardhat run scripts/mint-mock-payment-tokens.js --network scrollSepolia --to 0xYourAddr --usdt 50000 --usdc 50000 --wbtc 0.5 --scr 100000

function getCliArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function mintToken(tokenAddress, to, humanAmount) {
  const token = await ethers.getContractAt("contracts/test/MockERC20.sol:MockERC20", tokenAddress);
  const decimals = await token.decimals();

  // Support fractional inputs, convert based on decimals
  const amountStr = humanAmount.toString();
  const amount = ethers.parseUnits(amountStr, decimals);

  const symbol = await token.symbol();
  console.log(`→ Minting ${humanAmount} ${symbol} (${amount.toString()} base units) to ${to} ...`);
  const tx = await token.mint(to, amount);
  const receipt = await tx.wait();
  console.log(`  ✓ Minted ${symbol}. tx: ${receipt.hash}`);
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  console.log(`📡 Network: ${networkName} (Chain ID: ${network.chainId})`);

  // Load deployment JSON
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deploymentFile = path.join(deploymentsDir, `${networkName}-ico-deployment.json`);
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`❌ Deployment file not found: ${deploymentFile}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const tokens = deployment?.contracts?.tokens;
  if (!tokens) throw new Error("❌ Token addresses missing in deployment file");

  const [signer] = await ethers.getSigners();
  const to = "0x6ed208C1E6a012118194C4457fE8Dc3215ea971a";
  console.log(`👤 Recipient: ${to}`);

  // Default mint amounts (human units)
  const defUsdt = getCliArg("usdt", "1000000"); // 100k USDT
  const defUsdc = getCliArg("usdc", "1000000"); // 100k USDC
  const defWbtc = getCliArg("wbtc", "1000");      // 10 WBTC
  const defScr  = getCliArg("scr",  "1000000"); // 100k SCR

  // Mint each token if address present
  if (tokens.USDT) await mintToken(tokens.USDT, to, defUsdt);
  if (tokens.USDC) await mintToken(tokens.USDC, to, defUsdc);
  if (tokens.WBTC) await mintToken(tokens.WBTC, to, defWbtc);
  if (tokens.SCR)  await mintToken(tokens.SCR,  to, defScr);

  console.log("\n✅ Minting complete.");
}

main().catch((err) => {
  console.error("❌ Minting script failed:", err);
  process.exit(1);
});


