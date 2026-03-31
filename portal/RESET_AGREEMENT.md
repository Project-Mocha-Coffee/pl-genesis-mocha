# How to Reset Investment Agreement

## Quick Reset Methods

### Method 1: Browser Console (Easiest)

1. **Open Browser Console:**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Go to **Console** tab

2. **Run this command:**
   ```javascript
   // Get your wallet address first
   const address = window.ethereum?.selectedAddress || 'YOUR_ADDRESS_HERE';
   
   // Clear the agreement
   localStorage.removeItem(`mocha_agreement_${address}`);
   
   // Reload the page
   window.location.reload();
   ```

3. **Or use this simpler version (if wallet is connected):**
   ```javascript
   // Clear all agreement entries
   Object.keys(localStorage).forEach(key => {
     if (key.startsWith('mocha_agreement_')) {
       localStorage.removeItem(key);
     }
   });
   window.location.reload();
   ```

### Method 2: Development Reset Button

If you're running the app in development mode (`npm run dev`), a **"🔄 Reset Agreement (Dev)"** button will appear in the bottom-right corner when you have an agreement signed.

Just click it to reset!

### Method 3: Clear All LocalStorage

1. Open Browser Console (`F12`)
2. Run:
   ```javascript
   localStorage.clear();
   window.location.reload();
   ```
   
   ⚠️ **Warning:** This clears ALL localStorage data, not just the agreement.

### Method 4: Manual Browser Settings

1. Open Browser DevTools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage**
4. Find your site's domain
5. Look for key: `mocha_agreement_YOUR_ADDRESS`
6. Right-click → **Delete**
7. Reload the page

## After Resetting

Once reset, the agreement modal will appear again when you:
- Click "Invest Now" button
- Click "Buy More" on any farm
- Try to invest in a tree

## Agreement Storage

The agreement is stored in localStorage with the key format:
```
mocha_agreement_0xYourWalletAddress
```

This ensures each wallet address has its own agreement status.

