# 🚀 Mocha Portal - Quick Start

## This folder is READY to go! Just 3 steps:

---

## Step 1: Create `.env.local` file

**In Terminal, run:**
```bash
cd /Users/mac/Documents/Work/Code/cursor/portal-main
nano .env.local
```

**Paste this:**
```bash
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here
```

**Get your Project ID:**
1. Visit: https://cloud.walletconnect.com/sign-up
2. Create account (free)
3. Create project
4. Copy Project ID
5. Replace `your_project_id_here` with your actual ID

**Save:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

---

## Step 2: Install Dependencies

```bash
npm install
```

**If you get permission errors, first run:**
```bash
sudo chown -R $(whoami) "$HOME/.npm"
```

Then try `npm install` again.

---

## Step 3: Start Development Server

```bash
npm run dev
```

You'll see:
```
▲ Next.js 15.4.6
- Local:        http://localhost:3000

✓ Ready in 3s
```

**Open browser:** http://localhost:3000

---

## ✅ That's It!

You should see the Mocha Investor Portal running!

- Sign in
- Test features
- Make your updates
- Portal hot-reloads on save

---

## 🛠️ Common Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Check for errors
npm run lint

# Stop dev server
Ctrl + C
```

---

## 📁 Project Structure

```
portal-main/
├── src/
│   ├── pages/
│   │   ├── index.tsx          # Dashboard (main page)
│   │   ├── farms/             # Farms page
│   │   ├── investments/       # Investments page
│   │   └── admin/             # Admin page
│   │
│   ├── components/@shared-components/
│   │   ├── header.tsx         # Navigation
│   │   ├── swapToMBT.tsx      # Swap component
│   │   └── statCard.tsx       # Dashboard cards
│   │
│   ├── config/
│   │   └── constants.tsx      # Contract addresses
│   │
│   └── styles/
│       └── globals.css        # Styles
│
├── .env.local                 # Your environment vars (YOU CREATE THIS)
└── package.json               # Dependencies
```

---

## 🎯 You're Ready to Code!

Everything is set up and ready. Start making your updates!

**Need help?** Just ask! 🚀

