# Quick Start: Fund ElementPay Liquidity Pool with MBTs

## 🎯 Goal

Transfer MBT tokens from Scroll Mainnet to ElementPay's liquidity pool contract to enable M-PESA payments.

---

## 📋 Prerequisites

1. **ElementPay Liquidity Pool Contract Address** (from ElementPay)
2. **Deployer wallet with MBT balance** OR **MINTER_ROLE** on MBT contract
3. **Network**: Scroll Mainnet (where MBTs are minted)

---

## 🚀 Quick Steps

### Step 1: Add ElementPay Address to `.env`

```bash
# Add to your .env file
ELEMENTPAY_LIQUIDITY_POOL_ADDRESS=0xC535E8838730CfE097A0d3b7C6eF565B45DC74e3
MBT_AMOUNT=10000 # Amount of MBT to transfer (e.g., 10,000 MBT)
```

**ElementPay Treasury Address (Confirmed):**
- `0xC535E8838730CfE097A0d3b7C6eF565B45DC74e3` (Scroll Mainnet - Contract)

### Step 2: Choose Your Method

#### **Method A: Transfer Existing MBTs** (Recommended)

If you already have MBTs in your deployer wallet:

```bash
# For Scroll Mainnet
npm run fund:elementpay:scroll
```

#### **Method B: Mint New MBTs Directly to Pool**

If you need to mint new MBTs:

```bash
# Mint directly to ElementPay pool
npm run mint:mbt:scroll -- --amount 10000 --to <ELEMENTPAY_POOL_ADDRESS>
```

Or set in `.env`:
```bash
MINT_TO_ADDRESS=<ELEMENTPAY_POOL_ADDRESS>
MBT_AMOUNT=10000
npm run mint:mbt:scroll
```

---

## 📊 Current MBT Addresses

- **Scroll Mainnet**: `0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1`
- **Base Mainnet**: `0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a`

---

## ✅ Verification

After funding, verify on block explorer:

**Scroll Mainnet:**
- MBT Contract: https://scrollscan.com/address/0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1
- Check ElementPay pool balance in "Token Holders" section

**Base Mainnet:**
- MBT Contract: https://basescan.org/address/0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a

---

## 🔄 Cross-Chain Considerations

If ElementPay's liquidity pool is on a **different chain** than Scroll:

1. **Bridge MBTs** from Scroll to target chain
2. **Transfer** bridged MBTs to ElementPay pool on target chain

**Bridge Options:**
- LayerZero
- Wormhole
- Chainlink CCIP
- ElementPay's bridge (if available)

---

## 📝 Notes

- **MINTER_ROLE**: Deployer has this role by default, can mint new MBTs
- **Transfer**: Standard ERC20 transfer, no special permissions needed if you have balance
- **Amount Format**: Scripts use `ethers.parseEther()`, so `MBT_AMOUNT=10000` = 10,000 MBT

---

## 🆘 Troubleshooting

**Error: "Insufficient MBT balance"**
- Mint MBTs first: `npm run mint:mbt:scroll -- --amount 10000 --to <YOUR_ADDRESS>`
- Or transfer MBTs from another address

**Error: "Deployer does not have MINTER_ROLE"**
- Check if deployer is the MBT contract owner
- Grant MINTER_ROLE if needed (requires DEFAULT_ADMIN_ROLE)

**Error: "ELEMENTPAY_LIQUIDITY_POOL_ADDRESS not set"**
- Add the address to `.env` file
- Or pass as command line argument: `--to 0x...`

---

## 📚 Full Documentation

See `docs/MPESA_ELEMENTPAY_INTEGRATION.md` for complete implementation guide including:
- Webhook setup
- Backend integration
- Security considerations
- Testing procedures
