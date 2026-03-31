# ElementPay Treasury Funding - Ready to Execute

## 📋 ElementPay Treasury Address

**Address:** `0xC535E8838730CfE097A0d3b7C6eF565B45DC74e3`  
**Network:** Scroll Mainnet  
**Type:** Smart Contract (452 bytes)  
**Current MBT Balance:** 0 MBT

---

## 🚀 Quick Funding Steps

### Option 1: Transfer Existing MBTs (If Deployer Has Balance)

1. **Add to `.env`:**
   ```bash
   ELEMENTPAY_LIQUIDITY_POOL_ADDRESS=0xC535E8838730CfE097A0d3b7C6eF565B45DC74e3
   MBT_AMOUNT=10000
   ```

2. **Run:**
   ```bash
   npm run fund:elementpay:scroll
   ```

### Option 2: Mint New MBTs Directly to ElementPay Treasury

1. **Mint directly:**
   ```bash
   npm run mint:mbt:scroll -- --amount 10000 --to 0xC535E8838730CfE097A0d3b7C6eF565B45DC74e3
   ```

---

## 📊 Current Status

**MBT Token (Scroll):** `0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1`

**Check balances:**
- Deployer: Run balance check script
- ElementPay Treasury: Currently 0 MBT

---

## ✅ Next Steps After Funding

1. **Verify Transfer:**
   - Check on ScrollScan: https://scrollscan.com/address/0xC535E8838730CfE097A0d3b7C6eF565B45DC74e3
   - Verify MBT balance in "Token Holdings" section

2. **Test M-PESA Flow:**
   - User enters phone number
   - Backend verifies with ElementPay API
   - STK Push initiated
   - Payment confirmed → MBTs credited to user

3. **Monitor Pool Balance:**
   - Set up alerts for low balance
   - Replenish as needed

---

## 🔗 Useful Links

- **ElementPay Treasury:** https://scrollscan.com/address/0xC535E8838730CfE097A0d3b7C6eF565B45DC74e3
- **MBT Token:** https://scrollscan.com/address/0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1

---

**Ready to fund?** Run the command above once you've set the amount in `.env`!
