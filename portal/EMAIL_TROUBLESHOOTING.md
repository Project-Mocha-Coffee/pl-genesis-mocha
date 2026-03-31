# Email Troubleshooting Guide

## ✅ Current Status

- `RESEND_API_KEY` is set in Vercel ✅
- Enhanced error logging added ✅
- Better error handling implemented ✅

## 🔍 How to Debug Email Issues

### Step 1: Check Vercel Function Logs

1. Go to: https://vercel.com/project-mocha/portal-main
2. Click on the **latest deployment**
3. Click **"Functions"** tab
4. Click on `/api/send-agreement`
5. Click **"Logs"** tab
6. Look for these log messages:

**Success indicators:**
- `📧 Attempting to send agreement email`
- `📧 Resend API response: { hasError: false, hasData: true }`
- `✅ Email sent successfully: { emailId: "..." }`

**Error indicators:**
- `❌ RESEND_API_KEY is not set` → Add API key to Vercel
- `❌ Resend API error:` → Check error details below
- `❌ Unexpected Resend response format` → API response issue

### Step 2: Check Resend Dashboard

1. Go to: https://resend.com/emails
2. Check **"Recent Sends"** section
3. Look for your email:
   - **Status**: Delivered, Bounced, Failed, etc.
   - **Recipient**: Your email address
   - **Subject**: "Mocha Investment Agreement - Confirmation"

**Common Statuses:**
- ✅ **Delivered**: Email was sent successfully
- ⚠️ **Bounced**: Email address is invalid or blocked
- ❌ **Failed**: Check error message in Resend dashboard
- ⏳ **Pending**: Email is queued for sending

### Step 3: Check Resend API Key

1. Go to: https://resend.com/api-keys
2. Verify your API key is **Active**
3. Check **Usage Limits**:
   - Free tier: 100 emails/day
   - If limit reached, upgrade plan

### Step 4: Verify From Address

The code uses:
- `RESEND_FROM` environment variable (if set)
- Or falls back to: `Mocha Coffee <onboarding@resend.dev>`

**For testing:** `onboarding@resend.dev` works without domain verification

**For production:** You need to:
1. Verify your domain in Resend: https://resend.com/domains
2. Add DNS records (SPF, DKIM)
3. Set `RESEND_FROM` to: `Project Mocha <no-reply@yourdomain.com>`

## 🐛 Common Issues & Solutions

### Issue 1: "Invalid API key" (401 error)
**Solution:**
- Verify API key in Vercel matches Resend dashboard
- Regenerate API key if needed
- Redeploy after updating

### Issue 2: "API key does not have permission" (403 error)
**Solution:**
- Check API key permissions in Resend
- Ensure key has "Send Email" permission
- Create new API key if needed

### Issue 3: "Invalid email configuration" (validation_error)
**Solution:**
- Check `RESEND_FROM` format: `Name <email@domain.com>`
- Verify domain is verified in Resend (if using custom domain)
- Use `onboarding@resend.dev` for testing

### Issue 4: Email not received (but shows "Delivered" in Resend)
**Solution:**
- Check spam/junk folder
- Check email filters
- Verify email address is correct
- Wait 1-2 minutes (delivery can be delayed)

### Issue 5: "Unexpected response format"
**Solution:**
- Check Resend API version compatibility
- Verify `resend` package version: `npm list resend`
- Check Vercel logs for full error details

## 📊 Testing Checklist

- [ ] `RESEND_API_KEY` set in Vercel
- [ ] API key is active in Resend dashboard
- [ ] Test agreement signing in app
- [ ] Check Vercel function logs
- [ ] Check Resend dashboard for email status
- [ ] Check inbox (and spam folder)
- [ ] Verify email address is correct

## 🚀 Next Steps After Fix

1. **Test the fix:**
   - Sign investment agreement
   - Check Vercel logs immediately
   - Check Resend dashboard

2. **If still not working:**
   - Share Vercel log output
   - Share Resend dashboard screenshot
   - Check API key usage limits

3. **For production:**
   - Verify your domain in Resend
   - Set `RESEND_FROM` with verified domain
   - Test with production email

## 📞 Support Resources

- Resend Dashboard: https://resend.com/emails
- Resend API Docs: https://resend.com/docs
- Vercel Logs: https://vercel.com/project-mocha/portal-main

