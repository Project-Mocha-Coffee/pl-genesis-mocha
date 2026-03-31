# ElementPay M-PESA Integration Setup

This document describes the M-PESA payment integration with ElementPay API for the Project Mocha Investor Portal.

## Overview

The integration allows users to purchase MBT tokens using M-PESA payments through ElementPay. The flow is:

1. User enters phone number on investor portal
2. Backend verifies user exists in ElementPay database
3. If verified, STK Push is sent to user's phone
4. User completes payment via M-PESA
5. ElementPay credits MBTs from liquidity pool
6. ElementPay settles USDT to Project Mocha Treasury
7. Transaction is mapped to user's wallet address

## Environment Variables

Add these to your `.env.local` file:

```bash
# ElementPay API Configuration
ELEMENTPAY_API_KEY=your_elementpay_api_key_here
ELEMENTPAY_API_URL=https://api.elementpay.io  # or your ElementPay API URL
ELEMENTPAY_WEBHOOK_SECRET=your_webhook_secret_here  # For webhook signature verification

# Application URL (for webhook callbacks)
NEXT_PUBLIC_APP_URL=https://portal-main.vercel.app  # or your production URL
```

## API Endpoints

### 1. User Verification
**Endpoint:** `/api/elementpay/verify`  
**Method:** `POST`  
**Body:**
```json
{
  "phoneNumber": "0712345678"  // or "+254712345678"
}
```

**Response:**
```json
{
  "exists": true,
  "walletAddress": "0x...",
  "message": "User verified successfully"
}
```

### 2. Payment Initiation
**Endpoint:** `/api/elementpay/payment`  
**Method:** `POST`  
**Body:**
```json
{
  "phoneNumber": "0712345678",
  "amountKES": 15000,
  "mbtAmount": "100.000",
  "walletAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "tx_123456",
  "stkPushId": "stk_789012",
  "message": "STK Push initiated successfully"
}
```

### 3. Webhook Endpoint
**Endpoint:** `/api/elementpay/webhook`  
**Method:** `POST`  
**Called by:** ElementPay API when payment status changes

**Payload:**
```json
{
  "transactionId": "tx_123456",
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

## Webhook Configuration

### Setting Up Webhook in ElementPay

1. Log in to your ElementPay dashboard
2. Navigate to Webhooks/Settings
3. Add webhook URL: `https://portal-main.vercel.app/api/elementpay/webhook`
4. Configure webhook events:
   - Payment Success
   - Payment Failed
   - Payment Cancelled
5. Set webhook secret (save this as `ELEMENTPAY_WEBHOOK_SECRET`)
6. Enable webhook signature verification

### Webhook Security

The webhook endpoint should verify the signature from ElementPay. Currently, the code includes a placeholder for signature verification. Implement this based on ElementPay's signature algorithm:

```typescript
function verifyWebhookSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  // Implement ElementPay's signature verification algorithm
  // Typically involves HMAC-SHA256 or similar
  const expectedSignature = createSignature(payload, secret);
  return signature === expectedSignature;
}
```

## Frontend Integration

The M-PESA payment flow is integrated into the swap component:

1. User selects "M-Pesa" payment method
2. User enters phone number
3. Clicks "Verify" - calls `/api/elementpay/verify`
4. If verified, payment button appears
5. User clicks "Pay via M-PESA" - calls `/api/elementpay/payment`
6. STK Push is sent to user's phone
7. User completes payment on phone
8. ElementPay processes payment and calls webhook
9. Webhook updates transaction status

## Database Schema (TODO)

You'll need to store transactions in your database. Suggested schema:

```sql
CREATE TABLE elementpay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  mbt_amount DECIMAL(18, 6) NOT NULL,
  kes_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'pending', 'success', 'failed', 'cancelled'
  stk_push_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  metadata JSONB
);
```

## Testing

### Local Development

1. Use ElementPay sandbox/test environment
2. Set `ELEMENTPAY_API_URL` to test API URL
3. Use test phone numbers provided by ElementPay
4. Monitor webhook calls using tools like ngrok or similar

### Production Checklist

- [ ] ElementPay API credentials configured
- [ ] Webhook URL configured in ElementPay dashboard
- [ ] Webhook secret set in environment variables
- [ ] Database table created for transaction tracking
- [ ] Exchange rate API integrated (currently hardcoded at 150 KES/USD)
- [ ] Error handling and logging implemented
- [ ] User notifications configured (email/SMS)
- [ ] Transaction reconciliation process in place

## Exchange Rate

Currently, the exchange rate is hardcoded at 150 KES/USD. In production, you should:

1. Integrate with a real-time exchange rate API
2. Update the rate periodically (e.g., every hour)
3. Store rate history for transaction records
4. Consider rate fluctuations and fees

Example integration:
```typescript
// Fetch exchange rate from API
const exchangeRate = await fetchExchangeRate('USD', 'KES');
const amountKES = Math.ceil(formattedUsdValue * exchangeRate);
```

## Error Handling

The implementation includes error handling for:
- Invalid phone number format
- User not found in ElementPay
- Payment initiation failures
- Webhook processing errors
- Network timeouts

All errors are logged and user-friendly messages are displayed.

## Security Considerations

1. **API Key Security**: Never commit API keys to version control
2. **Webhook Verification**: Always verify webhook signatures
3. **Rate Limiting**: Implement rate limiting on API endpoints
4. **Input Validation**: Validate all user inputs
5. **Phone Number Normalization**: Normalize phone numbers to prevent duplicates
6. **Transaction Idempotency**: Use transaction IDs to prevent duplicate processing

## Support

For issues or questions:
- ElementPay API Documentation: [ElementPay Docs]
- Project Mocha Support: [Your Support Contact]
