# Vercel Personal Access Token Setup

## Step 1: Create Token
1. Go to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Give it a name (e.g., "portal-main-deployment")
4. Set expiration (or leave as "No expiration")
5. Click "Create Token"
6. **Copy the token immediately** (you won't see it again!)

## Step 2: Login with Token
Once you have the token, run:
```bash
vercel login --token YOUR_TOKEN_HERE
```

## Step 3: Deploy
After successful login:
```bash
vercel --prod
```

## Alternative: Set Token as Environment Variable
You can also set it as an environment variable:
```bash
export VERCEL_TOKEN=your_token_here
vercel --prod
```

