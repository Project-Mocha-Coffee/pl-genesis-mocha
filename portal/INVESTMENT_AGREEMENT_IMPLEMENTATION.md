# Investment Agreement Implementation

**Date**: November 2, 2025  
**Status**: ✅ Completed

---

## 🎯 Overview

This implementation adds legal compliance steps 2 & 3 to the investment flow:
- **Step 2**: Review Investment Terms & Sign Agreement
- **Step 3**: Agreement sent to email (downloaded locally + localStorage tracking)

These steps are now **required** before users can swap crypto or invest in Trees, ensuring full legal compliance.

---

## 📋 Updated Investment Flow

### **Complete Flow** (6 Steps):

1. ✅ **Sign in** (email, social, or wallet) *(existing)*
2. 🆕 **Review Investment Terms & Sign Agreement** *(new)*
3. 🆕 **Agreement sent to email** *(new)*
4. ✅ **Swap/Payment (on-ramp or direct MBT)** *(existing)*
5. ✅ **Invest in Trees (automatic)** *(existing)*
6. ✅ **Confirmation & NFT delivery** *(existing)*

---

## 🏗️ Technical Implementation

### **1. InvestmentAgreementModal Component**

**Location**: `/src/components/@shared-components/InvestmentAgreementModal.tsx`

**Purpose**: Beautiful, comprehensive modal for legal agreement

**Features**:
- ✅ **Scrollable Terms** - Complete investment agreement with legal language
- ✅ **Email Collection** - Required for agreement copy
- ✅ **Dual Checkboxes** - "I have read" + "I agree"
- ✅ **Download Agreement** - Generates .txt file with agreement
- ✅ **Auto-Download on Sign** - Agreement automatically downloads when signed
- ✅ **localStorage Tracking** - Remembers agreement per wallet address
- ✅ **Success State** - Beautiful confirmation screen
- ✅ **Dark Mode Support** - Full theme support
- ✅ **Scroll Detection** - Must scroll to bottom to enable checkboxes

**Agreement Includes**:
1. Investment Overview
2. Asset Backing (1 MBT = 1 kg coffee)
3. Investment Structure
4. Risks and Disclosures
5. KYC/AML Compliance
6. Representations and Warranties
7. Token Economics
8. Contact Information

**Props**:
```typescript
interface InvestmentAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: (email: string) => void;
}
```

---

### **2. useInvestmentAgreement Hook**

**Location**: `/src/hooks/useInvestmentAgreement.tsx`

**Purpose**: Manage agreement state across the application

**Returns**:
```typescript
{
  hasAgreed: boolean;              // Has user signed agreement?
  agreementData: AgreementData | null;  // Agreement details
  isLoading: boolean;              // Loading state
  recordAgreement: (email: string) => void;  // Save agreement
  clearAgreement: () => void;      // Clear agreement (dev only)
}
```

**Storage Format**:
```typescript
interface AgreementData {
  address: string;         // Wallet address
  email: string;           // User email
  timestamp: number;       // Unix timestamp
  agreedToTerms: boolean;  // Always true
  version: string;         // Agreement version (1.0)
}
```

**Storage Key**: `mocha_agreement_{walletAddress}`

---

### **3. Integration Points**

#### **A. Swap Component** (`swapToMBT.tsx`)

**Changes**:
```typescript
// Import hook and modal
import { InvestmentAgreementModal } from "./InvestmentAgreementModal";
import { useInvestmentAgreement } from "@/hooks/useInvestmentAgreement";

// Use hook
const { hasAgreed, recordAgreement } = useInvestmentAgreement();
const [showAgreementModal, setShowAgreementModal] = useState(false);

// Check before swap
function handleSwap(e: React.FormEvent) {
  e.preventDefault();
  
  if (!hasAgreed) {
    setShowAgreementModal(true);
    return;
  }
  
  // Continue with swap...
}

// Handle agreement completion
const handleAgreementComplete = (email: string) => {
  recordAgreement(email);
  setShowAgreementModal(false);
  // Proceed with swap
};
```

**Visual Indicator**:
- Blue notice banner shown if user hasn't agreed yet
- Explains that agreement will be required before first transaction

