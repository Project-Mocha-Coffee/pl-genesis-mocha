# "Max" Button Behavior Fix

## Problem
The "Max" button had two issues:
1. It was only setting the amount to the contract's investment cap (80 MBT), not the user's actual wallet balance
2. The button would become disabled when user balance was below the minimum investment, preventing users from seeing what the maximum amount would be

## User Feedback
> "Max" should automatically grab all available MBTs in my wallet — not just the 80 MBT cap. The max button is no longer clickable to show users all available MBTs in their wallet.

## Solution

### Issue #1: Balance vs Cap
**Previous Behavior:**
```typescript
const maxMbtAllowed = maxInvestmentNum; // Only uses contract cap (80 MBT)
```

**New Behavior:**
```typescript
// Max allowed is the MINIMUM of: user's wallet balance OR contract cap (80 MBT)
const userMbtBalance = mbtBalance ? Number(formatUnits(mbtBalance as bigint, MBT_DECIMALS)) : 0;
const maxMbtAllowed = Math.min(userMbtBalance, maxInvestmentNum);
```

### Issue #2: Button Disabled State
**Previous Behavior:**
```typescript
disabled={maxInvestmentNum <= 0} // Could be disabled based on various conditions
```

**New Behavior:**
```typescript
disabled={false} // Always enabled
title={`Set to ${maxMbtAllowed.toFixed(2)} MBT (${userMbtBalance >= maxInvestmentNum ? 'contract cap' : 'your balance'})`}
```

## How It Works

The "Max" button now intelligently sets the investment amount to:
- **If wallet balance < 80 MBT**: Uses entire wallet balance
- **If wallet balance ≥ 80 MBT**: Uses the cap (80 MBT)
- **Always clickable**: Even with 0 balance (shows "Insufficient balance" error after clicking)

### Examples

| Wallet Balance | Contract Cap | "Max" Sets To | Button State | Tooltip |
|---------------|--------------|---------------|--------------|---------|
| 0 MBT | 80 MBT | 0.00 MBT | ✅ Enabled | "Set to 0.00 MBT (your balance)" |
| 50 MBT | 80 MBT | 50.00 MBT | ✅ Enabled | "Set to 50.00 MBT (your balance)" |
| 80 MBT | 80 MBT | 80.00 MBT | ✅ Enabled | "Set to 80.00 MBT (contract cap)" |
| 150 MBT | 80 MBT | 80.00 MBT | ✅ Enabled | "Set to 80.00 MBT (contract cap)" |

## Technical Details

### Pilot Farm Phase Cap
During the Pilot Farm phase, there's a wallet investment cap of 80 MBTs:
- **80 MBTs** = ~20 trees
- **$2,000** investment value (at $25/MBT)
- Purpose: Control yield distribution testing

### Button Availability
The "Max" button is **always enabled** and clickable, regardless of wallet balance. This ensures:
- Users with 0 MBT can still click "Max" to see it sets to 0.00 (then see the "Insufficient balance" error)
- Users with low balance can quickly set their max amount
- Transparent feedback through the button's tooltip showing exactly what value it will set

### Tooltip Behavior
The button includes a helpful tooltip:
- "Set to X MBT (your balance)" - when balance < cap
- "Set to X MBT (contract cap)" - when balance ≥ cap

### Future Considerations
Once the Pilot Phase completes, the contract cap may be increased or removed, and the "Max" button will automatically adapt to the new cap while still respecting the user's wallet balance.

## Files Modified
1. `/src/pages/index.tsx` - Main dashboard investment "Max" button
2. `/src/pages/farms/index.tsx` - Farms marketplace "Max" button

## Benefits
✅ **Better UX**: Users can quickly invest their entire balance without manual calculation  
✅ **Always Clickable**: Button is never disabled, providing immediate feedback  
✅ **Respects Limits**: Still honors the contract cap during Pilot Phase  
✅ **Transparent**: Tooltip shows users exactly what they can invest  
✅ **Helpful**: Works even with 0 balance, showing appropriate error messages  
✅ **Consistent**: Same behavior across Dashboard and Farms pages
