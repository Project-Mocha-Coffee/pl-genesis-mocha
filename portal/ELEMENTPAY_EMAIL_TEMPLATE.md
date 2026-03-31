# Email Template for ElementPay Team

Subject: Webhook Configuration Request - Project Mocha M-PESA Integration

---

Hello ElementPay Team,

We are integrating M-PESA payments via ElementPay API for the Project Mocha Investor Portal and need to configure the webhook endpoint.

## Webhook Details

**Webhook URL:** 
```
https://portal-main.vercel.app/api/elementpay/webhook
```

**HTTP Method:** POST

**Content-Type:** application/json

## Required Configuration

Please configure ElementPay to send webhooks to the above URL for the following events:
- Payment Success
- Payment Failed  
- Payment Cancelled
- Payment Pending (optional)

## Expected Payload Format

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

## Webhook Signature

If ElementPay supports webhook signature verification, please provide:
- Signature algorithm (e.g., HMAC-SHA256)
- Header name for signature (e.g., x-elementpay-signature)
- How to obtain/configure the webhook secret

## Testing

Please send a test webhook to verify the endpoint is accessible. We will confirm receipt and processing.

## Additional Information

- Our webhook endpoint responds with `200 OK` and `{"received": true}` on success
- We use `transactionId` for idempotency to prevent duplicate processing
- Webhook timeout: 30 seconds
- Retry policy: We recommend 3 retries with exponential backoff

Please let us know if you need any additional information or have questions about the integration.

Best regards,
[Your Name]
Project Mocha Team
