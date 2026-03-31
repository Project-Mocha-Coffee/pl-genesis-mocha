# RPC Block Range Fix ✅

## Issue Description

**Error:**
```
RpcRequestError: RPC Request failed.
URL: https://rpc.scroll.io
Request body: {"method":"eth_getLogs","params":[...]}
Details: Block range is too large
```

The application was crashing on load due to attempting to fetch transaction logs from an excessively large block range (1,296,000 blocks ≈ 30 days), which exceeded the RPC provider's limits.

## Root Cause

The `useUserTransactions` hook was trying to fetch all user transactions from the last 30 days by querying:
- ICO contract swap events
- Tree contract investment events  
- MBT token transfer events

**Original block range:**
```typescript
const fromBlock = currentBlock - BigInt(1296000); // ~30 days
```

RPC providers (including Scroll's public RPC at https://rpc.scroll.io) have limits on how many blocks can be queried in a single `eth_getLogs` call to prevent abuse and maintain performance.

## Solution Implemented

### 1. **Reduced Block Range**

**Before:**
```typescript
const fromBlock = currentBlock - BigInt(1296000); // ~30 days
```

**After:**
```typescript
const fromBlock = currentBlock - BigInt(50000); // ~1-2 days
```

**File:** `/src/hooks/useUserTransactions.tsx`

### 2. **Updated UI Messaging**

Changed terminology from "all transactions" to "recent transactions" to accurately reflect the limited history:

**Dashboard Tab Label:**
- Before: "Your Transactions"
- After: "Recent Transactions"

**Subtitle:**
- Before: `Track all your swaps, investments, and transfers (${transactions.length} total)`
- After: `Your recent swaps, investments, and transfers (${transactions.length} found)`

**Empty State:**
- Before: "No transactions yet"
- After: "No recent transactions" 
- Subtext: "Recent swaps, investments, and transfers will appear here (last 1-2 days)."

**Files Modified:**
- `/src/pages/index.tsx` - Updated tab labels and descriptions
- `/src/components/@shared-components/TransactionsTable.tsx` - Updated empty state

## Technical Details

### Block Time Calculation
- **Scroll blockchain**: ~2 second block time
- **50,000 blocks** = ~100,000 seconds = ~27.7 hours ≈ **1-2 days**

### Why 50,000 Blocks?
- Conservative limit that works with most public RPC providers
- Still provides meaningful recent transaction history
- Avoids RPC rate limiting and timeout errors
- Fast query response time for better UX

## Alternative Solutions Considered

1. **Chunk-based fetching** - Break into smaller ranges
   - ❌ More complex implementation
   - ❌ Multiple RPC calls (slower)
   - ❌ Potential for hitting rate limits

2. **Increase to 7 days** (~302,400 blocks)
   - ❌ Still risks RPC errors
   - ❌ Slower query times
   - ✅ More history

3. **Use indexing service** (e.g., The Graph, Alchemy)
   - ✅ No block range limits
   - ✅ Faster queries
   - ❌ Additional dependency
   - ❌ Requires setup/hosting

4. **Current solution: 1-2 days** (50,000 blocks)
   - ✅ Fast and reliable
   - ✅ Works with public RPCs
   - ✅ Simple implementation
   - ✅ Sufficient for recent activity
   - ⚠️ Limited history

## Future Enhancements

If full transaction history is needed:

### Option 1: Backend Indexer
- Set up a backend service to index transactions
- Store in database (e.g., PostgreSQL)
- API endpoint to query full history
- Could use Supabase with scheduled functions

### Option 2: The Graph
- Create a subgraph for Mocha contracts
- Query via GraphQL
- Fully decentralized indexing
- No block range limits

### Option 3: Alchemy/Moralis APIs
- Use enhanced RPC providers with larger limits
- Built-in transaction indexing
- Paid service

### Option 4: Pagination
- Fetch recent blocks initially (current)
- Add "Load More" button
- Fetch older blocks in chunks as needed
- Store in React state/cache

## Testing

✅ **Fixed Issues:**
- No more RPC errors on page load
- Fast transaction fetching
- Proper empty states
- Accurate messaging about "recent" vs "all"

✅ **Verified:**
- Recent swaps appear correctly
- Recent investments appear correctly  
- Transfers show properly
- No performance degradation
- Works across all wallet states

## User Impact

**Before:**
- ❌ App crashed with RPC error
- ❌ No transactions visible
- ❌ Poor user experience

**After:**
- ✅ App loads smoothly
- ✅ Recent transactions visible
- ✅ Clear messaging about "recent" scope
- ✅ Fast, reliable performance

**Trade-off:**
- ⚠️ Only shows last 1-2 days of transactions
- ✅ For active users, this covers recent activity
- ✅ Can be expanded later with proper indexing

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Block Range | 1,296,000 (~30 days) | 50,000 (~1-2 days) |
| RPC Errors | ✗ Frequent | ✓ None |
| Load Time | ✗ Slow/Failed | ✓ Fast |
| History | 30 days | 1-2 days |
| User Experience | ✗ Broken | ✓ Smooth |

---
**Status**: ✅ **FIXED - Production Ready**  
*Last updated: November 3, 2025*

