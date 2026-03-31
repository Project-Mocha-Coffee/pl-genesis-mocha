# ChatterPay Integration Setup Guide

## How to Get ChatterPay API Credentials

ChatterPay requires direct contact with their support team to obtain API credentials. Here are the steps:

### Option 1: Contact via Email
**Email:** contacto@chatterpay.com.ar

Send an email requesting:
- API Key for merchant account
- Merchant ID
- API Base URL (if different from default)
- Documentation for payment session creation

### Option 2: Contact via WhatsApp
**WhatsApp:** +54 9 11 6869 0963

Send a message like:
> "I would like to create a merchant account and get API credentials for integration with Project Mocha"

### Option 3: Visit Developer Portal
**Developer Portal:** https://dev.chatterpay.com.ar

Check if there's a registration or API access portal.

## Required Environment Variables

Once you receive your credentials, add them to your environment variables:

### For Local Development (.env.local)
```bash
# ChatterPay Configuration
CHATTERPAY_API_KEY=your_api_key_here
CHATTERPAY_MERCHANT_ID=your_merchant_id_here
CHATTERPAY_BASE_URL=https://api.chatterpay.com  # Optional, defaults to this
```

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `CHATTERPAY_API_KEY` - Your API key from ChatterPay
   - `CHATTERPAY_MERCHANT_ID` - Your merchant ID from ChatterPay
   - `CHATTERPAY_BASE_URL` (Optional) - API base URL if different from default

4. Make sure to add them for all environments (Production, Preview, Development)

## What to Request from ChatterPay

When contacting ChatterPay, ask for:

1. **API Key** - Used for authentication
2. **Merchant ID** - Your unique merchant identifier
3. **API Endpoints** - Specifically:
   - Payment session creation endpoint
   - Payment status check endpoint
   - Webhook URL for payment confirmations (optional)
4. **API Documentation** - Request documentation for:
   - Request/response formats
   - Authentication method
   - Error codes
   - Rate limits
5. **Test Credentials** - If available, request sandbox/test credentials for development

## Current Implementation

The current implementation expects:

- **Session Creation Endpoint:** `POST /v1/payments/create`
- **Status Check Endpoint:** `GET /v1/payments/{sessionId}/status`
- **Authentication:** Bearer token in `Authorization` header
- **Merchant ID:** In `X-Merchant-Id` header

If ChatterPay uses different endpoints or authentication methods, you'll need to update:
- `/src/pages/api/chatterpay/session.ts`
- `/src/pages/api/chatterpay/status.ts`

## Testing Without Credentials

Currently, the integration will show an error if credentials are not configured. To test the UI flow without actual API calls, you can:

1. Temporarily modify the API routes to return mock data
2. Use the ChatterPay sandbox/test environment if available
3. Wait until you receive credentials from ChatterPay support

## Next Steps

1. ✅ Contact ChatterPay support to get credentials
2. ✅ Add credentials to environment variables
3. ✅ Test payment session creation
4. ✅ Test payment status polling
5. ✅ (Optional) Set up webhook handler for real-time confirmations

## Support Resources

- **ChatterPay Website:** https://chatterpay.net
- **Developer Portal:** https://dev.chatterpay.com.ar
- **Support Email:** contacto@chatterpay.com.ar
- **WhatsApp Support:** +54 9 11 6869 0963

## Notes

- ChatterPay's API documentation is not publicly available
- Direct communication with their support team is required
- The integration is ready once credentials are configured
- All API routes are set up and ready to use

