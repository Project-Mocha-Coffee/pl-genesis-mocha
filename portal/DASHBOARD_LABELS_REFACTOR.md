# Dashboard Stat Card Labels Refactoring

## Problem
The previous label "Available MBTs" was confusing to users because:
- **Sounded like wallet balance**: "Available" typically implies tokens ready to be used/spent
- **Actually represents yield**: The metric shows claimable annual interest, not available-to-invest tokens
- **Not intuitive**: Users couldn't immediately understand what the metrics represented

## User Feedback
> "Available" sounds like tokens still in my wallet — could be confusing. If it represents expected yield, it should be renamed accordingly.

## Solution

### Label Changes

| Old Label | New Label | Why It's Better |
|-----------|-----------|-----------------|
| **Locked MBTs** | **Staked MBTs** | More action-oriented and industry-standard terminology |
| **Available MBTs** | **Annual Interest** | Clear distinction from wallet balance; immediately understood as yield |
| **MBTs Cumulative Return** | **Total Returns (5Y)** | More concise; timeframe is explicit |

### Updated Descriptions

#### 1. Staked MBTs
- **Previous**: "Staked MBTs earning returns / Converted from deposited crypto"
- **Updated**: "Your locked investment / Earning returns over time"
- **Improvement**: More user-centric language, emphasizes ownership

#### 2. Annual Interest  
- **Previous**: "Claimable annual interest accrued / Estimated yearly MBT earnings"
- **Updated**: "Claimable yearly earnings / Fixed annual yield accrued"
- **Improvement**: "Interest" in the title eliminates confusion; matches footer description

#### 3. Total Returns (5Y)
- **Previous**: "Total interest at maturity / 5-year projection with compounding"
- **Updated**: "Total interest at maturity / 5-year projection with compounding" (same)
- **Improvement**: Title now explicitly shows the timeframe

## Technical Implementation

### Files Modified
1. `/src/pages/index.tsx` - Dashboard stat cards labels and descriptions
2. `/src/pages/_app.tsx` - User tour step labels and explanations

### ID Changes
Updated element IDs for tour targeting:
- `#statcard-locked-mbts` → `#statcard-staked-mbts`
- `#statcard-available-mbts` → `#statcard-annual-interest`
- `#statcard-cumulative-return` → `#statcard-total-returns`

### Key Code Changes

**index.tsx - Stat Cards:**
```typescript
{
  title: "Staked MBTs",
  footerLine1: "Your locked investment",
  footerLine2: "Earning returns over time"
},
{
  title: "Annual Interest",
  footerLine1: "Claimable yearly earnings",
  footerLine2: "Fixed annual yield accrued"
},
{
  title: "Total Returns (5Y)",
  footerLine1: "Total interest at maturity",
  footerLine2: "5-year projection with compounding"
}
```

**_app.tsx - User Tour:**
```typescript
{
  selector: "#statcard-staked-mbts",
  title: "Staked MBTs",
  content: "Your locked investment converted from crypto..."
},
{
  selector: "#statcard-annual-interest",
  title: "Annual Interest",
  content: "Your claimable yearly earnings from the fixed annual yield..."
},
{
  selector: "#statcard-total-returns",
  title: "Total Returns (5Y)",
  content: "Cumulative interest claimable at investment maturity..."
}
```

## Benefits

### ✅ User Experience
- **Eliminates Confusion**: "Annual Interest" cannot be mistaken for wallet balance
- **Industry Standard**: "Staked" is familiar terminology in crypto/DeFi
- **Explicit Timeframes**: "5Y" makes the projection period immediately clear
- **Consistent Language**: All labels now align with their descriptions

### ✅ Clarity
- **What it is**: "Staked MBTs" - your investment
- **What you earn yearly**: "Annual Interest" - yearly returns
- **What you earn total**: "Total Returns (5Y)" - complete projection

### ✅ Scalability
If investment terms change (e.g., 3-year or 10-year options), the pattern `Total Returns (XY)` is flexible and clear.

## User Impact
Users will now immediately understand:
1. **Staked MBTs** = My locked investment amount
2. **Annual Interest** = What I earn each year (not tokens in my wallet!)
3. **Total Returns (5Y)** = What I'll earn over the full 5-year term

No behavioral changes to the application - purely a labeling improvement for clarity.

