# ElementPay API Testing Guide

## Important Distinction

### Our Endpoints (Project Mocha Investor Portal)
- **Webhook:** `https://portal-main.vercel.app/api/elementpay/webhook` ✅ Working
- **Payment Initiation:** `https://portal-main.vercel.app/api/elementpay/payment` ✅ Working
- **User Verification:** `https://portal-main.vercel.app/api/elementpay/verify` ✅ Working

### ElementPay's API Endpoints (External)
- **Base URL:** `https://api.elementpay.io` (or sandbox URL from ElementPay)
- **Create Order:** `/orders/create` (or `/api/v1/orders/create` - check ElementPay docs)
- **List Orders:** `/orders` (or `/api/v1/orders`)
- **Webhook:** ElementPay sends webhooks TO our endpoint above

## Postman Configuration

### If Testing ElementPay's API Directly:

1. **Set Base URL Variable:**
   - Variable name: `base_url`
   - Value: `https://api.elementpay.io` (or ElementPay's sandbox URL)
   - NOT: `https://portal-main.vercel.app` ❌

2. **Authentication:**
   - Add header: `Authorization: Bearer YOUR_ELEMENTPAY_API_KEY`
   - Or: `X-API-Key: YOUR_ELEMENTPAY_API_KEY`

3. **Request:**
   ```
   POST {{base_url}}/orders/create
   ```

### If Testing Our Integration:

Use our endpoints instead:
```
POST https://portal-main.vercel.app/api/elementpay/payment
```

**Request Body:**
```json
{
  "phoneNumber": "254712531490",
  "amountKES": 11,
  "mbtAmount": "100.000",
  "walletAddress": "0x750203243230392857DcF6CB70394E046Ba5e292"
}
```

## Current Implementation

Our `payment.ts` endpoint calls ElementPay's API at:
- **Endpoint:** `${ELEMENTPAY_API_URL}/api/v1/payments/mpesa/stk-push`
- **Default:** `https://api.elementpay.net/api/v1/payments/mpesa/stk-push`

However, based on your Postman screenshot showing `/orders/create`, ElementPay might use a different endpoint structure.

## Next Steps

1. **Check ElementPay Documentation:**
   - What is the correct base URL? (sandbox vs production)
   - What is the correct endpoint for creating M-PESA orders?
   - Is it `/orders/create` or `/api/v1/orders/create` or something else?

2. **Update Environment Variables:**
   ```bash
   # Set ElementPay API URL
   vercel env add ELEMENTPAY_API_URL
   # Value: https://api.elementpay.io (or sandbox URL)
   
   # Set ElementPay API Key
   vercel env add ELEMENTPAY_API_KEY
   # Value: Your API key from ElementPay dashboard
   ```

3. **Update Our Code (if needed):**
   If ElementPay uses `/orders/create` instead of `/api/v1/payments/mpesa/stk-push`, we'll need to update `src/pages/api/elementpay/payment.ts`.

## Testing Checklist

- [ ] ElementPay API base URL confirmed
- [ ] ElementPay API key obtained and added to Vercel
- [ ] ElementPay API endpoint structure confirmed (`/orders/create` vs `/api/v1/payments/mpesa/stk-push`)
- [ ] Postman base URL variable set correctly
- [ ] Authentication headers configured
- [ ] Test request successful

## Questions for ElementPay Team

1. What is the correct base URL for the API? (sandbox vs production)
2. What is the correct endpoint for creating M-PESA STK Push orders?
3. What is the expected request payload format?
4. What authentication method should we use? (Bearer token, API key header, etc.)
