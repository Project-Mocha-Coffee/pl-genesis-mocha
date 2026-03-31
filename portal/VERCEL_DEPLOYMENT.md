# 🚀 Deploy to Vercel - Complete Guide

**Date**: November 3, 2025  
**Status**: Ready to Deploy

---

## 📋 Quick Start (2 Methods)

### Method 1: Vercel CLI (Recommended) ⚡
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd /Users/mac/Documents/Work/Code/cursor/portal-main
vercel
```

### Method 2: GitHub Integration (Best for Production) 🔗
1. Push to GitHub
2. Connect repo to Vercel
3. Auto-deploys on every push

---

## 🔐 Required Environment Variables

### **Critical (App won't work without these):**
1. `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
   - **Where to get**: https://cloud.reown.com/dashboard
   - **Required**: YES (throws error if missing)
   - **What it does**: Enables wallet connections

### **Recommended (For full functionality):**
2. `NEXT_PUBLIC_SUPABASE_URL`
   - **Where to get**: Your Supabase project settings
   - **Required**: NO (but email capture won't work)
   - **What it does**: Saves payment notifications

3. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Where to get**: Your Supabase project settings
   - **Required**: NO (but email capture won't work)
   - **What it does**: Supabase authentication

### **Optional (For email sending):**
4. `RESEND_API_KEY`
   - **Where to get**: https://resend.com/api-keys
   - **Required**: NO (emails won't send, but won't break)
   - **What it does**: Sends investment agreement emails

### **Optional (RPC fallback):**
5. `NEXT_PUBLIC_SCROLL_RPC_URL`
   - **Default**: `https://rpc.scroll.io` (already hardcoded)
   - **Required**: NO
   - **What it does**: Custom RPC endpoint (if needed)

---

## 📝 Step-by-Step: Vercel CLI Deployment

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Login
```bash
vercel login
```
- Opens browser → Click "Authorize"
- Returns to terminal when done

### Step 3: Navigate to Project
```bash
cd /Users/mac/Documents/Work/Code/cursor/portal-main
```

### Step 4: Deploy
```bash
vercel
```

**Follow prompts:**
- `Set up and deploy?` → **Y**
- `Which scope?` → Select your account
- `Link to existing project?` → **N** (first time)
- `What's your project's name?` → `portal-main` (or your choice)
- `In which directory is your code located?` → **./** (press Enter)
- `Want to override settings?` → **N** (first time)

### Step 5: Add Environment Variables
After deployment, add env vars via:
1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add each variable (see list above)

**OR** use CLI:
```bash
vercel env add NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add RESEND_API_KEY
```

### Step 6: Redeploy
After adding env vars:
```bash
vercel --prod
```

---

## 🔗 Method 2: GitHub Integration (Recommended for Production)

### Step 1: Push to GitHub
```bash
cd /Users/mac/Documents/Work/Code/cursor/portal-main

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Deploy investor portal to Vercel"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/portal-main.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Vercel
1. Go to https://vercel.com
2. Click **"Add New Project"**
3. Import your GitHub repo
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### Step 3: Add Environment Variables
In Vercel dashboard:
- Settings → Environment Variables
- Add all required variables (see list above)
- **Important**: Set for **Production**, **Preview**, and **Development**

### Step 4: Deploy
Click **"Deploy"** → Vercel builds and deploys automatically!

---

## ✅ Post-Deployment Checklist

### Test These Features:
- [ ] **Sign in**: AppKit / wallet flow works
- [ ] **Swap Tokens**: Can swap ETH/USDC/etc for MBT
- [ ] **Invest in Trees**: Can invest MBT tokens
- [ ] **Stat Cards**: Display correctly with animations
- [ ] **Quick Actions**: Card shows and works
- [ ] **Post-Swap Nudge**: Appears after swap
- [ ] **Transactions**: History loads
- [ ] **Dark Mode**: Toggle works
- [ ] **Mobile**: Responsive design works

### Check Browser Console:
- [ ] No critical errors
- [ ] "Failed to fetch" is harmless (expected)
- [ ] Wallet connects properly

---

## 🔧 Troubleshooting

### Build Fails?
```bash
# Test build locally first
npm run build

# If it works locally, check:
# 1. Node version (Vercel uses Node 20.x)
# 2. Environment variables are set
# 3. All dependencies in package.json
```

### App Loads But Wallet Won't Connect?
- ✅ Check `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is set
- ✅ Verify project ID is correct
- ✅ Check browser console for errors

### Animations Not Working?
- ✅ Check Framer Motion is installed (it is)
- ✅ Verify build completed successfully
- ✅ Clear browser cache

### Environment Variables Not Working?
- ✅ Make sure they're set for **Production** environment
- ✅ Redeploy after adding env vars
- ✅ Check variable names match exactly (case-sensitive!)

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain:
1. Vercel Dashboard → Your Project
2. Settings → Domains
3. Add your domain
4. Follow DNS instructions
5. Wait for DNS propagation (5-30 min)

---

## 📊 Deployment URLs

After deployment, you'll get:
- **Production**: `https://your-project-name.vercel.app`
- **Preview**: `https://your-project-name-git-branch.vercel.app` (for each branch)

---

## 🔄 Auto-Deploy on Push

With GitHub integration:
- ✅ Every push to `main` → Production deploy
- ✅ Every push to other branches → Preview deploy
- ✅ Pull requests → Preview deploy

---

## 📝 Environment Variables Summary

| Variable | Required | Where to Get | Impact if Missing |
|----------|----------|--------------|------------------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | ✅ YES | Reown Cloud | App won't work |
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ Recommended | Supabase | Email capture won't work |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ Recommended | Supabase | Email capture won't work |
| `RESEND_API_KEY` | ❌ Optional | Resend.com | Emails won't send |
| `NEXT_PUBLIC_SCROLL_RPC_URL` | ❌ Optional | Scroll RPC | Uses default |

---

## 🚀 Quick Deploy Command

**One-liner (after setting up env vars):**
```bash
cd /Users/mac/Documents/Work/Code/cursor/portal-main && vercel --prod
```

---

## 💡 Pro Tips

1. **Test Preview Deployments First**
   - Deploy to preview before production
   - Test all features
   - Then promote to production

2. **Use Vercel Analytics**
   - Enable in Vercel dashboard
   - Track performance
   - Monitor errors

3. **Set Up Notifications**
   - Email on deploy success/failure
   - Slack notifications (optional)

4. **Environment-Specific Configs**
   - Different env vars for dev/preview/prod
   - Easier to manage

---

## 🎉 Success!

Once deployed, you'll have:
- ✅ Live investor portal
- ✅ All animations working
- ✅ Wallet connections
- ✅ Full functionality
- ✅ Auto-deploys on push (if using GitHub)

**Your portal is ready for the world!** 🌍

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Environment Variables**: Check Vercel dashboard → Settings → Environment Variables

---

**Ready to deploy? Let's go!** 🚀

