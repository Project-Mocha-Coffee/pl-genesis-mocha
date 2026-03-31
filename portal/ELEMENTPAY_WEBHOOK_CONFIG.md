# ElementPay Webhook Configuration

## Webhook URL for ElementPay Team

### Production URL
```
https://portal-main.vercel.app/api/elementpay/webhook
```

### Development/Staging URL (if applicable)
```
https://portal-main-staging.vercel.app/api/elementpay/webhook
```

## Information to Send to ElementPay Team

### 1. Webhook Endpoint Details

**Webhook URL:** `https://portal-main.vercel.app/api/elementpay/webhook`

**HTTP Method:** `POST`

**Content-Type:** `application/json`

**Expected Headers:**
- `x-elementpay-signature` or `x-signature` (for signature verification)
- `Content-Type: application/json`

### 2. Webhook Events to Subscribe To

Please configure ElementPay to send webhooks for the following events:

- ✅ **Payment Success** - When M-PESA payment is successfully completed
- ✅ **Payment Failed** - When M-PESA payment fails
- ✅ **Payment Cancelled** - When user cancels the payment
- ✅ **Payment Pending** - When payment is initiated but not yet completed (optional)

### 3. Expected Webhook Payload Format

Our webhook endpoint expects the following JSON payload structure:

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

**Required Fields:**
- `transactionId` (string) - Unique transaction identifier
- `status` (string) - Payment status: "success", "failed", "pending", or "cancelled"
- `phoneNumber` (string) - User's phone number in international format
- `amount` (number) - Payment amount in KES
- `currency` (string) - Currency code (should be "KES")

**Optional but Recommended:**
- `metadata` (object) - Contains:
  - `mbtAmount` (string) - MBT amount that was credited
  - `walletAddress` (string) - User's wallet address
  - `source` (string) - Source identifier ("investor-portal")
- `timestamp` (string) - ISO 8601 timestamp of the event

### 4. Webhook Signature Verification

We support webhook signature verification for security. If ElementPay provides webhook signatures:

**Signature Header:** `x-elementpay-signature` or `x-signature`

**Algorithm:** HMAC-SHA256 (or as specified by ElementPay)

**Secret:** We will configure `ELEMENTPAY_WEBHOOK_SECRET` in our environment variables

Please provide:
- The signature algorithm used
- The header name for the signature
- How to obtain/configure the webhook secret

### 5. Response Format

Our webhook endpoint will respond with:

**Success Response (200 OK):**
```json
{
  "received": true
}
```

**Error Response (400/401/500):**
```json
{
  "error": "Error message description"
}
```

**Important:** ElementPay should retry failed webhook deliveries (non-200 responses) with exponential backoff.

### 6. Testing the Webhook

To test the webhook integration:

1. **Use ElementPay's webhook testing tool** (if available)
2. **Send a test payload** with status "success" to verify the endpoint is reachable
3. **Check our logs** to confirm the webhook was received and processed

### 7. Contact Information

**Project:** Project Mocha Investor Portal  
**Webhook Endpoint:** `https://portal-main.vercel.app/api/elementpay/webhook`  
**Support Contact:** [Your contact email/phone]

### 8. Additional Configuration Notes

- **Timeout:** Webhook requests should complete within 30 seconds
- **Retries:** We recommend retrying failed webhooks up to 3 times with exponential backoff
- **Idempotency:** We use `transactionId` to prevent duplicate processing
- **HTTPS Only:** The webhook endpoint only accepts HTTPS connections
- **Rate Limiting:** We have rate limiting in place - please contact us if you need higher limits

## Quick Setup Checklist for ElementPay Team

- [ ] Configure webhook URL: `https://portal-main.vercel.app/api/elementpay/webhook`
- [ ] Set HTTP method to `POST`
- [ ] Enable webhook events: Payment Success, Payment Failed, Payment Cancelled
- [ ] Configure webhook signature (if available)
- [ ] Test webhook with a sample payload
- [ ] Confirm webhook secret is shared securely
- [ ] Set up retry logic for failed webhook deliveries
- [ ] Monitor webhook delivery status

## Sample Test Payload

You can use this payload to test the webhook endpoint:

```json
{
  "transactionId": "test_tx_123456",
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
}
```

Send this to: `POST https://portal-main.vercel.app/api/elementpay/webhook`

Expected response: `200 OK` with `{"received": true}`
