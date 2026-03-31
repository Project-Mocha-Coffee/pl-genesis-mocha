# Base Network Integration - Implementation Summary

## ✅ Completed

1. **Added Base networks to wagmi config** (`src/config/index.tsx`)
   - Added `base` and `baseSepolia` to supported networks
   - Configured RPC endpoints for both networks

2. **Created network-aware contract addresses** (`src/lib/config.ts`)
   - `CONTRACT_ADDRESSES_BY_CHAIN`: Maps chain IDs to contract addresses
   - `ICO_ADDRESSES_BY_CHAIN`: Maps chain IDs to ICO contract addresses
   - Helper functions: `getContractAddresses()` and `getICOAddress()`
   - Supports: Scroll (534352), Base Sepolia (84532), Base Mainnet (8453)

3. **Created network-aware hook** (`src/hooks/useContractAddresses.ts`)
   - `useContractAddresses()`: Automatically returns correct addresses based on connected chain

## 📋 Next Steps (To Complete Integration)

### 1. Update Contract Hooks
Update these hooks to use `useContractAddresses()`:
- `src/hooks/use-ico.ts` - ICO contract interactions
- `src/hooks/use-admin.ts` - Admin functions
- Any other hooks that reference contract addresses directly

### 2. Update Components
Update components that use contract addresses:
- `src/components/@shared-components/InvestTreesDialog.tsx`
- `src/components/@shared-components/swapToMBT.tsx`
- `src/pages/index.tsx`
- `src/pages/investments/index.tsx`
- `src/pages/farms/index.tsx`

### 3. Add Network Selector UI
Create a network selector component to allow users to switch between:
- Scroll Mainnet
- Base Mainnet (after deployment)
- Base Sepolia (for testing)

### 4. Update ContractService
Update `src/lib/ContractService.ts` to use network-aware addresses instead of hardcoded ones.

## 🔧 How to Use Network-Aware Addresses

### In Components/Hooks:
```typescript
import { useContractAddresses } from '@/hooks/useContractAddresses'

function MyComponent() {
  const { diamond, mbtToken, icoAddress } = useContractAddresses()
  // Use addresses - they automatically match the connected chain
}
```

### Direct Access:
```typescript
import { getContractAddresses, getICOAddress } from '@/lib/config'
import { useChainId } from 'wagmi'

function MyComponent() {
  const chainId = useChainId()
  const addresses = getContractAddresses(chainId)
  const icoAddress = getICOAddress(chainId)
}
```

## 📝 Contract Addresses

### Scroll Mainnet (534352)
- Diamond: `0x31058580845A8ed67F404fF5863b30f1b8CF7412`
- MBT Token: `0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1`
- ICO: `0x86532F0F0BEA64Bd3902d865729Cd988E560c165`

### Base Sepolia (84532)
- Diamond: `0xaf1804E92BAfC44e4BC212Dc8204C96684FD6f15`
- MBT Token: `0xdb56AF2092C1e162e0cb503CeC5500ba16bfb8e8`
- ICO: `0x8732f0080B549f6ECCeceFF5744734278fD0E8a2`

### Base Mainnet (8453)
- ⚠️ **TODO**: Update addresses after mainnet deployment

## 🧪 Testing Locally

1. Start the dev server:
   ```bash
   cd portal-main
   npm run dev
   ```

2. Sign in and switch networks:
   - Connect to Scroll Mainnet (default)
   - Switch to Base Sepolia to test Base network
   - Verify contract addresses change automatically

3. Test contract interactions:
   - Swap tokens via ICO
   - Invest in farms
   - Check balances
   - Verify transactions on correct network

## 🚀 Deployment Notes

- Base Mainnet addresses are placeholders - update after deployment
- Network selector UI should be added before production
- Test thoroughly on both networks before pushing to GitHub
