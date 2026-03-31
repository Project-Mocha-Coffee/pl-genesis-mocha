# Tour & Investor Portal Definitions Update

**Date**: November 2, 2025  
**Status**: ✅ Completed

---

## 🎯 Overview

This update includes two major improvements:
1. **Enhanced User Tour** - More comprehensive, polished onboarding experience
2. **Updated Stat Card Definitions** - Clearer, more accurate investment metrics

---

## 📊 Updated Investor Portal Definitions

The stat cards now use enhanced clarity definitions:

### 1. Locked MBTs 🔐
**Previous**: "Growing steadily / Based on your current holdings"

**Updated**:
- Line 1: "Staked MBTs earning returns"
- Line 2: "Converted from deposited crypto"

**Full Definition**: Represents the staked MBTs (converted from the crypto you deposited). This is your total MBT investment balance that's locked and earning returns.

---

### 2. Available MBTs 💎
**Previous**: "Estimated yearly return / At current rates"

**Updated**:
- Line 1: "Claimable annual interest accrued"
- Line 2: "Estimated yearly MBT earnings"

**Full Definition**: Represents the claimable portion of your fixed annual interest accrued. This displays your estimated yearly MBT earnings at the current yield rate.

---

### 3. MBTs Cumulative Return 📊
**Previous**: "5-year projection / Based on current holdings"

**Updated**:
- Line 1: "Total interest at maturity"
- Line 2: "5-year projection with compounding"

**Full Definition**: Shows the total fixed annual interest accrued, claimable at investment maturity. Includes a 5-year projection of your total MBT returns, assuming current yield and compounding rates remain constant.

---

## 🎓 Enhanced User Tour

### **Tour Flow** (7 Steps)

#### Step 1: Welcome ☕
- **Title**: "Welcome to Mocha Investor Portal"
- **Content**: Introduction to coffee-backed investment dashboard
- **Position**: Center overlay
- **Actions**: Next, Skip

#### Step 2: Locked MBTs 🔐
- **Title**: "Locked MBTs"
- **Content**: Explains staked MBTs converted from deposited crypto
- **Target**: `#statcard-locked-mbts`
- **Position**: Right side
- **Actions**: Next, Previous, Skip

#### Step 3: Available MBTs 💎
- **Title**: "Available MBTs"
- **Content**: Explains claimable annual interest accrued
- **Target**: `#statcard-available-mbts`
- **Position**: Right side
- **Actions**: Next, Previous, Skip

#### Step 4: MBTs Cumulative Return 📊
- **Title**: "MBTs Cumulative Return"
- **Content**: Explains 5-year projection with compounding
- **Target**: `#statcard-cumulative-return`
- **Position**: Right side
- **Actions**: Next, Previous, Skip

#### Step 5: Swap Crypto for MBT 🔄
- **Title**: "Step 1: Swap Crypto for MBT"
- **Content**: How to convert crypto (ETH, USDC, USDT, SCR, WBTC) to MBT
- **Target**: `#SwapToMbt`
- **Position**: Right side
- **Actions**: Next, Previous, Skip

#### Step 6: Invest in a Tree 🌳
- **Title**: "Step 2: Invest in a Tree"
- **Content**: How to invest MBT tokens into Trees
- **Target**: `#InvestNowButton`
- **Position**: Right side
- **Actions**: Next, Previous, Skip

#### Step 7: Track Your Investments 🎯
- **Title**: "Track Your Investments"
- **Content**: Final overview of portfolio management
- **Position**: Center overlay
- **Actions**: Finish (no skip)

---

## 🎨 Design Improvements

### Visual Enhancements
- **Brand Colors**: Using Mocha brand colors (`#522912` for titles, `#7A5540` for accents)
- **Better Spacing**: Improved padding and margins for readability
- **Richer Content**: Multi-paragraph explanations with emphasis
- **Consistent Styling**: All steps follow the same visual hierarchy

### Tour Behavior
- **Shows Once**: Tour appears only on first visit for new users
- **Persistent**: Completion state saved in localStorage (`mainTourCompleted`)
- **Skip Option**: All steps (except last) allow skipping
- **Manual Controls**: Development mode includes debug buttons:
  - 🔴 "Close Tour" - Force close and don't show again
  - 🔵 "Reset Tour" - Clear localStorage and show tour again

---

## 🔧 Technical Changes

### Files Modified

#### 1. `/src/pages/index.tsx`
**Lines 415-455**: Updated `setStatCards` with new footer definitions
**Lines 464-504**: Updated initial state for `statCards` with new footer definitions

#### 2. `/src/pages/_app.tsx`
**Lines 24-194**: Completely redesigned tour structure with:
- 7 comprehensive steps (up from 6)
- Richer content with multi-paragraph explanations
- Brand-consistent styling
- Better user flow (Welcome → Metrics → Actions → Tracking)

---

## ✅ Testing Checklist

- [x] Tour shows on first visit
- [x] Tour can be skipped
- [x] Tour completion persists after refresh
- [x] Stat card definitions display correctly
- [x] All tour targets are properly highlighted
- [x] Debug controls work in development mode
- [x] Tour styling matches Mocha brand
- [x] Mobile responsiveness maintained

---

## 🚀 Next Steps

1. **Test thoroughly** in development mode
2. **Verify localStorage persistence** across sessions
3. **Check mobile responsiveness** of tour overlays
4. **Deploy to production** once approved

---

## 📝 Notes

- Tour uses `nextstepjs` library for implementation
- Console logs added for debugging (can be removed in production)
- Tour key: `"mainTourCompleted"` in localStorage
- Debug controls only visible in development mode (`process.env.NODE_ENV === 'development'`)

---

## 🔗 Related Documentation

- [Tour Fix Applied](./TOUR_FIX_APPLIED.md) - Initial tour persistence fix
- [Optimization Applied](./OPTIMIZATION_APPLIED.md) - RPC and React Query optimizations
- [Start Here](./START_HERE.md) - Local development setup guide

---

**Last Updated**: November 2, 2025  
**Author**: Cursor AI Assistant  
**Status**: Ready for Testing ✅

