# M-PESA Payment Integration with ElementPay

## Overview

This document outlines the implementation of M-PESA payments via ElementPay API for the Project Mocha investor portal, allowing users to purchase MBT tokens using M-PESA from feature phones.

---

## Architecture Flow

```
User (Feature Phone) → Investor Portal → Backend Webhook → ElementPay API
                                                              ↓
                                                      STK Push to User
                                                              ↓
                                                      Payment Confirmed
                                                              ↓
                    ElementPay Liquidity Pool ← MBT Transfer ← Backend
                              ↓
                    USDT Settlement → Treasury Wallet
                              ↓
                    Investment Tracking → User Wallet
```

---

## Prerequisites

1. **ElementPay Account & API Credentials**
   - API Key
   - Webhook Secret
   - Liquidity Pool Contract Address
   - Network (Scroll/Base/Ethereum)

2. **MBT Token Addresses**
   - Scroll Mainnet: `0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1`
   - Base Mainnet: `0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a`

3. **Treasury Wallet Address**
   - Scroll: `0x9B628779b452eEc5aF2eb769e1954539625EAb9B`
   - Base: `0x9B628779b452eEc5aF2eb769e1954539625EAb9B`

---

## Step 1: Fund ElementPay Liquidity Pool with MBTs

### Understanding MBT Token Structure

**MBT Contract Features:**
- Standard ERC20 token with role-based access control
- `MINTER_ROLE`: Can mint new tokens (held by ICO contract and deployer)
- `BURNER_ROLE`: Can burn tokens (held by MTTR vault)
- Standard `transfer()` function for moving existing tokens

**Current MBT Addresses:**
- **Scroll Mainnet**: `0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1`
- **Base Mainnet**: `0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a`

### Option A: Direct Transfer (Same Chain)

If ElementPay's liquidity pool is on **Scroll Mainnet** or **Base Mainnet**:

1. **Set ElementPay Address in `.env`:**
   ```bash
   ELEMENTPAY_LIQUIDITY_POOL_ADDRESS=0x... # ElementPay's liquidity pool contract
   MBT_AMOUNT=10000 # Amount in MBT (without decimals, will be parsed as ether)
   ```

2. **Ensure deployer has MBT balance:**
   - If you need MBTs, mint them first using the ICO contract or deployer's MINTER_ROLE
   - Or transfer from an existing MBT holder

3. **Run the funding script:**
   ```bash
   # For Scroll Mainnet
   npm run fund:elementpay:scroll
   
   # For Base Mainnet
   npm run fund:elementpay:base
   ```

### Option B: Mint Directly to ElementPay Pool

If you prefer to mint new MBTs directly to the pool (instead of transferring):

1. **Grant MINTER_ROLE to ElementPay pool** (if they need to mint on-demand):
   ```javascript
   const MBT = await ethers.getContractAt("MochaBeanToken", MBT_ADDRESS);
   await MBT.grantRole(MINTER_ROLE, ELEMENTPAY_LIQUIDITY_POOL_ADDRESS);
   ```

2. **Or mint from deployer account:**
   ```javascript
   const MBT = await ethers.getContractAt("MochaBeanToken", MBT_ADDRESS);
   await MBT.mint(ELEMENTPAY_LIQUIDITY_POOL_ADDRESS, ethers.parseEther("10000"));
   ```

### Option C: Cross-Chain Bridge (Different Chains)

If ElementPay's liquidity pool is on a **different chain** (e.g., Ethereum, Polygon):

1. **Bridge MBTs** from Scroll/Base to target chain using:
   - LayerZero
   - Wormhole
   - Chainlink CCIP
   - Or ElementPay's own bridge (if available)

2. **Transfer** bridged MBTs to ElementPay liquidity pool on target chain

---

## Step 2: Grant MINTER_ROLE (If Needed)

If ElementPay needs to mint MBTs directly (instead of using a liquidity pool):

```javascript
// Grant MINTER_ROLE to ElementPay liquidity pool contract
const MBT = await ethers.getContractAt("MochaBeanToken", MBT_ADDRESS);
const MINTER_ROLE = await MBT.MINTER_ROLE();
await MBT.grantRole(MINTER_ROLE, ELEMENTPAY_LIQUIDITY_POOL_ADDRESS);
```

---

## Step 3: Backend Webhook Implementation

### Webhook Endpoint Structure

```typescript
// POST /api/mpesa/initiate-payment
{
  "phoneNumber": "+254712345678",
  "amountMBT": "100.0",  // Amount in MBT tokens
  "chainId": 534352,     // Scroll Mainnet
  "userWalletAddress": "0x..." // Optional: user's wallet if known
}
```

### Webhook Flow

1. **Verify User in ElementPay**
   ```typescript
   const elementPayResponse = await fetch('https://api.elementpay.com/v1/user/verify', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${ELEMENTPAY_API_KEY}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       phoneNumber: phoneNumber
     })
   });
   
   if (!elementPayResponse.ok) {
     throw new Error('User not registered with ElementPay');
   }
   
   const userData = await elementPayResponse.json();
   const userWalletAddress = userData.walletAddress;
   ```

2. **Calculate KES Amount**
   ```typescript
   // Get MBT/USD price from Chainlink or DEX
   const mbtPriceUSD = await getMBTPrice();
   const usdAmount = amountMBT * mbtPriceUSD;
   const kesAmount = usdAmount * KES_USD_RATE; // ~150 KES/USD
   ```

