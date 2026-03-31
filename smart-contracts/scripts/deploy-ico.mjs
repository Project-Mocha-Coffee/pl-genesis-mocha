#!/usr/bin/env node
// Deploy ICO + set minter. Run after: scarb build. Put RPC and key in .env (see .env.example).

import { readFileSync, existsSync } from "fs"
import { fileURLToPath } from "url"
import path from "path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")

// Load .env from repo root if present (plain key=value, no quotes)
if (existsSync(path.join(ROOT, ".env"))) {
  const env = readFileSync(path.join(ROOT, ".env"), "utf8")
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim()
  }
}

import { RpcProvider, Account, CallData } from "starknet"

const ARTIFACTS = path.join(ROOT, "target", "dev")

const RPC_URL = process.env.STARKNET_RPC_URL || "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/demo"
const PRIVATE_KEY = process.env.STARKNET_DEPLOYER_PRIVATE_KEY || "0x03976d7bf3fed8d56c05b3ced025e657c2ca260186389dca8b1d36b7ad663ed6"
const OWNER_ADDRESS = "0x069a1e085682601c67c0aaad1b2396dbd9729f10d71651832de2483429ea7b22"

const ETH_TOKEN = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
const MBT_TOKEN = "0x04a91f423a6f8795820e35784d6fbd94cca7dc4250b7721ec3c9d8ff761047ec"
// initial_eth_price_usd: 8 decimals, e.g. 2500 USD = 250000000000
const INITIAL_ETH_PRICE_USD = "250000000000"
// min_purchase_eth: 0.001 ETH in wei
const MIN_PURCHASE_ETH = "1000000000000000"

async function main() {
  console.log("=== Starknet ICO — Declare, Deploy, Set Minter ===\n")

  const provider = new RpcProvider({
    nodeUrl: RPC_URL,
    specVersion: "0.8.1",
    blockIdentifier: "latest",
  })
  const account = new Account(provider, OWNER_ADDRESS, PRIVATE_KEY, "1")

  const sierraPath = path.join(ARTIFACTS, "project_mocha_starknet_StarknetICO.contract_class.json")

  let sierra
  try {
    sierra = JSON.parse(readFileSync(sierraPath, "utf8"))
  } catch (e) {
    console.error("Run 'scarb build' first. Missing:", e.message)
    process.exit(1)
  }

  // ── Declare + Deploy ICO ──────────────────────────────────────────────────
  console.log("[1/3] Declaring and deploying StarknetICO...")

  // u256 must be { low, high } so encoder emits two felts per value; otherwise "Failed to deserialize param #6"
  const toU256 = (n) => {
    const b = BigInt(n)
    const mask = (1n << 128n) - 1n
    return { low: b & mask, high: b >> 128n }
  }
  const icoCalldata = CallData.compile({
    owner: OWNER_ADDRESS,
    eth_token: ETH_TOKEN,
    mbt_token: MBT_TOKEN,
    treasury: OWNER_ADDRESS,
    initial_eth_price_usd: toU256(INITIAL_ETH_PRICE_USD),
    min_purchase_eth: toU256(MIN_PURCHASE_ETH),
  })

  // Use sequencer's expected compiled class hash so we don't send CASM (avoids mismatch + "Extract compiledClassHash failed")
  const SEQUENCER_COMPILED_CLASS_HASH = "0x7a5e6dc2d9e1f23cb23bfa1f0df3e222b4646ba95ce84a2f54d7d5481e195bc"
  const declareDeploy = await account.declareAndDeploy({
    contract: sierra,
    compiledClassHash: SEQUENCER_COMPILED_CLASS_HASH,
    constructorCalldata: icoCalldata,
  })

  const icoClassHash = declareDeploy.declare.class_hash
  const icoAddress = declareDeploy.deploy.contract_address

  console.log("  Declare TX:", declareDeploy.declare.transaction_hash)
  console.log("  Deploy TX:", declareDeploy.deploy.transaction_hash)
  console.log("  Class hash:", icoClassHash)
  console.log("  ICO address:", icoAddress)

  await provider.waitForTransaction(declareDeploy.deploy.transaction_hash)

  // ── Set ICO as minter on MBT ───────────────────────────────────────────────
  console.log("\n[2/3] Setting ICO as minter on MBT...")

  const setMinterTx = await account.execute({
    contractAddress: MBT_TOKEN,
    entrypoint: "set_minter",
    calldata: [icoAddress, "1"],
  })
  console.log("  TX:", setMinterTx.transaction_hash)
  await provider.waitForTransaction(setMinterTx.transaction_hash)
  console.log("  Done.")

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n==============================================")
  console.log("  Starknet ICO ready for automatic MBT mint")
  console.log("  ICO address:", icoAddress)
  console.log("  Set in portal: NEXT_PUBLIC_STARKNET_ICO_ADDRESS=" + icoAddress)
  console.log("  Starkscan: https://starkscan.co/contract/" + icoAddress)
  console.log("==============================================\n")
}

main().catch((err) => {
  console.error("Error:", err.message || err)
  process.exit(1)
})
