# Flash of Content (FOUC) Fix

## Problem
Two components were briefly flashing on page load:
1. **Investment Agreement Modal** - showing while `hasAgreed` was still loading from localStorage
2. **Dynamic Guidance Banner** (Green "🎉 Great! You Have MBT Tokens" banner) - appearing while `mbtBalance` and `balanceData` were still fetching from the blockchain

This created a jarring "flash" effect where components would appear for a split second then disappear.

## Root Cause
React components were rendering immediately while asynchronous data was still loading:
- `useInvestmentAgreement` hook loads agreement status from localStorage (async)
- `useReadContract` fetches MBT balance from blockchain (async)
- `useReadContracts` fetches balances from blockchain (async)
- Components were checking these values but rendering before data was ready
- **Critical Issue**: Even after loading states became `false`, the actual data values (`mbtBalance`, `balanceData`) were transitioning from `undefined` to their actual values, causing a brief flash

## Solution

### Step 1: Track Loading States
Added loading state tracking for critical data:

```typescript
// Track MBT balance loading
const { data: mbtBalance, isLoading: isLoadingMbtBalance } = useReadContract({
  address: contractAddresses.MochaBeanToken,
  abi: MOCHA_BEAN_TOKEN_ABI,
  functionName: 'balanceOf',
  args: [address]
});

// Track balances loading
const { data: balanceData, isLoading: isLoadingBalances } = useReadContracts({
  contracts: balanceContracts,
});

// useInvestmentAgreement already exposes isLoading
const { hasAgreed, setHasAgreed, isLoading: isLoadingAgreement } = useInvestmentAgreement();
```

### Step 2: Create Initialization Flag
Introduced an `isInitialized` state that gates component rendering:

```typescript
// Initialization flag to prevent flash of content
const [isInitialized, setIsInitialized] = useState(false);
```

### Step 3: Wait for Critical Data (INCLUDING ACTUAL VALUES)
Implemented a `useEffect` that only sets `isInitialized` after:
1. All loading states are `false`
2. **AND** actual data values are available (not `undefined`)

```typescript
useEffect(() => {
  // If not connected, mark as initialized immediately
  if (!isConnected) {
    setIsInitialized(true);
    return;
  }

  // Check if all critical data has finished loading
  const criticalDataLoaded = !isLoadingAgreement && !isLoadingMbtBalance && !isLoadingBalances;
  
  // Also check that the actual data we need is available (not undefined)
  // This prevents the banner from flashing while data transitions from undefined to actual values
  const dataAvailable = mbtBalance !== undefined && balanceData !== undefined;

  if (criticalDataLoaded && dataAvailable) {
    // Add a small delay to ensure smooth rendering
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100); // 100ms delay to prevent flash

    return () => clearTimeout(timer);
  }
}, [isConnected, isLoadingAgreement, isLoadingMbtBalance, isLoadingBalances, mbtBalance, balanceData]);
```

**Key Improvement**: The `dataAvailable` check ensures we wait not just for loading to complete, but for the actual data to be present. This prevents the flash caused by values transitioning from `undefined` to their actual values.

### Step 4: Gate Component Rendering
Conditionally render components only after initialization:

```typescript
{/* Only render modal after initialization is complete */}
{isInitialized && (
  <InvestmentAgreementModal
    isOpen={showAgreementModal}
    onClose={() => {
      setShowAgreementModal(false);
      setPendingInvestAction(null);
    }}
    onAgree={handleAgreementComplete}
  />
)}

{/* Only render banner after initialization is complete */}
{isInitialized && 
  isConnected && 
  mbtBalance && 
  BigInt(mbtBalance as bigint) > BigInt(0) && 
  totalBondsOwned === 0 && (
  <div className="relative overflow-hidden rounded-lg ...">
    {/* Banner content */}
  </div>
)}
```

## Result
- ✅ No more flashing components
- ✅ Smooth, professional page load experience
- ✅ Components only render when all required data is available **AND** has actual values
- ✅ Brief (~100ms) imperceptible delay ensures stability
- ✅ Handles both loading state completion AND data value availability

## Files Modified
- `/src/pages/index.tsx` - Added initialization logic with data availability checks and loading state tracking
- `/src/hooks/useInvestmentAgreement.tsx` - Already had `isLoading` state

## Technical Details
The solution follows React best practices:
1. **Avoid premature rendering** - Don't render until data is ready
2. **Track loading states** - Expose loading states from hooks
3. **Track data availability** - Wait for actual values, not just loading states
4. **Coordinate multiple async operations** - Wait for all critical data before proceeding
5. **Add safety delay** - Small timeout ensures DOM stability

### Why Both Loading States AND Data Values?
- **Loading states (`isLoading`)**: Tell us when the fetch is in progress
- **Data values (`!== undefined`)**: Tell us when actual data has arrived
- **The Gap**: There's a brief moment after loading completes but before React updates the data value
- **Our Fix**: Wait for both to ensure a completely stable state

This pattern can be applied to any component that depends on async data and exhibits FOUC.
