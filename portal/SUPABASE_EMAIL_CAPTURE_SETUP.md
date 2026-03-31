# Supabase Email Capture Setup Guide

**Date**: November 2, 2025  
**Status**: ✅ Completed

---

## 🎯 Overview

This guide explains how to set up Supabase to capture email notifications from users interested in Card and M-Pesa payment methods.

---

## 📋 Prerequisites

- ✅ Supabase account ([supabase.com](https://supabase.com))
- ✅ A Supabase project created
- ✅ Node.js and npm installed
- ✅ `@supabase/supabase-js` package installed (already done)

---

## 🏗️ Step 1: Create Supabase Table

### **1.1 Navigate to SQL Editor**
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### **1.2 Run This SQL**

```sql
-- Create payment_notifications table
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_notifications_email 
ON payment_notifications(email);

CREATE INDEX IF NOT EXISTS idx_payment_notifications_payment_method 
ON payment_notifications(payment_method);

CREATE INDEX IF NOT EXISTS idx_payment_notifications_notified 
ON payment_notifications(notified);

-- Add comment
COMMENT ON TABLE payment_notifications IS 'Stores email addresses of users who want to be notified when card/M-Pesa payments go live';

-- Enable Row Level Security (RLS)
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts from anyone (for signup)
CREATE POLICY "Allow public inserts" ON payment_notifications
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow reads only for authenticated users (for admin)
CREATE POLICY "Allow authenticated reads" ON payment_notifications
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy to allow updates only for authenticated users (for marking as notified)
CREATE POLICY "Allow authenticated updates" ON payment_notifications
  FOR UPDATE
  USING (auth.role() = 'authenticated');
```

### **1.3 Verify Table Creation**

After running the SQL:
1. Go to "Table Editor" in Supabase
2. You should see `payment_notifications` table
3. Check that columns match:
   - `id` (bigint)
   - `email` (varchar)
   - `payment_method` (varchar)
   - `wallet_address` (varchar)
   - `created_at` (timestamptz)
   - `notified` (boolean)
   - `notified_at` (timestamptz)

---

## 🔑 Step 2: Get Supabase Credentials

### **2.1 Find Your Credentials**
1. Go to your Supabase project dashboard
2. Click on "Project Settings" (gear icon)
3. Navigate to "API" section
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJhbGc...`)

### **2.2 Add to Environment Variables**

Open `.env.local` in your project root and add:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Replace with your actual values!

---

## 📁 Step 3: Files Created

The following files have been created/modified:

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client configuration |
| `src/pages/api/save-payment-notification.ts` | API route to save emails to database |
| `src/components/@shared-components/swapToMBT.tsx` | Updated to call API when user submits email |

---

## 🧪 Step 4: Test the Integration

### **4.1 Start Dev Server**
```bash
npm run dev
```

### **4.2 Test Email Capture**

1. Navigate to `http://localhost:3002`
2. Click on "Payment Method" → Select "Card" or "M-Pesa"
3. Enter an email address in the notification form
4. Click "Notify Me"
5. You should see: ✅ "Email saved! You'll be notified when..."

### **4.3 Verify in Supabase**

1. Go to Supabase dashboard
2. Click "Table Editor" → `payment_notifications`
3. You should see your email entry with:
   - Email address
   - Payment method
   - Wallet address (if connected)
   - Created timestamp
   - `notified` = false

### **4.4 Test Duplicate Prevention**

1. Enter the same email again for the same payment method
2. Click "Notify Me"
3. You should see: "You're already on the list!"
4. Check Supabase - no duplicate entry created

---

## 📊 Step 5: View & Export Data

### **5.1 View All Signups**

**SQL Query**:
```sql
SELECT 
  email, 
  payment_method, 
  wallet_address,
  created_at,
  notified
FROM payment_notifications
ORDER BY created_at DESC;
```

### **5.2 Count Signups by Payment Method**

**SQL Query**:
```sql
SELECT 
  payment_method,
  COUNT(*) as signup_count
FROM payment_notifications
GROUP BY payment_method;
```

### **5.3 Export to CSV**

1. Run the query you want to export
2. Click "Download" button (top right of results)
3. Choose CSV format
4. Import into Excel/Google Sheets

---

## 📧 Step 6: Notify Users (When Payment Goes Live)

### **6.1 Get List of Users to Notify**

```sql
SELECT 
  email,
  payment_method,
  created_at
FROM payment_notifications
WHERE notified = false
  AND payment_method = 'card'  -- or 'mpesa'
ORDER BY created_at ASC;
```

### **6.2 Send Notification Emails**

Use the email service of your choice (Resend, SendGrid, etc.):

**Example Email Template**:
```
Subject: 🎉 Card Payments Are Now Live on Mocha!

Hi there!

Great news! The payment method you requested is now available on the Mocha Investor Portal.

You can now invest in coffee-backed assets using your credit/debit card.

Get started: https://portal-rho-lemon.vercel.app/

Thank you for your patience!

Best regards,
The Mocha Team
```

### **6.3 Mark Users as Notified**

After sending emails:
```sql
UPDATE payment_notifications
SET 
  notified = true,
  notified_at = NOW()
WHERE payment_method = 'card'  -- or 'mpesa'
  AND notified = false;
```

---

## 🔐 Step 7: Security Best Practices

### **7.1 Row Level Security (RLS)**

Our table uses RLS with these policies:
- ✅ **Anyone can insert** (for signups)
- ✅ **Only authenticated users can read** (for admin)
- ✅ **Only authenticated users can update** (for marking as notified)

### **7.2 API Key Security**

- ✅ Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for client-side)
- ❌ Never expose `SERVICE_ROLE_KEY` in frontend code
- ✅ Store all keys in `.env.local` (not committed to Git)

### **7.3 Email Validation**

- ✅ Client-side validation (basic format check)
- ✅ Server-side validation (in API route)
- ✅ Duplicate prevention (database constraint)

---

## 📈 Step 8: Analytics & Insights

### **Useful Queries**:

**1. Daily Signups**:
```sql
SELECT 
  DATE(created_at) as date,
  payment_method,
  COUNT(*) as signups
FROM payment_notifications
GROUP BY DATE(created_at), payment_method
ORDER BY date DESC;
```

**2. Recent Signups**:
```sql
SELECT 
  email,
  payment_method,
  wallet_address,
  created_at
FROM payment_notifications
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**3. Total Interest by Payment Method**:
```sql
SELECT 
  payment_method,
  COUNT(*) as total_signups,
  COUNT(DISTINCT email) as unique_emails
FROM payment_notifications
GROUP BY payment_method;
```

**4. Users Interested in Both**:
```sql
SELECT 
  email,
  COUNT(*) as methods_count
FROM payment_notifications
GROUP BY email
HAVING COUNT(*) > 1;
```

---

## 🚀 Step 9: Going to Production

### **9.1 Update Environment Variables**

For production (Vercel):
1. Go to Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Redeploy

### **9.2 Test on Production**

1. Visit your production URL
2. Test email signup flow
3. Verify entries in Supabase

---

## 🛠️ Troubleshooting

### **Issue 1: "Failed to save email"**

**Possible Causes**:
- ❌ Supabase credentials not set in `.env.local`
- ❌ Table not created
- ❌ RLS policies blocking inserts

**Solution**:
1. Check `.env.local` has correct credentials
2. Verify table exists in Supabase
3. Check RLS policy allows inserts

### **Issue 2: "Email already exists" (but shouldn't)**

**Possible Causes**:
- User submitted same email for same payment method before

**Solution**:
- This is expected behavior (duplicate prevention)
- Check Supabase table for existing entry

### **Issue 3: Entries not showing in Supabase**

**Possible Causes**:
- ❌ API route not being called
- ❌ Network error
- ❌ Wrong Supabase project

**Solution**:
1. Open browser DevTools → Network tab
2. Submit email → Check for API call to `/api/save-payment-notification`
3. Check response status and body
4. Verify correct Supabase project URL

---

## 📊 Expected Data Structure

### **Sample Row**:
```json
{
  "id": 1,
  "email": "user@example.com",
  "payment_method": "card",
  "wallet_address": "0x7823...F8795",
  "created_at": "2025-11-02T10:30:00Z",
  "notified": false,
  "notified_at": null
}
```

---

## ✅ Checklist

Before going live, ensure:

- [ ] Supabase table created
- [ ] RLS policies configured
- [ ] Environment variables set in `.env.local`
- [ ] Tested email submission locally
- [ ] Verified data in Supabase
- [ ] Tested duplicate prevention
- [ ] Set up production environment variables (Vercel)
- [ ] Tested on production

---

## 🔗 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 📞 Support

If you need help:
1. Check Supabase logs (Dashboard → Logs)
2. Check browser console for errors
3. Check server logs (`npm run dev` output)

---

**Last Updated**: November 2, 2025  
**Author**: Cursor AI Assistant  
**Status**: Ready to Deploy ✅

