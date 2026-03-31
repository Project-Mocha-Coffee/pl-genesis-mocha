# Webhook Information for ElementPay Team

## Webhook URL

```
https://portal-main.vercel.app/api/elementpay/webhook
```

## Current Status

✅ **Code deployed to GitHub**  
✅ **Build successful locally**  
⏳ **Vercel deployment in progress** (may take a few minutes to propagate)

## What to Send ElementPay

**Email Subject:** Webhook Configuration Request - Project Mocha M-PESA Integration

**Message:**

Hello ElementPay Team,

We are integrating M-PESA payments via ElementPay API for the Project Mocha Investor Portal. Please configure the following webhook endpoint:

**Webhook URL:**
```
https://portal-main.vercel.app/api/elementpay/webhook
```

**HTTP Method:** POST

**Content-Type:** application/json

**Events to Subscribe:**
- Payment Success
- Payment Failed
- Payment Cancelled
- Payment Pending (optional)

**Expected Payload Format:**
```json
{
  "transactionId": "tx_1234567890",
  "status": "success" | "failed" | "pending" | "cancelled",
  "phoneNumber": "+254712345678",
  "amount": 15000,
  "currency": "KES",
  "metadata": {
    "mbtAmount": "100.000",
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "source": "investor-portal"
  },
  "timestamp": "2025-01-21T19:00:00Z"
}
```

**Response:**
- Success: `200 OK` with `{"received": true}`
- Error: `400/401/500` with error message

**Webhook Signature (if supported):**
If ElementPay provides webhook signatures, please share:
- Signature algorithm (e.g., HMAC-SHA256)
- Header name (e.g., `x-elementpay-signature`)
- How to obtain/configure the webhook secret

**Testing:**
Please send a test webhook to verify connectivity. We will confirm receipt.

Thank you!

---

## Technical Details

- **Endpoint:** `/api/elementpay/webhook`
- **Method:** POST only
- **Timeout:** 30 seconds
- **Idempotency:** Uses `transactionId` to prevent duplicate processing
- **Retry Policy:** We recommend 3 retries with exponential backoff

## Additional Endpoints

We also have these API endpoints for the integration:

1. **User Verification:** `/api/elementpay/verify`
   - Verifies if phone number exists in ElementPay database
   - Returns wallet address if user is registered

2. **Payment Initiation:** `/api/elementpay/payment`
   - Initiates M-PESA STK Push payment
   - Returns transaction ID and STK Push ID

## Support

If you have any questions or need additional information, please contact us.

Project Mocha Team
