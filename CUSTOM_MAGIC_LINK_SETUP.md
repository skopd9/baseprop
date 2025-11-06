# 🚀 Custom Magic Link Setup (Bypasses Supabase Rate Limits)

## ✅ What We Fixed

Your magic link system now uses **Resend directly** instead of going through Supabase's email system. This completely bypasses Supabase's restrictive 2 emails/hour rate limit!

### Benefits:
- ✅ **No more rate limits** - Use Resend's generous 100 emails/day
- ✅ **Beautiful branded emails** - Professional design matching your brand
- ✅ **Faster delivery** - Direct sending via Resend
- ✅ **Better reliability** - Not dependent on Supabase email infrastructure

---

## 🔧 Setup Required

You need to add ONE environment variable to Netlify:

### 1. Get Your Supabase Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Project Settings** (⚙️ icon) → **API**
4. Scroll down to **Project API keys**
5. Copy the **`service_role`** key (starts with `eyJ...`)
   - ⚠️ **Important:** This is the service_role key, NOT the anon key
   - This key has admin privileges, keep it secret!

### 2. Add to Netlify Environment Variables

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site configuration** → **Environment variables**
4. Click **Add a variable**
5. Add:
   ```
   Key:   SUPABASE_SERVICE_ROLE_KEY
   Value: eyJ... (paste your service_role key)
   Scope: All scopes
   ```

### 3. Verify Existing Variables

Make sure these are already set (they should be):
- ✅ `RESEND_API_KEY` - Your Resend API key
- ✅ `FROM_EMAIL` - Your verified sender email
- ✅ `VITE_SUPABASE_URL` - Your Supabase project URL

### 4. Redeploy

After adding the environment variable:
1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete (~2 minutes)

---

## 🧪 Test It!

### Development (localhost)
When running `npm run dev` locally:
- ✅ Automatically uses Supabase's built-in email method
- ⚠️ You may still see rate limits (that's expected in dev)
- 💡 This is just for testing - production won't have this issue!

### Production (deployed site)
After deploying to Netlify:

1. **Go to your deployed site** (e.g., https://your-site.netlify.app)
2. Click **Sign In** and enter your email
3. Click **Send Magic Link**
4. Check your email - should arrive instantly! ✨

The email will:
- ✅ Have green Base Prop branding
- ✅ Arrive via Resend (no rate limits!)
- ✅ Be delivered instantly
- ✅ Work reliably

---

## 📊 Rate Limits

### Before (Supabase Default):
- ❌ **2 emails per hour** per email address
- ❌ Very restrictive for testing
- ❌ No control over limits

### After (Custom via Resend):
- ✅ **100 emails per day** (Resend free tier)
- ✅ **3,000 emails per month**
- ✅ Upgrade available if needed

---

## 🔍 How It Works

### Old Flow (Had Rate Limits):
```
User clicks "Sign In"
  ↓
App calls Supabase signInWithOtp
  ↓
Supabase generates token
  ↓
Supabase sends email ❌ (RATE LIMITED!)
  ↓
User waits... maybe email comes
```

### New Flow (No Rate Limits):
```
User clicks "Sign In"
  ↓
App calls Netlify function
  ↓
Function calls Supabase Admin API (generates token)
  ↓
Function sends email via Resend ✅ (NO RATE LIMITS!)
  ↓
User receives beautiful email instantly
```

---

## 🛠️ Files Changed

### New Files:
- `netlify/functions/send-magic-link.ts` - Serverless function that generates and sends magic links

### Updated Files:
- `src/lib/supabase.ts` - Updated `signInWithMagicLink` to use custom function
- `src/components/AuthModal.tsx` - Enhanced rate limit protection
- `netlify.toml` - Added environment variable documentation

---

## 🔒 Security Notes

### Why Service Role Key is Safe Here:

1. ✅ **Server-side only** - Never exposed to client
2. ✅ **Netlify environment** - Secure variable storage
3. ✅ **Specific use case** - Only generates magic links
4. ✅ **No user data access** - Just creates auth tokens

### Best Practices:
- ✅ Never commit the service role key to git
- ✅ Store only in Netlify environment variables
- ✅ Don't share the key with anyone
- ✅ Rotate the key if ever compromised

---

## 🐛 Troubleshooting

### "Failed to send magic link"

**Check:**
1. Service role key is set in Netlify
2. Service role key is correct (starts with `eyJ`)
3. Site has been redeployed after adding the variable
4. Check Netlify function logs for errors

### Email not arriving

**Check:**
1. Spam folder
2. `FROM_EMAIL` is verified in Resend
3. `RESEND_API_KEY` is valid
4. Check Resend dashboard for delivery status

### Still seeing rate limit errors

**If you still see "email rate limit exceeded":**
1. Clear browser cache
2. Make sure you redeployed after adding env var
3. Check that the new code is deployed (check network tab in dev tools)
4. Try in incognito/private window

---

## 📈 Monitor Usage

### Check Resend Usage:
1. Go to [Resend Dashboard](https://resend.com/overview)
2. View daily/monthly email usage
3. See delivery rates
4. Monitor for any issues

### Check Netlify Function Usage:
1. Go to Netlify Dashboard → **Functions** tab
2. View `send-magic-link` function logs
3. Monitor invocation count
4. Check for errors

---

## 🎉 You're All Set!

Once the service role key is added and redeployed:
- ✅ No more rate limit errors
- ✅ Beautiful branded emails
- ✅ Fast, reliable delivery
- ✅ Happy users!

Need help? Check the function logs in Netlify Dashboard under the **Functions** tab.

