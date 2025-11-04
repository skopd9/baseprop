# 🔧 Fix CORS Issue - Organization Invitation Emails

## ❌ The Problem

You were getting this error:
```
Access to fetch at 'https://api.resend.com/emails' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Why this happened:**
- Resend API cannot be called directly from the browser (client-side)
- This is a security restriction - it would expose your API key in the client code
- CORS (Cross-Origin Resource Sharing) blocks these requests

## ✅ The Solution

**Use a Netlify Function (backend/server-side)** to send emails:
1. Browser calls your Netlify Function
2. Netlify Function calls Resend API (server-side, no CORS)
3. Email gets sent! ✨

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Install Dependencies

```bash
npm install
```

This installs `@netlify/functions` which was added to `package.json`.

### Step 2: Set Environment Variables in Netlify

**Important:** These are **server-side** variables (not `VITE_*`):

Go to: **Netlify Dashboard → Site Settings → Environment Variables**

Add these:
```
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

**Don't use `VITE_RESEND_API_KEY` anymore** - that was for client-side (insecure).

### Step 3: Deploy to Netlify

```bash
git add .
git commit -m "Add Netlify Function for sending invitation emails"
git push
```

Netlify will automatically detect and deploy the function.

### Step 4: Test Locally (Optional)

To test the Netlify Function locally:

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Create .env file for local testing
echo "RESEND_API_KEY=re_your_api_key" > .env
echo "FROM_EMAIL=noreply@yourdomain.com" >> .env

# Run dev server with Netlify Functions
netlify dev
```

This will run your app with Netlify Functions at `http://localhost:8888`.

### Step 5: Test Invitation

1. Go to **Organization Settings**
2. Enter an email address
3. Click **"Send Invitation"**
4. Check console for: `✅ Invitation email sent successfully!`
5. Check inbox for the email

---

## 📁 What Was Changed

### 1. Created Netlify Function
**File:** `netlify/functions/send-invitation-email.ts`

This function:
- Receives invitation details from the frontend
- Generates the HTML email
- Calls Resend API securely (server-side)
- Returns success/failure to frontend

### 2. Updated Email Service
**File:** `src/services/EmailNotificationService.ts`

Changed `sendOrganizationInvitationEmail()` to:
- Call Netlify Function instead of Resend directly
- Handle responses from the function
- No more CORS issues!

### 3. Updated Configuration
**Files:** 
- `netlify.toml` - Added functions configuration
- `package.json` - Added `@netlify/functions` dependency

### 4. Fixed Logging Issue
- Made `email_notifications` table logging optional
- Won't error if table doesn't exist

---

## 🔍 How It Works Now

### Before (❌ CORS Error):
```
Browser → Resend API (BLOCKED by CORS)
```

### After (✅ Working):
```
Browser → Netlify Function → Resend API → Email Sent!
         (your code)        (server-side)
```

---

## 🧪 Testing

### Production (Netlify)
1. Deploy your site
2. Set environment variables in Netlify UI
3. Try sending an invitation
4. Should work! ✨

### Local Development
```bash
# Start Netlify Dev server
netlify dev

# Then test in browser at http://localhost:8888
```

### Check Logs
In Netlify Dashboard:
- Functions → send-invitation-email → View logs
- See real-time function executions

---

## 📊 Environment Variables

### Client-Side (VITE_*)
These are embedded in the build and visible to anyone:
```bash
VITE_SUPABASE_URL=...           # ✅ Public (safe)
VITE_SUPABASE_ANON_KEY=...      # ✅ Public (safe, has RLS)
```

### Server-Side (Netlify Functions)
These are kept secret on the server:
```bash
RESEND_API_KEY=...              # ✅ Secret (safe)
FROM_EMAIL=...                  # ✅ Private
```

**Never use `VITE_RESEND_API_KEY`** - it would expose your API key!

---

## ⚙️ Netlify Function Details

### Endpoint
```
/.netlify/functions/send-invitation-email
```

### Request
```json
{
  "invitedEmail": "user@example.com",
  "organizationName": "Acme Corp",
  "inviterName": "John Doe",
  "role": "member",
  "invitationToken": "abc-123-xyz",
  "baseUrl": "https://yoursite.com"
}
```

### Response (Success)
```json
{
  "success": true,
  "messageId": "re_abc123xyz"
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## 🐛 Troubleshooting

### "Cannot GET /.netlify/functions/send-invitation-email"

**Problem:** Function not deployed or not found

**Solutions:**
1. Make sure you deployed to Netlify
2. Check `netlify.toml` has `[functions]` section
3. Verify function file is in `netlify/functions/` directory
4. Check Netlify build logs for errors

### "Environment variable RESEND_API_KEY is not set"

**Problem:** Environment variables not configured

**Solutions:**
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add `RESEND_API_KEY` and `FROM_EMAIL`
3. Redeploy the site (or trigger a new build)
4. Variables are **NOT** `VITE_*` prefixed

### "Failed to send email"

**Problem:** Resend API error

**Solutions:**
1. Check Resend API key is valid
2. Check `FROM_EMAIL` is verified in Resend
3. Check Netlify Function logs for detailed error
4. Verify you haven't hit rate limits

### Local Testing Issues

**Problem:** Function doesn't work locally

**Solutions:**
1. Use `netlify dev` instead of `npm run dev`
2. Create `.env` file with environment variables (see Step 4)
3. Make sure Netlify CLI is installed: `npm install -g netlify-cli`
4. Access at `http://localhost:8888` (not 5173)

---

## 📝 Production Checklist

- [ ] Environment variables set in Netlify Dashboard
  - `RESEND_API_KEY` 
  - `FROM_EMAIL`
- [ ] Code pushed to Git
- [ ] Netlify build successful
- [ ] Function appears in Netlify Dashboard → Functions
- [ ] Test invitation sending
- [ ] Check email delivery
- [ ] Verify invitation acceptance works

---

## 🎯 Summary

✅ **What you have now:**
- Secure server-side email sending
- No CORS issues
- API key kept secret
- Production-ready setup
- Netlify Function auto-scales

❌ **What you removed:**
- Direct Resend API calls from browser
- `VITE_RESEND_API_KEY` (insecure)
- CORS errors

---

## 🔗 Resources

- **Netlify Functions Docs:** https://docs.netlify.com/functions/overview/
- **Resend Docs:** https://resend.com/docs
- **CORS Explanation:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

## ✅ You're Ready!

Your invitation emails will now work without CORS errors. Just deploy to Netlify and set the environment variables!

Need help? Check the Netlify Function logs in your dashboard.

