# MBT (MochaBeanToken) Minting Logic

## 📋 Overview

MBT tokens are minted through a **role-based access control system** with multiple authorized minters. The token uses OpenZeppelin's `AccessControl` to manage who can mint.

---

## 🔐 Who Can Mint MBTs?

### Entities with `MINTER_ROLE`:

1. **Deployer/Admin** (Initial)
   - Granted `MINTER_ROLE` in constructor
   - Can mint directly: `mbt.mint(to, amount)`

2. **ICO Contract** (Primary Minting Mechanism)
   - Granted `MINTER_ROLE` during deployment
   - Mints MBTs when users purchase tokens via ICO
   - Address: Scroll `0x86532F0F0BEA64Bd3902d865729Cd988E560c165`, Base `0x01Ea048190830F5264e860f06687d6ADFDb33847`

3. **Diamond Contract** (For Vault Operations)
   - Granted `MINTER_ROLE` when `setDiamondContract()` is called
   - Can mint for yield distribution and vault operations
   - Address: Scroll `0x31058580845A8ed67F404fF5863b30f1b8CF7412`, Base `0xc2fDefAbe80eD7d9e19DF9f48C5A3c9F40059660`

4. **ElementPay Liquidity Pool** (If Granted)
   - Can be granted `MINTER_ROLE` to mint on-demand for M-PESA payments
   - Currently: **NOT granted** (needs to be granted if using minting approach)

---

## 🎯 Current Minting Mechanisms

### 1. **ICO Contract Minting** (Primary - User Purchases)

**Flow:**
```
User → ICO Contract → MBT.mint(user, amount)
```

**How it works:**
1. User calls ICO purchase function:
   - `buyTokensWithEth(beneficiary, minTokensExpected)`
   - `buyTokensWithUsdt(amount, minTokensExpected)`
   - `buyTokensWithUsdc(amount, minTokensExpected)`
   - `buyTokensWithWbtc(amount, minTokensExpected)`
   - `buyTokensWithScr(amount, minTokensExpected)`

2. ICO contract:
   - Calculates USD value of payment
   - Calculates MBT tokens to mint: `calculateTokens(usdAmount)`
   - Checks slippage protection
   - Checks wallet cap
   - Sends payment to treasury wallet
   - **Calls `token.mint(_beneficiary, tokensToMint)`**

3. MBT contract mints tokens to user's address

**Token Rate:**
- `TOKEN_RATE_USD = 25 * 10^18` (1 MBT = $25 USD)
- Formula: `tokens = (usdAmount * 10^18) / TOKEN_RATE_USD`

**Limits:**
- `maxTokensToSell`: 40 MBT (40,000,000,000,000,000,000 wei)
- `maxMBTTokensPerWallet`: Per-wallet cap (if set)
- `totalTokensSold`: Tracks cumulative sales

---

### 2. **Direct Admin Minting** (Manual)

**Flow:**
```
Admin/Deployer → MBT.mint(to, amount)
```

**How it works:**
1. Admin (with `MINTER_ROLE`) calls:
   ```solidity
   mbt.mint(recipientAddress, amount)
   ```

2. MBT contract:
   - Checks `MINTER_ROLE`
   - Checks contract is not paused
   - Mints tokens to recipient

**Use Cases:**
- Funding liquidity pools (ElementPay)
- Airdrops
- Team allocations
- Emergency distributions

---

### 3. **Diamond Contract Minting** (Yield Distribution)

**Flow:**
```
Diamond → MBT.mintYield(recipient, amount)
```

**How it works:**
1. Diamond contract (with `YIELD_DISTRIBUTOR_ROLE`) calls:
   ```solidity
   mbt.mintYield(recipient, amount)
   ```

2. MBT contract:
   - Checks `YIELD_DISTRIBUTOR_ROLE`
   - Mints tokens
   - Tracks yield distribution statistics

**Use Cases:**
- Yield distribution to farm share token holders
- Reward distributions

---

## 🔄 Minting Functions in MBT Contract

### 1. `mint(address to, uint256 amount)`
- **Role Required:** `MINTER_ROLE`
- **Purpose:** General minting
- **Used By:** ICO contract, Admin, Diamond (general)

### 2. `mintYield(address recipient, uint256 amount)`
- **Role Required:** `YIELD_DISTRIBUTOR_ROLE`
- **Purpose:** Yield-specific minting with tracking
- **Used By:** Diamond contract for yield distribution
- **Tracking:** Updates `totalYieldMinted` and `userYieldReceived`

---

## 📊 Current MBT Minting Status

### Scroll Mainnet
- **MBT Address:** `0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1`
- **ICO Contract:** `0x86532F0F0BEA64Bd3902d865729Cd988E560c165`
- **Has MINTER_ROLE:** ✅ Yes (granted during deployment)

### Base Mainnet
- **MBT Address:** `0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a`
- **ICO Contract:** `0x01Ea048190830F5264e860f06687d6ADFDb33847`
- **Has MINTER_ROLE:** ✅ Yes (granted during deployment)

---

## 💡 For ElementPay Integration

### Option A: Transfer from Existing Supply (Current Approach)
- **Method:** Transfer MBTs from deployer/admin wallet to ElementPay pool
- **Script:** `fund-elementpay-liquidity-pool.js`
- **Requires:** Deployer must have MBT balance OR mint first

### Option B: Mint Directly to ElementPay Pool
- **Method:** Mint new MBTs directly to ElementPay pool
- **Script:** `mint-mbt-to-address.js`
- **Requires:** Deployer must have `MINTER_ROLE` ✅ (already has it)

### Option C: Grant MINTER_ROLE to ElementPay Pool
- **Method:** Grant `MINTER_ROLE` to ElementPay liquidity pool contract
- **Allows:** ElementPay to mint MBTs on-demand when processing M-PESA payments
- **Code:**
  ```javascript
  const MBT = await ethers.getContractAt("MochaBeanToken", MBT_ADDRESS);
  await MBT.grantRole(MINTER_ROLE, ELEMENTPAY_LIQUIDITY_POOL_ADDRESS);
  ```

---

## 🔍 Minting Constraints

### 1. **Pause State**
- Contract must not be paused
- `whenNotPaused` modifier on all mint functions

### 2. **Role Requirements**
- Must have `MINTER_ROLE` for `mint()`
- Must have `YIELD_DISTRIBUTOR_ROLE` for `mintYield()`

### 3. **ICO Limits** (When minting via ICO)
- Cannot exceed `maxTokensToSell`
- Cannot exceed `maxMBTTokensPerWallet` (if set)
- `totalTokensSold` tracks cumulative sales

### 4. **Zero Address Protection**
- Cannot mint to `address(0)`
- Amount must be > 0

---

## 📝 Summary

**Current Minting Logic:**
1. **Primary:** ICO contract mints MBTs when users purchase with ETH/USDT/USDC/WBTC/SCR
2. **Secondary:** Admin/Deployer can mint directly (has `MINTER_ROLE`)
3. **Yield:** Diamond contract can mint yield tokens (has `YIELD_DISTRIBUTOR_ROLE`)

**For ElementPay:**
- ✅ Can mint directly using deployer's `MINTER_ROLE` (Method B - Recommended)
- ✅ Can transfer existing MBTs (Method A)
- ⚠️ Can grant `MINTER_ROLE` to ElementPay pool (Method C - requires trust in ElementPay contract)

**Recommended:** Use Method B (mint directly) as it's the simplest and doesn't require pre-funding.
