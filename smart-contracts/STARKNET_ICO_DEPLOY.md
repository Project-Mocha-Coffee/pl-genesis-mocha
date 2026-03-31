# Deploy Starknet ICO (automatic MBT mint)

## Steps

**1. Build**
```bash
cd smart-contracts-erc4626-starknet
scarb build
```

**2. Add your RPC and private key**

Copy `.env.example` to `.env`, then edit `.env`:

```
STARKNET_RPC_URL=https://your-starknet-mainnet-rpc-url
STARKNET_DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHex
```

Use the wallet that owns the MBT contract (so it can call `set_minter`). Don’t commit `.env` — it’s gitignored.

**3. Deploy**
```bash
npm install
node scripts/deploy-ico.mjs
```

The script declares the ICO, deploys it, and sets it as minter on MBT. Copy the printed **ICO address**.

**4. Turn on in the portal**

In the portal env (e.g. Vercel or `.env.local`):

```
NEXT_PUBLIC_STARKNET_ICO_ADDRESS=0x257d20710741f494d7131c6ad287e5bb05c5efbb246944e71b8f92a61336653
```

Redeploy or restart the portal. Starknet “Swap to MBT” will then mint MBT to the user in one transaction. (Deployed address is also in **STARKNET_DEPLOYED_ADDRESSES.md**.)

---

**Optional:** Owner can update the on-chain ETH price with `set_eth_price_usd` on the ICO contract.

---

## Troubleshooting

- **"Channel specification version is not compatible"**  
  The deploy script uses `specVersion: "0.8.1"` and `blockIdentifier: "latest"`. If your RPC uses a different spec (e.g. Alchemy v0_10), ensure the script’s provider options match or use an RPC that supports 0.8.1.

- **"Invalid block id" / "Invalid params"**  
  Don’t use `blockIdentifier: "pending"`. The script uses `"latest"`.

- **"Mismatch compiled class hash"** or **"Extract compiledClassHash failed, provide (CairoAssembly).casm file or compiledClassHash"**  
  The script passes the sequencer’s expected `compiledClassHash` so declare works without sending CASM. If the network or compiler changes and you see a new "Expected" hash in the error, update the `SEQUENCER_COMPILED_CLASS_HASH` constant in `scripts/deploy-ico.mjs` to that value.
