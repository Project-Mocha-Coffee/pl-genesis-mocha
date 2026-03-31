## Project Mocha – Starknet Mainnet Deployment (v1)

### 1. What we are deploying

- **MBT token (Starknet)**  
  - Starknet-native ERC20-equivalent called **MBT (Mocha Bean Token)**.  
  - Implemented in Cairo using OpenZeppelin’s `ERC20Component`.  
  - 18 decimals, standard ERC20 interface (name, symbol, totalSupply, balanceOf, transfer, approve, transferFrom).  
  - Additional admin logic:
    - `owner` address (set to our Braavos Starknet account at deployment).  
    - `minters` mapping: addresses allowed to mint MBT on Starknet.  
    - `set_minter(account, is_minter)` – only owner.  
    - `mint(recipient, amount)` – only minters.

- **FarmRegistry (Starknet Farm v1)**  
  - Simple registry for **Starknet coffee farms and investor positions**.  
  - Tracks for each farm:
    - `id: u128` – farm identifier (we will use a fixed id for “Starknet Farm v1”).  
    - `total_trees: u128` – total trees in the farm.  
    - `allocated_trees: u128` – how many trees have been allocated to investors.  
    - `apy_bps: u16` – APY in basis points (e.g. 800 = 8%).  
    - `maturity_years: u8` – target maturity horizon in years.  
    - `is_active: bool` – whether the farm is currently active.  
  - Tracks investor positions:
    - `user_positions[(investor, farm_id)] = tree_share (u256)`.  
    - `total_investors` counter (incremented when a user gets a non-zero position for a farm).  
  - Admin-only operations (owner = Braavos account):
    - `register_farm(id, total_trees, apy_bps, maturity_years)`.  
    - `set_farm_active(id, is_active)`.  
    - `record_investment(farm_id, investor, tree_share_delta, increase_allocated_trees_by)`.

Together these two contracts give us:
- A **Starknet-native MBT** token and  
- A **Starknet farm/investor registry** we can query from the portal.

We are **not** porting the full Diamond, vault system, or NFTs in v1 – only the token + registry layer that we actually need for presence and position tracking.

---

### 2. Roles and ownership

- **Owner (admin) on Starknet:**  
  - The **Braavos Starknet mainnet account** (the one you funded via StarkGate).  
  - Has power to:
    - Manage minters on MBT (`set_minter`).  
    - Register farms, toggle active status, and record investments in `FarmRegistry`.

- **Minters on Starknet MBT:**  
  - At deployment, **owner** is automatically set as a minter.  
  - We can add additional minter addresses later (e.g. a Starknet sale contract or off-ramp integration) by calling `set_minter`.

This mirrors the **`DEFAULT_ADMIN_ROLE` + `MINTER_ROLE`** pattern from Scroll/Base, but implemented in Cairo with explicit storage instead of OpenZeppelin AccessControl.

---

### 3. How this lines up with Scroll/Base

- **Same concepts, different stack:**
  - Scroll/Base: Solidity, Diamond + MBT, NFTs, vaults, ICO, etc.  
  - Starknet: Cairo, **MBT + FarmRegistry** only (minimal v1).  
  - No yield logic, no NFTs, no cross-chain sync in this phase.

- **Uniformity goals:**
  - **Token:** There is an MBT token on each chain (Scroll, Base, Starknet).  
  - **Positions:**  
    - Scroll/Base: investor positions live in the Diamond + vaults.  
    - Starknet: investor positions live in `FarmRegistry` as tree shares per farm.
  - **Admin:** Same controlling entity (our main wallet) on all three chains.

This gives us:
- A clear **“MBT exists on Starknet”** story, and  
- A clean way to show **Starknet farm positions** in the portal, without rebuilding the entire architecture.

---

### 4. What is explicitly *out of scope* for Starknet v1

- Diamond pattern / facet-based architecture.  
- MLT and MTT NFT contracts (land/trees).  
- ERC-6551 / token-bound accounts.  
- ERC4626 vaults (MTTR) and multi-tranche bond logic.  
- Cross-chain messaging or automatic sync with Scroll/Base.  
- On-chain yield calculation; APY is stored as metadata and used off-chain for now.

These can be added in later phases once the Starknet presence and basic MBT + farm tracking are live.