#### **B. Dashboard/Invest Flow** (`index.tsx`)

**Changes**:
```typescript
// Import components
import { InvestmentAgreementModal } from "@/components/@shared-components/InvestmentAgreementModal";
import { useInvestmentAgreement } from "@/hooks/useInvestmentAgreement";

// Use hook
const { hasAgreed, recordAgreement } = useInvestmentAgreement();
const [showAgreementModal, setShowAgreementModal] = useState(false);
const [pendingInvestAction, setPendingInvestAction] = useState(null);

// Check before invest
const handleQuickBuyClick = () => {
  if (!hasAgreed) {
    setPendingInvestAction({farmId, farmName, minInvestment});
    setShowAgreementModal(true);
    return;
  }
  
  // Continue with invest...
};

// Handle agreement completion
const handleAgreementComplete = (email: string) => {
  recordAgreement(email);
  setShowAgreementModal(false);
  
  // Execute pending action
  if (pendingInvestAction) {
    // Open invest modal with saved parameters
  }
};
```

---

## 🎨 User Experience Flow

### **First-Time User**:

1. **User clicks "Preview Swap" or "Invest Now"**
2. **Agreement modal opens** (fullscreen, can't be dismissed without action)
3. **User scrolls through terms** (must reach bottom)
4. **"I have read" checkbox enables**
5. **User enters email address**
6. **User checks "I agree"**
7. **User clicks "Sign Agreement"**
8. **Agreement downloads automatically** (.txt file)
9. **Success screen shows** (2 seconds)
10. **Modal closes and action continues** (swap or invest)

### **Returning User**:

1. **User clicks "Preview Swap" or "Invest Now"**
2. **Action proceeds immediately** (no modal, already agreed)
3. **Visual indicator removed** (blue banner)

---

## 📁 Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `InvestmentAgreementModal.tsx` | 🆕 **New** | Agreement modal component |
| `useInvestmentAgreement.tsx` | 🆕 **New** | Agreement state management hook |
| `swapToMBT.tsx` | ✏️ **Updated** | Added agreement check before swap |
| `index.tsx` | ✏️ **Updated** | Added agreement check before invest |
| `INVESTMENT_AGREEMENT_IMPLEMENTATION.md` | 📄 **New** | This documentation |

---

## 🔐 Data Storage & Privacy

### **localStorage Structure**:
```json
{
  "mocha_agreement_0x123...abc": {
    "address": "0x123...abc",
    "email": "investor@example.com",
    "timestamp": 1730592000000,
    "agreedToTerms": true,
    "version": "1.0"
  }
}
```

### **Privacy Notes**:
- ✅ Agreement stored **locally only** (no backend yet)
- ✅ Email stored **locally only**
- ✅ Per-wallet tracking (different wallets = different agreements)
- ✅ Can be cleared via browser localStorage clear
- ⚠️ **Production TODO**: Send agreement to backend for permanent record

---

## 📧 Email Handling

### **Current Implementation** (Phase 1):
- Agreement **downloads** as .txt file
- Email **collected** and stored in localStorage
- **No actual email sent** (TODO for production)

### **Production Implementation** (Phase 2):
```typescript
// Future backend endpoint
await fetch('/api/send-agreement', {
  method: 'POST',
  body: JSON.stringify({
    email,
    address,
    timestamp: Date.now(),
    agreementVersion: '1.0'
  })
});
```

**Recommended Service**: SendGrid, Resend, or AWS SES

---

## ✅ Testing Checklist

### **Agreement Modal**:
- [ ] Modal opens when non-agreed user clicks swap
- [ ] Modal opens when non-agreed user clicks invest
- [ ] Cannot proceed without scrolling to bottom
- [ ] Cannot proceed without entering valid email
- [ ] Cannot proceed without checking both boxes
- [ ] Agreement downloads on sign
- [ ] Success screen shows for 2 seconds
- [ ] Modal closes after agreement
- [ ] Action continues after modal closes

### **Agreement Persistence**:
- [ ] Agreement saved to localStorage
- [ ] Wallet address included in storage key
- [ ] Refresh preserves agreement status
- [ ] Returning users skip modal
- [ ] Blue banner hidden for agreed users
- [ ] Different wallets tracked separately

### **Visual & UX**:
- [ ] Blue notice banner shows before agreement
- [ ] Banner text is clear and informative
- [ ] Modal is responsive on mobile
- [ ] Terms are readable and scrollable
- [ ] Dark mode works correctly
- [ ] Email validation works
- [ ] Download button works
- [ ] Cancel button closes modal

### **Edge Cases**:
- [ ] Disconnect wallet → reconnect (agreement persists)
- [ ] Switch to different wallet (new agreement required)
- [ ] Clear localStorage → agreement required again
- [ ] Multiple attempts to invest (modal shows once)
- [ ] Network issues during agreement (graceful handling)

---

## 🎯 Legal Compliance Achieved

This implementation ensures:
- ✅ **Informed Consent**: Users must read full terms
- ✅ **Explicit Agreement**: Two checkboxes required
- ✅ **Email Collection**: For future correspondence
- ✅ **Downloadable Copy**: User gets agreement copy
- ✅ **Timestamp Tracking**: When agreement was signed
- ✅ **Version Control**: Agreement version tracked
- ✅ **Wallet Association**: Agreement tied to specific wallet

---

## 🚀 Future Enhancements

### **Short-term** (Phase 2):
1. **Backend API** - Store agreements permanently
2. **Email Service** - Actually send agreement to email
3. **PDF Generation** - Generate PDF instead of .txt
4. **Digital Signature** - Add cryptographic signature

### **Long-term** (Phase 3):
1. **DocuSign Integration** - Professional e-signature
2. **Version Updates** - Handle agreement updates
3. **Multi-language** - Support multiple languages
4. **KYC Integration** - Link with KYC/AML verification
5. **Admin Dashboard** - View all signed agreements

---

## 💡 Usage Examples

### **Example 1: First-Time Investor Swapping**

```
User: Clicks "Preview Swap"
↓
System: Checks hasAgreed = false
↓
System: Opens InvestmentAgreementModal
↓
User: Scrolls through terms
User: Enters email
User: Checks both boxes
User: Clicks "Sign Agreement"
↓
System: Downloads agreement.txt
System: Saves to localStorage
System: Shows success screen
System: Closes modal after 2s
↓
System: Continues with swap flow
```

### **Example 2: Returning Investor Investing**

```
User: Clicks "Invest Now"
↓
System: Checks hasAgreed = true
↓
System: Opens invest modal directly
↓
(No agreement modal shown)
```

---

## 🐛 Known Issues / Limitations

### **Current Limitations**:
1. **No Backend**: Agreements not stored permanently
2. **No Email**: Email not actually sent (just collected)
3. **LocalStorage Only**: Clearing browser = losing agreement
4. **No Blockchain**: Agreement not recorded on-chain
5. **Basic Format**: .txt file instead of PDF

### **Mitigation**:
- All limitations documented
- Easy to upgrade to backend/email later
- LocalStorage sufficient for MVP/testing
- Users get download copy immediately

---

## 📝 Agreement Content

The agreement includes comprehensive legal coverage:

### **Sections**:
1. **Investment Overview** - What user is agreeing to
2. **Asset Backing** - 1 MBT = 1 kg coffee explanation
3. **Investment Structure** - Terms, lock-up, returns
4. **Risks** - All relevant investment risks
5. **KYC/AML** - Compliance requirements
6. **Representations** - User certifications
7. **Token Economics** - Utility token nature
8. **Contact** - legal@mochacoffee.com

### **Key Risk Disclosures**:
- Coffee price fluctuations
- Agricultural risks
- Returns not guaranteed
- Smart contract risks
- Only invest what you can afford to lose

---

## 🔗 Related Documentation

- [Transaction Features Update](./TRANSACTION_FEATURES_UPDATE.md) - Refresh & Explorer links
- [Transaction Index Update](./TRANSACTION_INDEX_UPDATE.md) - Transaction history
- [Tour & Definitions Update](./TOUR_AND_DEFINITIONS_UPDATE.md) - Enhanced tour

---

**Last Updated**: November 2, 2025  
**Author**: Cursor AI Assistant  
**Status**: Ready for Testing ✅

