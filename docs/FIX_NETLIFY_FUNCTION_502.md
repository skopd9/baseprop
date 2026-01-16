# 🔧 Fix Netlify Function 502 Error - Organization Invitations

## Problem
Getting a **502 Bad Gateway** error when sending organization invitation emails:
```
POST https://base-prop.com/.netlify/functions/send-invitation-email 502 (Bad Gateway)
⚠️ Invitation created but email failed to send: Failed to send email
```

## Root Causes
1. ❌ Environment variables not configured in Netlify
2. ❌ Function not deployed or build failed
3. ❌ Missing dependencies in production

---

## ✅ Solution: Configure Netlify Environment Variables

### Step 1: Get Your Resend API Key

1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Sign in or create a free account
3. Click **"Create API Key"**
4. Name it `baseprop-netlify` or similar
5. Copy the API key (starts with `re_...`)

### Step 2: Set Up Environment Variables in Netlify

1. Go to your Netlify site dashboard: [https://app.netlify.com](https://app.netlify.com)
2. Select your site: **base-prop**
3. Navigate to: **Site settings** → **Environment variables**
4. Add these two variables:

#### Variable 1: RESEND_API_KEY
```
Key: RESEND_API_KEY
Value: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
(Paste your actual Resend API key here)
Scopes: ☑ All scopes
```

#### Variable 2: FROM_EMAIL
```
Key: FROM_EMAIL
Value: noreply@yourdomain.com
(Use onboarding@resend.dev for testing, or your verified domain)
Scopes: ☑ All scopes
```

**Important Notes:**
- For testing, you can use: `onboarding@resend.dev`
- For production, verify your domain in Resend first
- Without a verified domain, you're limited to **3 emails total** (sandbox mode)

### Step 3: Redeploy Your Site

After adding environment variables, you **must** redeploy for them to take effect:

1. Go to **Deploys** tab in Netlify
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for deployment to complete (~2-3 minutes)
4. Check the deploy logs for any errors

---

## 🧪 Test Your Fix

### Option 1: Test via UI
1. Log into your app at https://base-prop.com
2. Go to **Organization Settings**
3. Click **"Invite Member"**
4. Enter an email address and select a role
5. Click **"Send Invitation"**
6. ✅ Should see: "Invitation sent successfully!"

### Option 2: Test via Browser Console
```javascript
// Open browser console (F12) and run:
await fetch('/.netlify/functions/send-invitation-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invitedEmail: 'test@example.com',
    organizationName: 'Test Org',
    inviterName: 'Your Name',
    role: 'member',
    invitationToken: 'test-token-123',
    baseUrl: window.location.origin
  })
}).then(r => r.json()).then(console.log)
```

Expected response:
```json
{
  "success": true,
  "messageId": "xxx-xxx-xxx"
}
```

---

## 🔍 Troubleshooting

### Still Getting 502 Error?

#### 1. Check Netlify Function Logs
1. Go to **Netlify Dashboard** → **Functions** tab
2. Click on `send-invitation-email`
3. Check recent invocations for error messages

#### 2. Verify Environment Variables Are Set
```bash
# In your Netlify function logs, you should NOT see:
# "Missing required fields" or "undefined"
```

#### 3. Check Build Logs
1. Go to **Deploys** tab
2. Click on the latest deploy
3. Look for errors in the build log
4. Ensure `resend` package is installed

#### 4. Verify Resend API Key
Go to Resend dashboard and check:
- ✅ API key is active (not revoked)
- ✅ API key has send permissions
- ✅ FROM_EMAIL matches a verified domain (or use `onboarding@resend.dev`)

### Common Errors and Solutions

| Error | Solution |
|-------|----------|
| `RESEND_API_KEY is not defined` | Add environment variable in Netlify |
| `Invalid API key` | Regenerate API key in Resend dashboard |
| `Email address not verified` | Use `onboarding@resend.dev` or verify your domain |
| `Rate limit exceeded` | You're in sandbox mode - verify your domain |
| `Function timed out` | Check function logs for slow operations |

---

## 🚀 Quick Fix Checklist

- [ ] Created Resend account and API key
- [ ] Added `RESEND_API_KEY` to Netlify environment variables
- [ ] Added `FROM_EMAIL` to Netlify environment variables
- [ ] Triggered a new deploy (clear cache)
- [ ] Waited for deploy to complete
- [ ] Tested sending an invitation
- [ ] Verified email was received

---

## 📧 Email Limits (Free Tier)

### Sandbox Mode (Default)
- **3 emails total** across all time
- Can only send to verified emails
- **Solution:** Verify your domain in Resend

### After Domain Verification
- **100 emails per day**
- **20 emails per 10 seconds**
- Can send to any email address

### To Verify Domain
1. Go to [Resend Domains](https://resend.com/domains)
2. Click **"Add Domain"**
3. Add your domain (e.g., `base-prop.com`)
4. Add DNS records as instructed
5. Wait for verification (usually < 1 hour)

---

## 🎯 Alternative: Local Testing

If you want to test locally before deploying:

### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. Create Local `.env` File
```bash
# .env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=onboarding@resend.dev
```

### 3. Run Functions Locally
```bash
netlify dev
```

This will run your Netlify Functions locally at `http://localhost:8888/.netlify/functions/send-invitation-email`

---

## 📝 Summary

The 502 error occurs because:
1. Netlify Functions need environment variables configured **in Netlify's dashboard**
2. Environment variables in `.env` files or code don't work in production
3. You must redeploy after adding environment variables

**Next Steps:**
1. Add environment variables in Netlify
2. Redeploy your site
3. Test sending an invitation
4. Verify the email is received

---

## 🆘 Still Need Help?

Check these resources:
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Resend Quickstart](https://resend.com/docs/send-with-nodejs)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)

Or check the function logs in Netlify for specific error messages.

