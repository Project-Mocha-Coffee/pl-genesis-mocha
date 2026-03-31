# Vercel Deployment Checklist

## Pre-Deployment Fixes ✅
- [x] `@reown/appkit-polyfills` installed (v1.7.19)
- [x] `ContextProvider` is client-only (`ssr: false`)
- [x] `vercel.json` configured with `npm install`
- [x] Local build succeeds
- [x] Project linked to Vercel

## Required Environment Variables
Ensure these are set in Vercel dashboard:

1. `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - WalletConnect Project ID
2. `NEXT_PUBLIC_SCROLL_RPC_URL` - Scroll RPC URL (optional, defaults to https://rpc.scroll.io)
3. `RESEND_API_KEY` - For sending emails (if using email features)
4. `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
5. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
6. `NEXT_PUBLIC_APP_URL` - Your Vercel deployment URL (optional, auto-detected)

## Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended for private repos)
```bash
vercel --prod
```

### Option 2: Connect GitHub (if repo is public)
- Go to https://vercel.com/project-mocha/portal-main
- Click "Connect Git"
- Select GitHub repository
- Vercel will auto-deploy on every push

## Troubleshooting

### If deployment fails:
1. Check Vercel logs: `vercel logs`
2. Verify environment variables are set
3. Check build logs in Vercel dashboard
4. Ensure all dependencies are in `package.json`

### Common Issues Fixed:
- ✅ Serverless Function crashes → Fixed with `@reown/appkit-polyfills`
- ✅ 404 errors → Fixed with client-only ContextProvider
- ✅ WagmiProvider errors → Fixed with proper SSR handling
- ✅ Reown errors → Fixed with error suppression and feature disabling

