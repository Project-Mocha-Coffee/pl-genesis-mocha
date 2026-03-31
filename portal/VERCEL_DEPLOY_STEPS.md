# 🚀 Vercel Deployment - Step-by-Step Guide

**Date**: November 3, 2025  
**Repository**: https://github.com/Project-Mocha-Coffee/portal-main

---

## 📋 Pre-Deployment Checklist

Before starting, make sure you have:
- ✅ GitHub repository pushed (Done!)
- ✅ Vercel account (create at https://vercel.com/signup if needed)
- ✅ WalletConnect Project ID (from https://cloud.reown.com/dashboard)
- ✅ Supabase credentials (optional but recommended)

---

## 🎯 Step 1: Go to Vercel

1. **Visit**: https://vercel.com
2. **Sign in** (or create account if you don't have one)
   - Can sign in with GitHub (recommended!)

---

## 🎯 Step 2: Import Your Repository

1. **Click**: "Add New Project" button (top right)
2. **If prompted**: Click "Import Git Repository"
3. **Select GitHub** as your Git provider
4. **Authorize Vercel** (if first time) - gives Vercel access to your GitHub repos
5. **Search for**: `portal-main` or `Project-Mocha-Coffee/portal-main`
6. **Click**: "Import" next to your repository

---

## 🎯 Step 3: Configure Project

Vercel will auto-detect Next.js, but verify these settings:

### Project Settings:
- **Project Name**: `portal-main` (or keep default)
- **Framework Preset**: **Next.js** ✅ (should be auto-detected)
- **Root Directory**: `./` (default - leave as is)
- **Build Command**: `npm run build` (default - leave as is)
- **Output Directory**: `.next` (default - leave as is)
- **Install Command**: `npm install` (default - leave as is)

**Click "Continue"** or **"Deploy"** (environment variables come next)

---

## 🎯 Step 4: Add Environment Variables

**IMPORTANT**: Add these BEFORE deploying (or deploy first, then add and redeploy)

### Option A: Add During Initial Setup
- Scroll down to "Environment Variables" section
- Add each variable (see list below)

### Option B: Add After Deployment
- Deploy first (to get URL)
- Then: Project Settings → Environment Variables
- Add variables
- Redeploy

---

## 🔐 Required Environment Variables

### 1. **NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID** (REQUIRED)

**Get it from**:
1. Go to: https://cloud.reown.com/dashboard
2. Sign in (or create account)
3. Create new project (or use existing)
4. Copy the **Project ID**

**Add to Vercel**:
- **Key**: `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- **Value**: Your project ID (e.g., `a1b2c3d4e5f6...`)
- **Environment**: Select **Production**, **Preview**, and **Development**

---

### 2. **NEXT_PUBLIC_SUPABASE_URL** (Recommended)

**Get it from**:
1. Go to: https://app.supabase.com
2. Select your project
3. Settings → API
4. Copy **Project URL**

**Add to Vercel**:
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: Your Supabase URL (e.g., `https://xxxxx.supabase.co`)
- **Environment**: Select **Production**, **Preview**, and **Development**

---

### 3. **NEXT_PUBLIC_SUPABASE_ANON_KEY** (Recommended)

**Get it from**:
1. Same Supabase page (Settings → API)
2. Copy **anon/public** key

**Add to Vercel**:
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Your anon key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
- **Environment**: Select **Production**, **Preview**, and **Development**

---

### 4. **RESEND_API_KEY** (Optional)

**Get it from**:
1. Go to: https://resend.com/api-keys
2. Sign in (or create account)
3. Create new API key
4. Copy the key

**Add to Vercel**:
- **Key**: `RESEND_API_KEY`
- **Value**: Your Resend API key
- **Environment**: Select **Production**, **Preview**, and **Development**

**Note**: Only needed if you want to send emails. App works without it!

---

## 🎯 Step 5: Deploy!

1. **Click**: "Deploy" button (bottom right)
2. **Watch**: Build progress in real-time
3. **Wait**: ~2-3 minutes for build to complete

**Build logs will show**:
- Installing dependencies
- Building Next.js app
- Deploying to Vercel edge network

---

## ✅ Step 6: Verify Deployment

After build completes:

1. **You'll see**: "Congratulations! Your project has been deployed"
2. **Click**: "Visit" button to see your live site
3. **URL format**: `https://portal-main-xxxxx.vercel.app`

**Test these features**:
- ✅ Site loads
- ✅ Wallet connects
- ✅ Animations work
- ✅ Dark mode works
- ✅ All pages accessible

---

## 🔄 Step 7: Configure Auto-Deploy (Already Set!)

**Good news**: Auto-deploy is already configured!

**What happens**:
- ✅ Every push to `main` branch → **Production deploy**
- ✅ Every push to other branches → **Preview deploy**
- ✅ Pull requests → **Preview deploy**

**No action needed** - it's automatic! 🎉

---

## 🎯 Step 8: Add Custom Domain (Optional)

If you want a custom domain:

1. **Go to**: Project Settings → Domains
2. **Add Domain**: Enter your domain (e.g., `portal.projectmocha.com`)
3. **Follow DNS instructions**: Add CNAME records
4. **Wait**: 5-30 minutes for DNS propagation
5. **Done**: Your site is live on custom domain!

---

## 📊 Environment Variables Summary

| Variable | Required | Where to Get | Impact if Missing |
|----------|----------|--------------|------------------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | ✅ YES | https://cloud.reown.com/dashboard | App won't work |
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ Recommended | Supabase project settings | Email capture won't work |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ Recommended | Supabase project settings | Email capture won't work |
| `RESEND_API_KEY` | ❌ Optional | https://resend.com/api-keys | Emails won't send |

---

## 🐛 Troubleshooting

### Build Fails?

**Check**:
1. ✅ Environment variables are set correctly
2. ✅ No syntax errors in code
3. ✅ All dependencies in `package.json`

**Test locally first**:
```bash
cd /Users/mac/Documents/Work/Code/cursor/portal-main
npm run build
```

If local build works, Vercel should work too!

---

### App Loads But Wallet Won't Connect?

**Check**:
1. ✅ `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is set
2. ✅ Project ID is correct (no typos)
3. ✅ Environment variable is set for **Production** environment

**Redeploy** after fixing:
- Go to Deployments tab
- Click "..." → "Redeploy"

---

### Environment Variables Not Working?

**Check**:
1. ✅ Variable names match exactly (case-sensitive!)
2. ✅ Set for correct environment (Production/Preview/Development)
3. ✅ No extra spaces before/after values
4. ✅ Redeployed after adding variables

---

## 🎉 Success Checklist

After deployment, verify:
- [ ] Site loads at Vercel URL
- [ ] Wallet connects successfully
- [ ] Stat cards display with animations
- [ ] Quick Actions card works
- [ ] Can swap tokens
- [ ] Post-swap nudge appears
- [ ] Can invest in trees
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] No critical console errors

---

## 📱 Test on Mobile

1. Open your Vercel URL on mobile
2. Test:
   - Wallet connection
   - Animations
   - Responsive design
   - Touch interactions

---

## 🔄 Update Deployment

**To update your live site**:
```bash
cd /Users/mac/Documents/Work/Code/cursor/portal-main

# Make changes
git add .
git commit -m "Your update message"
git push
```

**Vercel automatically deploys!** 🚀

---

## 📚 Additional Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Environment Variables**: Vercel Dashboard → Settings → Environment Variables

---

## 🎯 Quick Reference

**Deploy URL**: https://vercel.com/new

**Environment Variables Location**: 
- Vercel Dashboard → Your Project → Settings → Environment Variables

**After Deployment**:
- Production URL: `https://portal-main-xxxxx.vercel.app`
- Auto-deploys on every push ✅

---

## 🚀 Ready to Deploy?

**Follow these steps**:
1. ✅ Go to https://vercel.com/new
2. ✅ Import `Project-Mocha-Coffee/portal-main`
3. ✅ Configure project (auto-detected Next.js)
4. ✅ Add environment variables
5. ✅ Click "Deploy"
6. ✅ Wait ~2-3 minutes
7. ✅ Test your live site!

---

**Let's get your portal live!** 🎉

If you need help at any step, let me know!

