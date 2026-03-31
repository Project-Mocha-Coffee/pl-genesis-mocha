# ElementPay Webhook Secret

## Generated Webhook Secret

**Secret:** `0a2fd3ca1e62856eb0b8e9a58bd2613e329a6535c294add65a8664c2a22e22b6`

⚠️ **IMPORTANT:** Keep this secret secure and never commit it to version control.

## Configuration Steps

### 1. Add to ElementPay Dashboard
Enter this secret in the ElementPay dashboard when creating/updating your API key:
- Go to: `console.elementpay.net/dashboard/api-keys`
- In the "Webhook Secret" field, enter: `0a2fd3ca1e62856eb0b8e9a58bd2613e329a6535c294add65a8664c2a22e22b6`

### 2. Add to Vercel Environment Variables
Add this secret to your Vercel project environment variables:

**Variable Name:** `ELEMENTPAY_WEBHOOK_SECRET`  
**Value:** `0a2fd3ca1e62856eb0b8e9a58bd2613e329a6535c294add65a8664c2a22e22b6`  
**Environment:** Production, Preview, Development

**Steps:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - Name: `ELEMENTPAY_WEBHOOK_SECRET`
   - Value: `0a2fd3ca1e62856eb0b8e9a58bd2613e329a6535c294add65a8664c2a22e22b6`
   - Select all environments (Production, Preview, Development)
3. Click "Save"
4. Redeploy your application for the changes to take effect

### 3. Local Development (Optional)
If testing locally, add to your `.env.local` file:

```bash
ELEMENTPAY_WEBHOOK_SECRET=0a2fd3ca1e62856eb0b8e9a58bd2613e329a6535c294add65a8664c2a22e22b6
```

⚠️ **Note:** `.env.local` should be in `.gitignore` and never committed.

## Security Notes

- This secret is used to verify webhook signatures from ElementPay
- The webhook endpoint will verify signatures using HMAC-SHA256
- If the signature doesn't match, the webhook will be rejected with a 401 error
- Keep this secret confidential and rotate it if compromised

## Verification

After adding the secret to both ElementPay and Vercel:
1. ElementPay will sign webhook payloads with this secret
2. Our webhook endpoint will verify the signature
3. Only webhooks with valid signatures will be processed

## Regenerating the Secret

If you need to regenerate this secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then update both ElementPay dashboard and Vercel environment variables with the new secret.
