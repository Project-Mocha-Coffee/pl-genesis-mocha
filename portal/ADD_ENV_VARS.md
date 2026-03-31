# 🔐 Step-by-Step: Add Environment Variables

**Current Status**: Build failing because environment variables missing!

**Error**: `Project ID is not defined`

Let's add the required environment variables:

---

## Step 1: Add WalletConnect Project ID (REQUIRED)

Run this command:
```bash
cd /Users/mac/Documents/Work/Code/cursor/portal-main
vercel env add NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
```

**When prompted**:
1. **Value**: Paste your WalletConnect Project ID
   - Get it from: https://cloud.reown.com/dashboard
2. **Environment**: Select all three:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
   - (Use arrow keys + spacebar to select, Enter to confirm)

---

## Step 2: Add Supabase URL (Recommended)

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
```

**When prompted**:
1. **Value**: Your Supabase URL (e.g., `https://xxxxx.supabase.co`)
2. **Environment**: Select all three (Production, Preview, Development)

---

## Step 3: Add Supabase Anon Key (Recommended)

```bash
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**When prompted**:
1. **Value**: Your Supabase anon key
2. **Environment**: Select all three (Production, Preview, Development)

---

## Step 4: Add Resend API Key (Optional)

```bash
vercel env add RESEND_API_KEY
```

**When prompted**:
1. **Value**: Your Resend API key (or skip if not using)
2. **Environment**: Select all three (Production, Preview, Development)

---

## Step 5: Redeploy After Adding Variables

Once all variables are added:

```bash
vercel --prod
```

---

## 🎯 Quick Reference

**Required Variables**:
1. `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` ✅ MUST HAVE
2. `NEXT_PUBLIC_SUPABASE_URL` ⚠️ Recommended
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY` ⚠️ Recommended
4. `RESEND_API_KEY` ❌ Optional

**Get WalletConnect Project ID**:
- Visit: https://cloud.reown.com/dashboard
- Sign in (or create account)
- Create project (or use existing)
- Copy Project ID

---

Let's start with the WalletConnect Project ID - do you have it ready?

