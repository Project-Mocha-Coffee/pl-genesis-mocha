# Email Setup Guide for Investment Agreements

**Status**: ⚠️ **Email Sending Not Configured Yet**  
**Current**: API endpoint created, but email service not connected

---

## 🎯 Current Status

### **What Works Now** ✅:
- ✅ Email address collected from users
- ✅ Email stored in localStorage
- ✅ Agreement downloads to user's device
- ✅ API endpoint created (`/api/send-agreement`)
- ✅ Frontend calls API endpoint

### **What Doesn't Work Yet** ⚠️:
- ❌ **No actual email is sent**
- ❌ Email service not configured
- ❌ API just logs to console

---

## 📧 How to Enable Email Sending

You have **3 options** to send emails. Choose one:

---

## 🚀 **Option 1: Resend (RECOMMENDED)**

**Why**: Modern, simple, great developer experience

### **Step 1: Sign up for Resend**
1. Go to https://resend.com
2. Sign up (free tier: 100 emails/day, 3,000/month)
3. Verify your email
4. Get your API key from dashboard

### **Step 2: Install Resend**
```bash
cd /Users/mac/Documents/Work/Code/cursor/portal-main
npm install resend
```

### **Step 3: Add API Key to .env.local**
```bash
# Add this line to your .env.local file
RESEND_API_KEY=re_123abc456def789...
```

### **Step 4: Uncomment Resend Code**

Edit `/src/pages/api/send-agreement.ts`:

```typescript
// Uncomment lines 18-33 (the Resend section)
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Mocha Coffee <legal@mochacoffee.com>',
  to: email,
  subject: 'Mocha Investment Agreement - Confirmation',
  html: `
    <h2>Investment Agreement Confirmation</h2>
    <p>Thank you for signing the Mocha Coffee Investment Agreement.</p>
    <p><strong>Wallet Address:</strong> ${address}</p>
    <p><strong>Date:</strong> ${new Date(timestamp).toLocaleString()}</p>
    <p><strong>Agreement Version:</strong> ${agreementVersion}</p>
    <p>A copy of your signed agreement has been downloaded to your device.</p>
    <p>For questions, contact: <a href="mailto:legal@mochacoffee.com">legal@mochacoffee.com</a></p>
  `,
});
```

### **Step 5: Verify Domain (For Production)**

For production emails, add your domain in Resend dashboard:
1. Go to Resend Dashboard → Domains
2. Add `mochacoffee.com`
3. Add DNS records they provide
4. Wait for verification
5. Change `from:` to `legal@mochacoffee.com`

### **Step 6: Test**
```bash
npm run dev
```

Sign the agreement with your real email → You should receive an email!

---

## 📮 **Option 2: SendGrid**

**Why**: Industry standard, reliable

### **Step 1: Sign up for SendGrid**
1. Go to https://sendgrid.com
2. Sign up (free tier: 100 emails/day)
3. Verify your email and account
4. Create an API key

### **Step 2: Install SendGrid**
```bash
npm install @sendgrid/mail
```

### **Step 3: Add API Key**
```bash
# Add to .env.local
SENDGRID_API_KEY=SG.abc123...
```

### **Step 4: Uncomment SendGrid Code**

Edit `/src/pages/api/send-agreement.ts`:

```typescript
// Uncomment lines 35-45 (the SendGrid section)
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: email,
  from: 'legal@mochacoffee.com', // Must be verified in SendGrid
  subject: 'Mocha Investment Agreement - Confirmation',
  html: `
    <h2>Investment Agreement Signed</h2>
    <p>Wallet: ${address}</p>
    <p>Date: ${new Date(timestamp).toLocaleString()}</p>
  `,
});
```

### **Step 5: Verify Sender**
In SendGrid dashboard:
1. Go to Settings → Sender Authentication
2. Verify your email or domain
3. Use verified email in `from:` field

---

## 🔧 **Option 3: Nodemailer (Self-Hosted)**

**Why**: Free, but requires SMTP server

### **Step 1: Install Nodemailer**
```bash
npm install nodemailer
```

### **Step 2: Get SMTP Credentials**

You need an SMTP server. Options:
- **Gmail**: Use app password (not recommended for production)
- **AWS SES**: Amazon's email service
- **Your hosting provider**: Often includes SMTP

### **Step 3: Add SMTP Credentials**
```bash
# Add to .env.local
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
```

### **Step 4: Uncomment Nodemailer Code**

Edit `/src/pages/api/send-agreement.ts`:

