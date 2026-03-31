# Social Login Chain Configuration

## Overview

When users log in via social login (email, Google, etc.) using Reown AppKit, they can **choose which blockchain network** their wallet is created on. This is a **multi-chain portal** supporting Scroll, Base Mainnet, and Base Sepolia.

## Current Configuration

**Multi-Chain Support:** Users can choose their preferred network during wallet creation.

**Available Networks (Production):**
- **Scroll Mainnet** (Chain ID: 534352)
- **Base Mainnet** (Chain ID: 8453)

**Available Networks (Development/Testing):**
- **Scroll Mainnet** (Chain ID: 534352)
- **Base Mainnet** (Chain ID: 8453)
- **Base Sepolia** (Chain ID: 84532)  *(dev/test only)*

**Default Network:** Scroll (initial default, users can change)

## How It Works

1. **User clicks "Sign in"** (header) and chooses social login (email, Google, etc.) or a crypto wallet
2. **AppKit modal opens** with network selection visible (`enableNetworkView: true`)
3. **User selects their preferred network** (Scroll, Base, or Base Sepolia)
4. **Reown AppKit creates** a new wallet address on the selected network
5. **User can switch networks** anytime using the NetworkSelector component in the app

## Configuration Options

### Option 1: Environment Variable (Recommended)

Set the default chain via environment variable:

```bash
# In .env.local or Vercel environment variables
NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453  # Base mainnet
# OR
NEXT_PUBLIC_DEFAULT_CHAIN_ID=84532  # Base Sepolia (for testing)
# OR
NEXT_PUBLIC_DEFAULT_CHAIN_ID=534352  # Scroll (legacy)
```

**Chain IDs:**
- `8453` = Base Mainnet (Production)
- `84532` = Base Sepolia (Testnet)
- `534352` = Scroll Mainnet (Legacy)

### Option 2: Automatic (Current Setup)

The system automatically selects:
- **Production:** Base Mainnet (8453)
- **Development:** Base Mainnet (8453) - can be changed to Base Sepolia for testing

## Code Location

The default network is configured in:
- **`src/context/index.tsx`** - Line 78: `defaultNetwork` in AppKit configuration
- **`src/lib/config.ts`** - Line 99: `SUPPORTED_CHAIN` export

## Verification

To verify which chain new wallets are created on:

1. **Open browser console** (F12)
2. **Sign in** via social login or wallet
3. **Check the network** in the wallet connection modal
4. **Verify in code:**
   ```javascript
   // In browser console after connecting
   console.log('Default network:', window.__WAGMI_CONFIG__?.chains?.[0])
   ```

## Testing

### Test on Base Sepolia (Testnet)

1. Set environment variable:
   ```bash
   NEXT_PUBLIC_DEFAULT_CHAIN_ID=84532
   ```

2. Restart the development server:
   ```bash
   npm run dev
   ```

3. Test social login - new wallets should be created on Base Sepolia

### Test on Base Mainnet (Production)

1. Set environment variable:
   ```bash
   NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453
   ```

2. Deploy to Vercel with this environment variable set

3. Test social login - new wallets should be created on Base Mainnet

## Important Notes

⚠️ **Wallet Creation is Permanent:**
- Once a wallet is created on a network, it cannot be moved to another network
- The wallet address is the same across all networks (same private key), but the account exists on the network where it was first created
- Users can switch networks after creation, but the initial creation network matters for:
  - First transaction fees (need native token on that network)
  - Contract interactions (must match the network where contracts are deployed)

✅ **Best Practice:**
- **Let users choose** - Multi-chain support means users can select their preferred network
- **Base Mainnet (8453):** For users who want to interact with your deployed contracts
- **Base Sepolia (84532):** For testing with free testnet tokens
- **Scroll (534352):** For users who prefer Scroll network
- **NetworkSelector component** allows easy switching between networks after wallet creation

## Migration Strategy

If you need to migrate existing users:

1. **Check user's current network:**
   ```typescript
   const { chainId } = useChainId()
   ```

2. **Prompt to switch** if on wrong network:
   ```typescript
   if (chainId !== 8453) {
     // Show message: "Please switch to Base network"
   }
   ```

3. **Guide users** to switch networks using the NetworkSelector component

## Troubleshooting

### Issue: New wallets created on wrong network

**Solution:**
1. Check `NEXT_PUBLIC_DEFAULT_CHAIN_ID` environment variable
2. Verify it's set in Vercel environment variables
3. Redeploy after setting the variable

### Issue: Users can't interact with contracts

**Solution:**
1. Ensure contracts are deployed on the same network as default
2. Check contract addresses in `src/lib/config.ts`
3. Verify network matches: Base Mainnet = 8453

### Issue: Social login not creating wallets

**Solution:**
1. Verify `email: true` and `socials: true` in AppKit features
2. Check Reown Project ID is set: `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
3. Ensure network is properly configured in `networks` array

## Environment Variables Summary

```bash
# Required
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id

# Optional (defaults to Base Mainnet in production)
NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453  # Base Mainnet (recommended for production)
```

## Related Files

- `src/context/index.tsx` - AppKit configuration and default network
- `src/lib/config.ts` - Chain configuration and helpers
- `src/config/index.tsx` - Wagmi adapter and network setup
- `src/components/@shared-components/NetworkSelector.tsx` - Network switching UI

---

**Last Updated:** After Base mainnet deployment
**Default Network:** Base Mainnet (8453)
