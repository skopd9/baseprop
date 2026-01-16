# 📧 Increase Supabase Email Rate Limits for Development

## Quick Fix for Local Development

You can increase Supabase's email rate limits from **2 emails/hour to 50+** directly in the Supabase dashboard!

---

## 🚀 Step-by-Step Instructions

### 1. Go to Supabase Dashboard

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Authentication** in the left sidebar

### 2. Scroll to Rate Limits Section

1. Scroll down to **Rate Limits** section
2. Look for **Email Rate Limit** settings

### 3. Adjust Rate Limits

You'll see settings like:

```
Email Rate Limit per hour: [input field]
```

**Default values:**
- Email rate limit: 2-4 per hour

**Change to:**
- Email rate limit: **50** (or higher)

### 4. Save Changes

1. Click **Save** at the bottom
2. Changes take effect immediately!

---

## 📊 Recommended Settings

### For Development/Testing:

```
Email Rate Limit: 50 per hour
```

This gives you plenty of room for testing without hitting limits!

### For Production:

If you're using custom SMTP (Resend):
```
Email Rate Limit: 100 per hour
```

Or keep it lower if you want additional protection.

---

## 🔍 Alternative: Check Your Current Limits

### Where to Find Current Rate Limits:

1. **Supabase Dashboard** → Your Project
2. **Settings** → **API** 
3. Look for **Rate Limits** section
4. You might also find it under **Authentication** → **Rate Limits**

---

## ⚡ Quick Alternative for Local Dev

If you don't want to change Supabase settings, you can also test with the Netlify function locally using Netlify CLI:

### Option 1: Run Netlify Dev Locally

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Run with Netlify functions enabled
netlify dev
```

This runs your site with Netlify functions working locally! Then:
- Your app runs at `http://localhost:8888` (not 5173)
- Netlify functions work just like in production
- Uses Resend (no rate limits!)

### Setup for Netlify Dev:

1. **Create `.env` file in project root:**
```bash
# Required for Netlify functions
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=your_from_email

# Required for client app
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

2. **Run Netlify Dev:**
```bash
netlify dev
```

3. **Access your app at:**
```
http://localhost:8888
```

Now the magic link function works locally with Resend (no rate limits)!

---

## 🎯 Which Option Should You Choose?

### Option 1: Increase Supabase Rate Limits
**Best for:** Quick fix, minimal setup
- ✅ Easy to do (2 minutes)
- ✅ Works immediately
- ✅ No additional setup
- ⚠️ Still limited (but 50 is usually enough)

### Option 2: Use Netlify Dev Locally
**Best for:** Testing production behavior
- ✅ No rate limits (uses Resend)
- ✅ Tests actual production code
- ✅ More realistic testing
- ⚠️ Requires Netlify CLI setup
- ⚠️ Need to add env vars to `.env` file

---

## 📝 Steps Summary

### Quick Fix (2 minutes):

1. Go to Supabase Dashboard → Authentication
2. Find **Rate Limits** section
3. Change email rate limit to **50** (or higher)
4. Save
5. Done! ✅

### Full Local Setup with Netlify Dev (5 minutes):

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Create `.env` file with all environment variables
3. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env`
4. Run `netlify dev`
5. Access at `http://localhost:8888`
6. Done! ✅ (No rate limits!)

---

## 🔒 Important Notes

### Supabase Rate Limits:
- Changes apply to **all environments** (dev, staging, production)
- Higher limits = more risk if abused
- Recommended: Keep production limits reasonable, test with Netlify Dev

### Environment Variables for `.env`:
- ⚠️ **Never commit `.env` to git**
- Add `.env` to your `.gitignore` (should already be there)
- This file is for local development only

---

## 🎉 You're Done!

Now you can test magic links locally without hitting rate limits!

**Recommended:** Use Supabase's 50/hour limit for quick testing, then use `netlify dev` when you need to test the actual production flow.

