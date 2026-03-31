# Debug Email Not Received Issue

## 🔍 Step-by-Step Debugging

### Step 1: Check Browser Console

1. **Open the app** and sign the agreement
2. **Open Browser Console** (F12 → Console tab)
3. **Look for these logs:**
   - `📧 Sending agreement email to: your@email.com`
   - `📧 Email API response status: 200` (or error code)
   - `✅ Email sent successfully:` (with email ID)
   - OR `❌ Email sending failed:` (with error details)

### Step 2: Check Vercel Function Logs

1. Go to: https://vercel.com/project-mocha/portal-main
2. Click **latest deployment**
3. Click **"Functions"** tab
4. Click `/api/send-agreement`
5. Click **"Logs"** tab
6. **Look for:**
   - `📧 Attempting to send agreement email:`
   - `📧 Resend API response:`
   - `✅ Email sent successfully:` (with email ID)
   - OR `❌ Resend API error:` (with error details)

### Step 3: Check Resend Dashboard

1. Go to: https://resend.com/emails
2. Check **"Recent Sends"**
3. **Look for your email:**
   - **Status**: Delivered, Failed, Bounced, etc.
   - **Recipient**: Your email address
   - **Subject**: "Mocha Investment Agreement - Confirmation"
   - **Time**: When it was sent

### Step 4: Test Resend API Directly

You can test if Resend is working by calling the test endpoint:

**In Browser Console:**
```javascript
fetch('/api/test-resend', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'your@email.com' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "emailId": "...",
  "from": "Mocha Coffee <onboarding@resend.dev>",
  "to": "your@email.com"
}
```

## 🐛 Common Issues

### Issue 1: Email shows "Delivered" in Resend but not received
**Possible causes:**
- Email in spam/junk folder
- Email filters blocking it
- Delivery delay (can take 1-5 minutes)
- Email address typo

**Solutions:**
- Check spam/junk folder
- Wait 5 minutes
- Verify email address is correct
- Check email filters

### Issue 2: Resend shows "Failed" status
**Check Vercel logs for:**
- `❌ Resend API error:` - Shows specific error
- Common errors:
  - **401**: Invalid API key
  - **403**: API key permissions
  - **validation_error**: Invalid from address

### Issue 3: No email in Resend dashboard
**This means:**
- API call never reached Resend
- Check Vercel logs for errors
- Verify `RESEND_API_KEY` is set correctly
- Check network errors in browser console

### Issue 4: API returns 500 error
**Check Vercel logs for:**
- `❌ RESEND_API_KEY is not set` → Add to Vercel
- `❌ Email sending exception:` → Check error details
- Network timeout → Check Vercel function timeout

## 📊 What to Share for Help

If email still not working, share:

1. **Browser Console Output:**
   - Copy all logs starting with `📧` or `❌`

2. **Vercel Function Logs:**
   - Copy logs from `/api/send-agreement` function

3. **Resend Dashboard Screenshot:**
   - Show recent sends and status

4. **Error Messages:**
   - Any error toasts shown in the app
   - Any error messages in console

## ✅ Quick Checklist

- [ ] `RESEND_API_KEY` set in Vercel
- [ ] Signed agreement in app
- [ ] Checked browser console for logs
- [ ] Checked Vercel function logs
- [ ] Checked Resend dashboard
- [ ] Checked spam folder
- [ ] Waited 5 minutes for delivery
- [ ] Verified email address is correct

