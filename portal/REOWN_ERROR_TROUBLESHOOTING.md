# Reown AppKit Server Error Troubleshooting

## Common Causes of "Server Error" in Reown Wallet Modal

### 1. Missing or Invalid Project ID
**Symptom**: Server error when opening wallet modal
**Fix**: Ensure `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is set correctly

**Check:**
```bash
# In your .env.local file
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here
```

**Get a Project ID:**
1. Go to: https://cloud.reown.com/
2. Create a new project or use existing
3. Copy the Project ID
4. Add to `.env.local` and restart dev server

### 2. Network/API Connectivity Issues
**Symptom**: Error when connecting to WalletConnect cloud services
**Fix**: Check network connectivity and firewall settings

**Test:**
- Open browser console (F12)
- Look for network errors to `*.reown.com` or `*.walletconnect.com`
- Check if requests are being blocked

### 3. RPC Endpoint Issues
**Symptom**: Errors when fetching chain data
**Fix**: Verify Scroll RPC endpoint is accessible

**Current Config:**
- RPC URL: `https://rpc.scroll.io`
- Chain ID: `534352`

### 4. Browser/Extension Conflicts
**Symptom**: Modal errors with specific browsers or extensions
**Fix**: 
- Try incognito mode
- Disable browser extensions
- Clear browser cache

## Debugging Steps

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for errors related to:
     - `reown`
     - `walletconnect`
     - `appkit`
   - Check Network tab for failed requests

2. **Verify Environment Variables:**
   ```bash
   # Check if variable is set
   echo $NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
   
   # Or check .env.local
   cat .env.local | grep WALLET_CONNECT
   ```

3. **Test WalletConnect API:**
   - Visit: https://cloud.reown.com/
   - Verify your project is active
   - Check API status page

4. **Check Network Requests:**
   - Open Network tab in DevTools
   - Filter by "reown" or "walletconnect"
   - Look for failed requests (red status)
   - Check response details

## Error Handling Added

The code now includes:
- ✅ Detailed error logging
- ✅ Error boundaries for AppKit initialization
- ✅ Console warnings for missing config
- ✅ Success confirmation logs

## Quick Fixes

### If Project ID is Missing:
```bash
# Add to .env.local
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here
```

### If Still Getting Errors:
1. Clear browser cache
2. Restart dev server
3. Check browser console for specific error
4. Verify Project ID is correct
5. Try different browser/incognito mode

## Contact Support

If issues persist:
- Check Reown docs: https://docs.reown.com/
- Check WalletConnect status: https://status.walletconnect.com/
- Review error logs in browser console

