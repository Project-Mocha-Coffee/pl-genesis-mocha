# 🔑 How to Export Private Key from Rabby Wallet

## Method 1: Export from Rabby Settings (Recommended)

**Step 1**: Open Rabby Wallet extension

**Step 2**: Click on the **account icon** (top right) or click on your account name

**Step 3**: Go to **Settings** (gear icon)

**Step 4**: Navigate to **Security** or **Advanced** section

**Step 5**: Look for **"Export Private Key"** or **"Show Private Key"**

**Step 6**: Enter your Rabby wallet password to confirm

**Step 7**: Copy the private key

**Step 8**: Remove the `0x` prefix if it has one

**Step 9**: Add to your `.env` file:
```env
PRIVATE_KEY=your_private_key_without_0x
```

---

## Method 2: Using Rabby's Account Menu

**Step 1**: Click on your account name/icon in Rabby

**Step 2**: Look for **"Account Details"** or **"Account Settings"**

**Step 3**: Find **"Export Private Key"** option

**Step 4**: Enter password and copy the key

---

## Method 3: If Above Methods Don't Work

Rabby may use different terminology. Look for:
- "Export Private Key"
- "Show Private Key"
- "View Private Key"
- "Reveal Private Key"
- "Account Details" → "Private Key"

---

## ⚠️ Security Warnings

1. **Never share your private key** with anyone
2. **Never commit it to git** - ensure `.env` is in `.gitignore`
3. **Use a dedicated deployment wallet** - don't use your main wallet
4. **Double-check** you're copying the correct account's private key
5. **Store securely** - consider using a password manager for the key

---

## ✅ After Exporting

1. Copy the private key
2. Remove `0x` prefix if present
3. Add to `.env` file:
   ```env
   PRIVATE_KEY=your_private_key_without_0x
   ```
4. Ensure the wallet has Base ETH for gas fees

---

## 🔍 If You Can't Find Export Option

Some wallets hide this feature. Alternative options:

1. **Check Rabby Documentation**: https://rabby.io/docs
2. **Contact Rabby Support**: They may have specific instructions
3. **Use Seed Phrase**: If Rabby allows exporting seed phrase, you can derive the private key
4. **Create New Wallet**: Generate a fresh wallet just for deployment

---

## 📝 Quick Checklist

- [ ] Opened Rabby wallet
- [ ] Found Settings/Security section
- [ ] Located "Export Private Key" option
- [ ] Entered password
- [ ] Copied private key
- [ ] Removed `0x` prefix (if present)
- [ ] Added to `.env` file
- [ ] Verified wallet has Base ETH

---

**Once exported, you're ready to deploy!** 🚀
