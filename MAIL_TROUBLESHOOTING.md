# Mail Service Troubleshooting Guide

## Quick Checklist Before Deploying to Render

### 1. Gmail App Password Setup
- [ ] Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- [ ] Select **Mail** and **Windows Computer** (or your device)
- [ ] Google will generate a 16-character password
- [ ] Use this password as `GMAIL_APP_PASSWORD` in Render environment variables
- ⚠️ **Do NOT use your regular Gmail password**

### 2. Verify Environment Variables on Render
- [ ] `GMAIL_USER` = `armanmallik168@gmail.com`
- [ ] `GMAIL_APP_PASSWORD` = Your 16-char app password (from step 1)
- [ ] `CLIENT_URL` = `https://ims.osamarahmani.tech`
- [ ] `SERVER_URL` = `https://intern-managment-system.onrender.com`

### 3. Check Render Logs After Deployment
After deploying, check the live logs for:

**✅ Success Signs:**
```
✅ MAIL SERVER READY - Connected to Gmail SMTP
```

**❌ Failure Signs:**
```
❌ EMAIL CONFIG ERROR: Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables
❌ MAIL CONFIG ERROR - Could not connect to Gmail SMTP:
   Error: Invalid login or insufficient permissions
   Code: EAUTH
```

## Debugging Steps

### Step 1: Check Mail Configuration
Visit: `https://intern-managment-system.onrender.com/api/health/mail`

You should see:
```json
{
  "status": "ok",
  "mail": {
    "gmail_user": "✓ Set",
    "gmail_password": "✓ Set",
    "client_url": "✓ https://ims.osamarahmani.tech"
  }
}
```

### Step 2: Test Admin Creation
1. Log in as Super Admin
2. Try creating a new admin
3. Check Render logs for mail errors
4. If mail fails, you'll see:
   - `❌ [MAIL FAILED] Could not send credentials to [email]`
   - The admin is still created, just no email sent

### Step 3: Test Password Reset
1. Click "Forgot Password" on login
2. Check Render logs for:
   - `✅ Password reset email sent to [email]` (success)
   - `❌ Failed to send password reset email` (failure)

## Common Issues & Solutions

### Issue: EAUTH Error (Invalid Credentials)
```
❌ Code: EAUTH
⚠️ Authentication failed
```
**Solution:**
- Verify you're using a Gmail **App Password**, not regular password
- Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- Generate a new app password
- Update `GMAIL_APP_PASSWORD` in Render

### Issue: ETIMEDOUT Error (Connection Timeout)
```
❌ Code: ETIMEDOUT
⚠️ Network/connection error
```
**Solution:**
- This might be Render's outbound firewall blocking SMTP
- Verify `GMAIL_USER` is set correctly
- Try restarting the deployment

### Issue: Missing Environment Variables
```
❌ GMAIL_USER: ✗ NOT SET
❌ GMAIL_APP_PASSWORD: ✗ NOT SET
```
**Solution:**
- Go to Render dashboard → your service → Environment
- Make sure all mail-related vars are set
- Redeploy after updating

## Quick Copy-Paste Checklist
For your Render environment variables:
```
CLIENT_URL=https://ims.osamarahmani.tech
DATABASE_URL=postgresql://ims:vR1BGhQVeaSVoRM5bZMXmCYVAO5wxkNb@dpg-d8ngg5i8qa3s73f3o6dg-a/ims_p5o3
GMAIL_APP_PASSWORD=<Your 16-char app password>
GMAIL_USER=armanmallik168@gmail.com
JWT_EXPIRES_IN=7d
JWT_SECRET=dac2b39348a84def3f6a8e38ba3fdf5bbe441aa80f884804d45181ea7bcc9a76
SERVER_URL=https://intern-managment-system.onrender.com
SUPER_ADMIN_EMAIL=superadmin@company.com
SUPER_ADMIN_NAME=Super Admin
SUPER_ADMIN_PASSWORD=SuperAdmin@123
```

## If Mail Still Doesn't Work

1. Check Render logs: `https://dashboard.render.com/` → select service → Logs
2. Look for "MAIL CONFIG ERROR" messages
3. Verify all email environment variables are exactly correct (no spaces)
4. Try deploying manually instead of auto-deploy
5. Contact Render support if network/firewall issue persists
