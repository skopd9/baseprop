# 🚀 Setup Netlify Environment Variables - Quick Guide

## You're getting 404 because the function needs these environment variables!

---

## ⚡ Quick Steps (5 minutes)

### Step 1: Go to Netlify Dashboard

1. Open: https://app.netlify.com
2. Select your site (probably "reos-2" or similar)
3. Go to: **Site settings** → **Environment variables**

### Step 2: Add These Variables

Click **"Add a variable"** and add:

#### Variable 1:
```
Key:   RESEND_API_KEY
Value: re_your_resend_api_key_here
```

#### Variable 2:
```
Key:   FROM_EMAIL  
Value: noreply@yourdomain.com
```

**Important:** 
- ✅ Use `RESEND_API_KEY` (NOT `VITE_RESEND_API_KEY`)
- ✅ These are server-side variables (secure)
- ✅ `FROM_EMAIL` must be verified in Resend for production

### Step 3: Get Your Resend API Key

If you don't have it:
1. Go to: https://resend.com/api-keys
2. Sign in
3. Click **"Create API Key"**
4. Copy the key (starts with `re_`)
5. Paste it into Netlify

### Step 4: Trigger a Redeploy

After adding environment variables:
1. Go to: **Deploys** tab in Netlify
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for build to complete (~2 minutes)

### Step 5: Test Again!

1. Go to your production site
2. Try inviting a member
3. Should work! ✅

---

## 🔍 How to Verify It's Working

After deployment, check:

1. **Functions exist:**
   - Go to: **Functions** tab in Netlify Dashboard
   - You should see: `send-invitation-email`

2. **Environment variables set:**
   - Go to: **Site settings** → **Environment variables**
   - You should see: `RESEND_API_KEY` and `FROM_EMAIL`

3. **Test invitation:**
   - Send an invitation in your app
   - Check **Functions** → **send-invitation-email** → **Logs**
   - Should see successful execution

---

## 📧 Verify Your Email Domain (Recommended)

For production, verify your domain in Resend:

1. Go to: https://resend.com/domains
2. Click **"Add Domain"**
3. Add DNS records (provided by Resend)
4. Wait for verification (~10 minutes)
5. Update `FROM_EMAIL` to use your domain: `noreply@yourdomain.com`

**Why verify?**
- ✅ Send 100 emails/day (vs 3 in sandbox)
- ✅ Professional sender address
- ✅ Better deliverability
- ✅ No "via resend.dev"

---

## 🐛 Troubleshooting

### Still getting 404?

**Check:**
1. Environment variables are set (not empty)
2. You triggered a redeploy after adding variables
3. Function shows up in **Functions** tab
4. Build completed successfully

### Function shows up but still fails?

**Check Netlify Function logs:**
1. Go to: **Functions** → **send-invitation-email**
2. Click **"Function log"**
3. Look for error messages
4. Common issues:
   - Invalid API key
   - Email not verified in Resend
   - Missing FROM_EMAIL variable

### Email not sending?

**Check:**
1. Resend API key is valid
2. FROM_EMAIL is verified in Resend dashboard
3. Not hitting rate limits (3/day in sandbox, 100/day with verified domain)

---

## ✅ Checklist

- [ ] Added `RESEND_API_KEY` in Netlify environment variables
- [ ] Added `FROM_EMAIL` in Netlify environment variables  
- [ ] Triggered a redeploy
- [ ] Build completed successfully
- [ ] Function appears in Functions tab
- [ ] Tested invitation sending
- [ ] Received email

---

## 🎉 Once Setup Complete

Your invitation system will:
- ✅ Send beautiful HTML emails
- ✅ Work on production
- ✅ Be secure (API key not exposed)
- ✅ Scale automatically

The function will also work in dev mode - you'll see a nice notification with the invitation link you can copy and test!

