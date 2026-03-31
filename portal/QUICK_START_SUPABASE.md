# Quick Start: Supabase Email Capture

**Goal**: Capture email notifications for Card & M-Pesa payments in Supabase database

---

## ⚡ 5-Minute Setup

### **Step 1: Create Supabase Table** (2 min)

1. Go to [supabase.com](https://supabase.com) → Your Project
2. Click "SQL Editor" → "New Query"
3. Paste this SQL and click "Run":

```sql
CREATE TABLE IF NOT EXISTS payment_notifications (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  payment_method VARCHAR(10) NOT NULL CHECK (payment_method IN ('card', 'mpesa')),
  wallet_address VARCHAR(42),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(email, payment_method)
);

CREATE INDEX idx_payment_notifications_email ON payment_notifications(email);
CREATE INDEX idx_payment_notifications_payment_method ON payment_notifications(payment_method);

ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts" ON payment_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated reads" ON payment_notifications
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates" ON payment_notifications
  FOR UPDATE USING (auth.role() = 'authenticated');
```

### **Step 2: Get Credentials** (1 min)

1. In Supabase, go to "Project Settings" → "API"
2. Copy:
   - **Project URL**
   - **Anon Public Key**

### **Step 3: Add to .env.local** (1 min)

Add these lines to `/Users/mac/Documents/Work/Code/cursor/portal-main/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### **Step 4: Restart Dev Server** (30 sec)

```bash
# Stop current server (Ctrl+C if running)
npm run dev
```

### **Step 5: Test It** (30 sec)

1. Go to `http://localhost:3002`
2. Click "Card" or "M-Pesa" payment method
3. Enter your email → Click "Notify Me"
4. See success message: ✅ "Email saved!"
5. Check Supabase → "Table Editor" → `payment_notifications`
6. Your email should appear!

---

## ✅ What's Changed

| Component | Change |
|-----------|--------|
| **Supabase Client** | Created `src/lib/supabase.ts` |
| **API Route** | Created `src/pages/api/save-payment-notification.ts` |
| **Swap Component** | Updated `handleNotify` to call API |
| **Package** | Installed `@supabase/supabase-js` ✅ |

---

## 📊 View Your Data

### **Supabase Dashboard**:
1. Go to your project
2. Click "Table Editor"
3. Select `payment_notifications`
4. See all signups!

### **Export to CSV**:
1. Click "Download" button
2. Choose CSV format
3. Open in Excel/Google Sheets

---

## 🎯 What Happens Now

**User Flow**:
```
1. User selects Card/M-Pesa
2. User enters email
3. User clicks "Notify Me"
4. ✅ Email saved to Supabase
5. Success toast shown
6. You can now contact them when payment goes live!
```

**Duplicate Prevention**:
- Same email for same payment method = Shows "already on list"
- Same email for different payment method = Creates new entry

---

## 📧 When Payment Goes Live

### **Get Emails to Notify**:
```sql
SELECT email, payment_method, created_at
FROM payment_notifications
WHERE notified = false
  AND payment_method = 'card'  -- or 'mpesa'
ORDER BY created_at ASC;
```

### **Mark as Notified**:
```sql
UPDATE payment_notifications
SET notified = true, notified_at = NOW()
WHERE payment_method = 'card' AND notified = false;
```

---

## 🔧 Troubleshooting

**"Failed to save email"**:
- Check `.env.local` has correct Supabase credentials
- Restart dev server after adding credentials

**Not seeing data in Supabase**:
- Check browser console for errors
- Verify table was created correctly
- Check RLS policies are active

**"Error: Invalid API key"**:
- Double-check you copied the **Anon/Public key**, not Service Role key
- Verify no extra spaces in `.env.local`

---

## 🚀 Production Deployment

### **Vercel**:
1. Go to project settings
2. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redeploy

---

## 📚 Full Documentation

For detailed info, see: `SUPABASE_EMAIL_CAPTURE_SETUP.md`

---

**Ready?** Start with Step 1 above! 🚀

