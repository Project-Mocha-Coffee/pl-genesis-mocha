# Bug Fixes Summary - Investor Portal

## ✅ Fixed Issues

### 1. RPC Block Range Error (Fixed)
- **Issue**: "Block range is too large" error from Scroll RPC
- **Fix**: Reduced block range from 50,000 to 10,000 blocks (~5-6 hours)
- **Location**: `src/hooks/useUserTransactions.tsx`
- **Additional**: Added retry logic with smaller range (5,000 blocks) if initial query fails

### 2. Partial Reload Issue (Fixed)
- **Issue**: `window.location.reload()` causing full page refresh after swap/purchase
- **Fix**: Created `handleRefreshBalances()` function that:
  - Refetches MBT balance
  - Refetches allowance
  - Invalidates React Query cache
  - Shows toast notification
- **Location**: `src/pages/index.tsx`
- **Lines Changed**: 
  - Line 978: Refresh button now uses `handleRefreshBalances`
  - Line 1086: Transaction success refresh uses `handleRefreshBalances`

### 3. toBlock: 'latest' Query (Fixed)
- **Issue**: Unbounded block query causing RPC errors
- **Fix**: Changed to use limited block range with error handling
- **Location**: `src/pages/index.tsx` line 243-261

### 4. Farm Selection Error (Fixed Earlier)
- **Issue**: "No farm selected" error when clicking "Invest Now"
- **Fix**: Updated `handleQuickBuyClick` to:
  - Check loading state first
  - Use `firstAvailableFarm` (already calculated)
  - Set `selectedFarmId` BEFORE opening modal
  - Show proper error messages

## 🔄 Remaining Issues

### 5. MetaMask Connection Error
- **Error**: "Failed to connect to MetaMask"
- **Potential Causes**:
  - WalletConnect/Reown AppKit initialization timing
  - WagmiProvider not fully initialized when connection attempted
  - Missing error handling in connection flow
- **Fix Needed**: Add connection retry logic and ensure proper initialization order

### 6. Failed to Fetch Errors
- **Error**: "Runtime TypeError: Failed to fetch"
- **Potential Causes**:
  - Network timeouts
  - CORS issues
  - Invalid API responses
- **Fix Needed**: Add error boundaries and retry logic for API calls

### 7. Investor Agreement Modal Missing
- **Issue**: Modal not appearing before investment actions
- **Current State**: `InvestmentAgreementModal` component exists but may not be triggered
- **Fix Needed**: Verify modal triggers in `handleQuickBuyClick` and swap flow

### 8. User Guide/Tour Missing
- **Issue**: NextStep tour not appearing
- **Current State**: Tour logic exists in `_app.tsx` but may not be triggering
- **Fix Needed**: Verify `localStorage` check and tour initialization

### 9. Deprecated Green Modal
- **Issue**: Old modal still appearing after hard reset
- **Fix Needed**: Find and remove residual modal logic

## 📝 Code Changes Made

### Files Modified:
1. `src/hooks/useUserTransactions.tsx`
   - Reduced block range
   - Added retry logic

2. `src/pages/index.tsx`
   - Added `useQueryClient` import
   - Created `handleRefreshBalances()` function
   - Replaced `window.location.reload()` calls
   - Fixed `toBlock: 'latest'` query
   - Enhanced `handleQuickBuyClick` with loading checks

## 🚀 Next Steps

1. Test the fixes locally
2. Add error boundaries for fetch calls
3. Verify Investor Agreement Modal flow
4. Restore User Guide/Tour functionality
5. Add MetaMask connection retry logic
6. Remove deprecated modal code



