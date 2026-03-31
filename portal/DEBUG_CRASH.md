# 🔧 Serverless Function Crash - Debugging Guide

**Error**: `FUNCTION_INVOCATION_FAILED` (500 Internal Server Error)

## 🔍 Possible Causes

1. **Environment Variable Not Available at Runtime**
   - Vercel might not be injecting env vars correctly
   - Check if `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is set for Production

2. **Module-Level Code Execution**
   - Code running at module level (outside functions) might be crashing
   - WagmiAdapter creation might be failing

3. **SSR/Runtime Mismatch**
   - Server-side rendering trying to access client-only APIs

## ✅ Fixes Applied

1. ✅ Added try-catch around WagmiAdapter creation
2. ✅ Added try-catch around AppKit modal creation  
3. ✅ Added try-catch around cookieToInitialState
4. ✅ Added null checks for wagmiAdapter, projectId, and config
5. ✅ Graceful fallback if WalletConnect isn't configured

## 🧪 Quick Test

Try accessing the site in an **incognito window** to rule out caching issues.

## 🔍 Check Environment Variables

Run this to verify env vars are set:

```bash
vercel env ls
```

Should show:
- ✅ `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` (Production)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (Production)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production)
- ✅ `RESEND_API_KEY` (Production)

## 🚨 If Still Crashing

The error might be in a different part of the code. Check:

1. **API Routes** - `/api/send-agreement.ts` or `/api/save-payment-notification.ts`
2. **Page Components** - Any component trying to access wallet during SSR
3. **Next.js getInitialProps** - The `_app.tsx` getInitialProps might be failing

## 📝 Next Steps

1. Check Vercel Dashboard → Deployments → View Function Logs
2. Look for the actual error message in the logs
3. Share the error details if you can access them

