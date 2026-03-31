# Webhook URL for ElementPay Team

## Production Webhook URL

```
https://portal-main.vercel.app/api/elementpay/webhook
```

## Status

✅ **Code deployed to GitHub**  
⏳ **Deployment to Vercel in progress** (may take 2-5 minutes)

The webhook endpoint will be available at the URL above once the Vercel deployment completes.

## Quick Information to Send ElementPay

**Subject:** Webhook Configuration - Project Mocha M-PESA Integration

**Message:**

Hello ElementPay Team,

We need to configure a webhook endpoint for M-PESA payment status updates.

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

**Expected Payload:**
```json
{
  "transactionId": "tx_1234567890",
  "status": "success" | "failed" | "pending" | "cancelled",
  "phoneNumber": "+254712345678",
  "amount": 15000,
  "currency": "KES",
  "metadata": {
    "mbtAmount": "100.000",
    "walletAddress": "0x...",
    "source": "investor-portal"
  },
  "timestamp": "2025-01-21T19:00:00Z"
}
```

**Response:** Our endpoint returns `200 OK` with `{"received": true}` on success.

Please configure this webhook and send a test payload to verify connectivity.

Thank you!

---

## Testing the Webhook

Once ElementPay configures the webhook, you can test it by:

1. **Manual Test:**
   ```bash
   curl -X POST https://portal-main.vercel.app/api/elementpay/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "transactionId": "test_tx_123",
       "status": "success",
       "phoneNumber": "+254712345678",
       "amount": 15000,
       "currency": "KES",
       "metadata": {
         "mbtAmount": "100.000",
         "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
         "source": "investor-portal"
       },
       "timestamp": "2025-01-21T19:00:00Z"
     }'
   ```

2. **Expected Response:**
   ```json
   {
     "received": true
   }
   ```

## Deployment Status

Check deployment status:
- Vercel Dashboard: https://vercel.com/project-mocha/portal-main
- Or use: `vercel ls` command

The webhook will be live once the deployment shows "Ready" status.
