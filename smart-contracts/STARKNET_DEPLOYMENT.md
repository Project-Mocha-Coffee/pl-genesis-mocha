## Project Mocha – Starknet Deployment Guide

This document tracks deployments of the Project Mocha Starknet contracts (MBT token and FarmRegistry) to Starknet testnet and mainnet.

---

### Quick path to mainnet (Braavos + StarkGate)

1. **Fund Starknet:** Bridge ETH to Starknet mainnet via [StarkGate](https://starkgate.starknet.io/ethereum/bridge?mode=deposit) (Ethereum → Starknet). Use your **Braavos** Starknet address as recipient.
2. **Install Scarb:** https://docs.swmansion.com/scarb/docs/install  
3. **Build:** From `smart-contracts-erc4626-starknet` run `scarb build`.  
4. **Declare & deploy:** Use the steps in **§ 3.2 Mainnet** below (declare both classes, then deploy MBT with your Braavos address as owner, then deploy FarmRegistry with the same owner).  
5. **Record addresses** in this doc and in the portal config.

---

### 0. Wallet & funding (Braavos + StarkGate)

**Wallet:** Use **Braavos** (or Argent X). Your Braavos account gives you a Starknet wallet address — that address will be the **owner** of the MBT token and FarmRegistry contracts.

**Funding Starknet mainnet:** Bridge ETH from Ethereum to Starknet using **StarkGate** (official bridge):

1. Open **StarkGate**: https://starkgate.starknet.io/ethereum/bridge?mode=deposit  
2. Connect your **Ethereum** wallet (the one that holds the ETH you want to bridge).  
3. Connect / select your **Braavos** Starknet account as the recipient (or link Braavos so the same account receives on L2).  
4. Choose **ETH**, enter the amount, and complete the deposit.  
5. Wait for the L2 credit (usually a few minutes).  
6. Your **Braavos** Starknet address will now have ETH on Starknet mainnet for declaration and deployment fees.

**Docs:** [StarkGate depositing](https://docs.starknet.io/starkgate/depositing/), [StarkGate overview](https://docs.starknet.io/starkgate/overview/).

---

### 1. Prerequisites

- **Braavos** (or compatible) Starknet account and its address (use this as `owner` in deployments).
- **ETH on Starknet mainnet** (bridged via StarkGate or otherwise) for declaration and deployment gas.
- **Cairo 2 / Scarb** installed:
  - Install Scarb: https://docs.swmansion.com/scarb/docs/install  
  - Version should be compatible with `starknet = "2.5.4"` and `edition = "2023_10"` in `Scarb.toml`.
- **Starknet CLI** (optional but useful for declare/deploy/invoke):
  - Or use **Starknet Foundry** (`sncast`) / **starknet.js** scripts; see below.
- Environment variables (if using CLI):
  - `STARKNET_NETWORK=mainnet` (or `sepolia` for testnet),
  - Account config (e.g. `STARKNET_ACCOUNT`, `STARKNET_WALLET`) as required by your tooling.

---

### 2. Build Contracts

From the `smart-contracts-erc4626-starknet` directory:

```bash
scarb build
```

This will produce Sierra and CASM artifacts under `target/`.

---

### 3. Deployments

#### 3.1 Testnet (Sepolia Starknet)

- **Network**: `sepolia`
- **MBT Token Class Hash**: `TODO_FILL_AFTER_DEPLOY`
- **MBT Token Address**: `TODO_FILL_AFTER_DEPLOY`
- **FarmRegistry Class Hash**: `TODO_FILL_AFTER_DEPLOY`
- **FarmRegistry Address**: `TODO_FILL_AFTER_DEPLOY`
- **Initial Owner / Admin**: `TODO_ADMIN_ADDRESS`

Example deployment commands (using Starknet CLI; adjust paths as needed):

```bash
# Declare MBT token class
starknet declare \
  --contract target/dev/project_mocha_starknet_MBTToken.sierra.json \
  --network sepolia \
  --max-fee auto

# Declare FarmRegistry class
starknet declare \
  --contract target/dev/project_mocha_starknet_FarmRegistry.sierra.json \
  --network sepolia \
  --max-fee auto

# Deploy MBT token
starknet deploy \
  --class-hash <MBT_CLASS_HASH> \
  --network sepolia \
  --constructor-calldata "<name_bytes>" "<symbol_bytes>" <owner_address>

# Deploy FarmRegistry
starknet deploy \
  --class-hash <FARM_REGISTRY_CLASS_HASH> \
  --network sepolia \
  --constructor-calldata <owner_address>
```

#### 3.2 Mainnet (Braavos + StarkGate-funded)

After you have **ETH on Starknet mainnet** (e.g. bridged via StarkGate) in your **Braavos** wallet:

1. **Build** (from repo root `smart-contracts-erc4626-starknet`):
   ```bash
   scarb build
   ```
2. **Declare** the two contract classes (order does not matter):
   ```bash
   starknet declare --contract target/dev/project_mocha_starknet_MBTToken.sierra.json --network mainnet --max-fee auto
   starknet declare --contract target/dev/project_mocha_starknet_FarmRegistry.sierra.json --network mainnet --max-fee auto
   ```
   Save the printed **class hash** for each (you need them for deploy).
3. **Deploy MBT token**  
   Constructor is `(name: ByteArray, symbol: ByteArray, initial_owner: ContractAddress)`.  
   - Set `initial_owner` to your **Braavos Starknet address**.  
   - For `name` and `symbol`, the contract expects `ByteArray`. Use your CLI’s or a script’s encoding for short strings (e.g. `"Mocha Bean Token"` and `"MBT"`). If your CLI does not support `ByteArray` directly, use a script (e.g. `starknet.js` or `sncast`) to build calldata and send the deploy.
   ```bash
   starknet deploy --class-hash <MBT_CLASS_HASH> --network mainnet \
     --constructor-calldata <name_encoding> <symbol_encoding> <owner_address>
   ```
4. **Deploy FarmRegistry**  
   Constructor is `(owner: ContractAddress)`. Use the same Braavos Starknet address:
   ```bash
   starknet deploy --class-hash <FARM_REGISTRY_CLASS_HASH> --network mainnet \
     --constructor-calldata <YOUR_BRAAVOS_STARKNET_ADDRESS>
   ```

Record the **deployed contract addresses** and fill in below:

- **Network**: `mainnet`
- **MBT Token Class Hash**: `TODO_FILL_AFTER_DEPLOY`
- **MBT Token Address**: `TODO_FILL_AFTER_DEPLOY`
- **FarmRegistry Class Hash**: `TODO_FILL_AFTER_DEPLOY`
- **FarmRegistry Address**: `TODO_FILL_AFTER_DEPLOY`
- **Owner (Braavos)**: `YOUR_STARKNET_ADDRESS`

---

### 4. Admin & Roles

- The `MBTToken` contract:
  - Stores an `owner` address set at deployment.
  - Maintains a `minters` mapping (`owner` is a minter by default).
  - Exposes:
    - `set_minter(account, is_minter)` – only owner.
    - `mint(recipient, amount)` – only accounts marked as minters.
- The `FarmRegistry` contract:
  - Stores an `owner` address set at deployment.
  - Restricts `register_farm`, `set_farm_active`, and `record_investment` to the owner.

You should set the **Starknet admin wallet** to be the same controlling entity used on Base/Scroll where feasible.

---

### 5. Seeding Test Data

#### 5.1 Mint MBT to an Investor

1. Ensure the deployer/admin account is a minter (it is by default).
2. Call `mint(recipient, amount)` on the MBT token:

```bash
starknet invoke \
  --contract <MBT_ADDRESS> \
  --function mint \
  --network sepolia \
  --calldata <recipient_address> <amount_u256_low> <amount_u256_high>
```

#### 5.2 Create a Starknet Farm and Record an Investment

1. Call `register_farm` on `FarmRegistry` to create a farm:

```bash
starknet invoke \
  --contract <FARM_REGISTRY_ADDRESS> \
  --function register_farm \
  --network sepolia \
  --calldata <farm_id_u128> <total_trees_u128> <apy_bps_u16> <maturity_years_u8>
```

2. Call `record_investment` to allocate trees and record a user position:

```bash
starknet invoke \
  --contract <FARM_REGISTRY_ADDRESS> \
  --function record_investment \
  --network sepolia \
  --calldata <farm_id_u128> <investor_address> <tree_share_delta_u256_low> <tree_share_delta_u256_high> <increase_allocated_trees_by_u128>
```

---

### 6. Frontend Integration Notes

From the portal (Next.js app), you can:

- Read MBT balances using the ERC20 ABI and `balanceOf` on the MBT token address.
- Read farm stats using `get_farm(id)` on `FarmRegistry`.
- Read user positions using `get_user_position(farm_id, user)` on `FarmRegistry`.
- Read aggregate stats using:
  - `totalSupply()` on MBT token,
  - `total_investors()` on `FarmRegistry`.

Ensure Starknet is clearly labeled as **“Beta / Testing”** in the network selector and farm views.

---

### 7. Troubleshooting

- **Build errors**:
  - Verify Cairo and Scarb versions match the `edition` and `starknet` crate versions in `Scarb.toml`.
  - Run `scarb clean && scarb build`.
- **Declare/deploy failures**:
  - Check `STARKNET_NETWORK`, `STARKNET_ACCOUNT`, and `STARKNET_WALLET` configuration.
  - Ensure your account has enough ETH on the selected network.
- **ICO deploy script (`node scripts/deploy-ico.mjs`)**:
  - "Channel specification version not compatible" → script uses `specVersion: "0.8.1"` and `blockIdentifier: "latest"`.
  - "Invalid block id" → use `"latest"`, not `"pending"`.
  - "Mismatch compiled class hash" / "Extract compiledClassHash failed" → script uses the sequencer’s expected `compiledClassHash`; see `STARKNET_ICO_DEPLOY.md` for details.
- **View/invoke issues from the portal**:
  - Double-check contract addresses and network configuration.
  - Confirm ABIs used in the frontend match the compiled contracts.