```typescript
// Uncomment lines 47-64 (the Nodemailer section)
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

await transporter.sendMail({
  from: 'legal@mochacoffee.com',
  to: email,
  subject: 'Mocha Investment Agreement',
  html: `<p>Agreement signed for ${address}</p>`,
});
```

---

## 🧪 Testing Email Setup

### **Local Testing**:
1. Restart dev server: `npm run dev`
2. Go to http://localhost:3000
3. Sign in
4. Try to swap or invest
5. Sign agreement with your **real email**
6. Check your inbox (and spam folder!)

### **Check Console**:
```bash
# Dev server console should show:
Agreement signed: { 
  email: 'your@email.com', 
  address: '0x123...', 
  timestamp: 1730592000000 
}
```

### **If Email Doesn't Arrive**:
1. ✅ Check spam folder
2. ✅ Check API key is correct
3. ✅ Check email is verified (Resend/SendGrid)
4. ✅ Check console for errors
5. ✅ Verify `.env.local` has correct values

---

## 🚀 Deployment Considerations

### **For Vercel Deployment**:

1. **Add Environment Variables** in Vercel Dashboard:
   ```
   Settings → Environment Variables
   
   Add:
   - RESEND_API_KEY (or SENDGRID_API_KEY)
   - Any other email service credentials
   ```

2. **Redeploy**:
   ```bash
   git push
   ```

3. **Test on Production**:
   - Use real email addresses
   - Check email delivery
   - Monitor API logs in Vercel dashboard

### **Environment Variables Needed**:

| Variable | Service | Where to Get |
|----------|---------|--------------|
| `RESEND_API_KEY` | Resend | https://resend.com/api-keys |
| `SENDGRID_API_KEY` | SendGrid | https://app.sendgrid.com/settings/api_keys |
| `SMTP_HOST` | Nodemailer | Your SMTP provider |
| `SMTP_USER` | Nodemailer | Your SMTP provider |
| `SMTP_PASS` | Nodemailer | Your SMTP provider |

---

## 💰 Cost Comparison

| Service | Free Tier | Paid Plans | Best For |
|---------|-----------|------------|----------|
| **Resend** | 100/day, 3K/month | $20/mo for 50K | Modern apps, startups |
| **SendGrid** | 100/day | $15/mo for 50K | Enterprise, reliability |
| **Nodemailer** | Free (if have SMTP) | SMTP costs | DIY, flexibility |

---

## 📋 Checklist

Before going to production:

- [ ] Choose email service (Resend recommended)
- [ ] Sign up and get API key
- [ ] Install npm package
- [ ] Add API key to `.env.local`
- [ ] Uncomment appropriate code section
- [ ] Test locally with real email
- [ ] Verify domain (for production)
- [ ] Add env vars to Vercel
- [ ] Test on production
- [ ] Monitor email delivery rates

---

## 🔗 Useful Links

### **Resend**:
- Website: https://resend.com
- Docs: https://resend.com/docs
- Pricing: https://resend.com/pricing

### **SendGrid**:
- Website: https://sendgrid.com
- Docs: https://docs.sendgrid.com
- Pricing: https://sendgrid.com/pricing

### **Nodemailer**:
- Website: https://nodemailer.com
- Docs: https://nodemailer.com/about

---

## 🐛 Troubleshooting

### **Problem: "Email not received"**
- Check spam folder
- Verify API key is correct
- Check console for errors
- Ensure email address is valid

### **Problem: "API key invalid"**
- Double-check `.env.local` spelling
- Restart dev server after adding env vars
- Ensure no extra spaces in API key

### **Problem: "From address not verified"**
- Verify domain in email service dashboard
- Use verified email address in `from:` field
- Check sender authentication settings

### **Problem: "Rate limit exceeded"**
- Check free tier limits
- Upgrade plan if needed
- Implement email queuing

---

## 💡 Current Workaround

**Until you set up email**:
1. ✅ Agreement **downloads** automatically (.txt file)
2. ✅ User gets immediate copy
3. ✅ Email address is **stored** in localStorage
4. ✅ You can manually email users later if needed

**Users get**:
- Downloaded agreement copy
- Success confirmation
- Can proceed with investment

**You're legally covered** because users get the agreement immediately via download!

---

## 🎯 Recommended: Use Resend

**Why Resend**:
1. ✅ Super easy setup (5 minutes)
2. ✅ Modern API
3. ✅ Great free tier
4. ✅ React components available
5. ✅ Perfect for Next.js

**Quick Start**:
```bash
npm install resend
# Add RESEND_API_KEY to .env.local
# Uncomment Resend code
# Done!
```

---

**Need help?** The code is already written - just need to choose and configure an email service! 🚀