3. **Initiate STK Push**
   ```typescript
   const stkPushResponse = await fetch('https://api.elementpay.com/v1/mpesa/stk-push', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${ELEMENTPAY_API_KEY}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       phoneNumber: phoneNumber,
       amount: kesAmount,
       callbackUrl: `${BACKEND_URL}/api/mpesa/callback`,
       metadata: {
         mbtAmount: amountMBT,
         chainId: chainId,
         userWalletAddress: userWalletAddress,
         transactionId: generateTransactionId()
       }
     })
   });
   ```

4. **Handle Payment Callback**
   ```typescript
   // POST /api/mpesa/callback
   async function handlePaymentCallback(req, res) {
     const { 
       status, 
       transactionId, 
       metadata,
       mpesaReceiptNumber 
     } = req.body;
     
     if (status === 'success') {
       // Transfer MBTs from liquidity pool to user
       await transferMBTsToUser({
         from: ELEMENTPAY_LIQUIDITY_POOL_ADDRESS,
         to: metadata.userWalletAddress,
         amount: metadata.mbtAmount,
         chainId: metadata.chainId
       });
       
       // Settle USDT to treasury
       await settleUSDTToTreasury({
         amount: calculateUSDTAmount(metadata.mbtAmount),
         treasuryAddress: TREASURY_ADDRESS
       });
       
       // Map transaction for investment tracking
       await recordInvestment({
         userWallet: metadata.userWalletAddress,
         mbtAmount: metadata.mbtAmount,
         mpesaReceipt: mpesaReceiptNumber,
         transactionId: metadata.transactionId,
         chainId: metadata.chainId
       });
     }
   }
   ```

---

## Step 4: Smart Contract Integration

### MBT Transfer Function

```solidity
// In your backend service
function transferMBTsFromLiquidityPool(
    address to,
    uint256 amount,
    uint256 chainId
) external onlyAuthorized {
    // Get MBT contract address for the chain
    address mbtAddress = getMBTAddress(chainId);
    
    // Transfer from ElementPay liquidity pool
    IERC20(mbtAddress).transferFrom(
        ELEMENTPAY_LIQUIDITY_POOL_ADDRESS,
        to,
        amount
    );
}
```

### Investment Tracking Contract

```solidity
contract InvestmentTracker {
    struct Investment {
        address userWallet;
        uint256 mbtAmount;
        string mpesaReceipt;
        uint256 timestamp;
        uint256 chainId;
        bool settled;
    }
    
    mapping(string => Investment) public investments; // transactionId => Investment
    mapping(address => Investment[]) public userInvestments;
    
    function recordInvestment(
        address userWallet,
        uint256 mbtAmount,
        string memory mpesaReceipt,
        string memory transactionId,
        uint256 chainId
    ) external onlyAuthorized {
        Investment memory investment = Investment({
            userWallet: userWallet,
            mbtAmount: mbtAmount,
            mpesaReceipt: mpesaReceipt,
            timestamp: block.timestamp,
            chainId: chainId,
            settled: true
        });
        
        investments[transactionId] = investment;
        userInvestments[userWallet].push(investment);
    }
}
```

---

## Step 5: Security Considerations

### 1. Webhook Authentication

```typescript
function verifyElementPayWebhook(req, res, next) {
  const signature = req.headers['x-elementpay-signature'];
  const payload = JSON.stringify(req.body);
  
  const expectedSignature = crypto
    .createHmac('sha256', ELEMENTPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}
```

### 2. Rate Limiting

Implement rate limiting on payment initiation endpoints to prevent abuse.

### 3. Transaction Idempotency

Use unique transaction IDs to prevent duplicate processing.

### 4. Multi-Signature Treasury

Consider using a multi-sig wallet for treasury operations.

---

## Step 6: Testing

### Test Flow

1. **Test User Verification**
   ```bash
   curl -X POST https://api.elementpay.com/v1/user/verify \
     -H "Authorization: Bearer $API_KEY" \
     -d '{"phoneNumber": "+254712345678"}'
   ```

2. **Test STK Push** (Sandbox)
   ```bash
   curl -X POST https://api.elementpay.com/v1/mpesa/stk-push \
     -H "Authorization: Bearer $API_KEY" \
     -d '{
       "phoneNumber": "+254712345678",
       "amount": 100,
       "callbackUrl": "https://your-backend.com/api/mpesa/callback"
     }'
   ```

3. **Test MBT Transfer**
   ```bash
   npm run test:mpesa:transfer
   ```

---

## Step 7: Monitoring & Analytics

### Key Metrics to Track

- M-PESA payment success rate
- Average transaction time
- MBT liquidity pool balance
- Treasury USDT settlements
- User investment tracking accuracy

### Alerts

- Low liquidity pool balance (< threshold)
- Failed payment callbacks
- Unusual transaction patterns

---

## Next Steps

1. **Obtain ElementPay API Credentials**
2. **Deploy Investment Tracking Contract** (if needed)
3. **Fund Liquidity Pool** using the script below
4. **Implement Backend Webhook**
5. **Test End-to-End Flow**
6. **Deploy to Production**

---

## Support

For ElementPay API documentation: [ElementPay Docs](https://docs.elementpay.com)
For questions: Contact ElementPay support or Project Mocha team
