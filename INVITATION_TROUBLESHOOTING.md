# 🔍 Invitation Flow Troubleshooting

## Issues You're Seeing

1. ❌ **Organization name is missing** (shows blank)
2. ❌ **"Check your email" screen appears** (instead of auto-login)
3. ❌ **Magic link email not received**

---

## 🚨 Current Status

### The serverless function is NOT deployed yet

That's why you're seeing the old behavior. You need to:

1. **Add `SUPABASE_SERVICE_ROLE_KEY` to Netlify** (see setup below)
2. **Deploy to Netlify**
3. **Test again**

---

## 📋 Setup Checklist

### Step 1: Add Environment Variable

1. **Get your Supabase service_role key:**
   ```
   1. Go to: https://supabase.com/dashboard
   2. Select your project
   3. Click: Settings (⚙️) → API
   4. Scroll to "Project API keys"
   5. Copy the "service_role" key (NOT the anon key!)
      - It's a long string starting with: eyJ...
   ```

2. **Add to Netlify:**
   ```
   1. Go to: https://app.netlify.com
   2. Select your site
   3. Click: Site settings → Environment variables
   4. Click: "Add a variable"
   5. Key: SUPABASE_SERVICE_ROLE_KEY
   6. Value: [paste the service_role key]
   7. Click: "Create variable"
   ```

### Step 2: Verify Other Variables

Make sure these are also set in Netlify:
- `VITE_SUPABASE_URL` ✓
- `VITE_SUPABASE_ANON_KEY` ✓
- `RESEND_API_KEY` ✓ (for sending invitation emails)
- `FROM_EMAIL` ✓ (for sending invitation emails)
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **NEW - add this!**

### Step 3: Deploy

```
1. Go to: Deploys tab in Netlify
2. Click: "Trigger deploy" → "Clear cache and deploy site"
3. Wait 2-3 minutes for build
4. Check deployment succeeded
```

### Step 4: Verify Function Deployed

```
1. Go to: Functions tab in Netlify
2. Look for: accept-invitation-signup
3. Should show: "Function is active" ✅
```

---

## 🔎 Debugging

### Open Browser Console

1. Right-click → Inspect → Console tab
2. Click the invitation link
3. Look for these console logs:

**Expected logs:**
```
[Invite Flow] Loaded invitation: {organization_name: "...", email: "...", ...}
[Invite Flow] Creating account for new user: ...
[Invite Flow] Attempting auto-signup via serverless function
[Invite Flow] Serverless function response: {status: 200, ...}
[Invite Flow] Setting session from serverless function
[Invite Flow] User account created and authenticated: ...
```

**If you see errors:**
- `404` = Function not deployed
- `500` = Missing env variable or Supabase error
- Network error = Function exists but failing

---

## 🐛 Issue 1: Missing Organization Name

### Why It's Happening

The invitation is loading but `organization_name` is null/undefined.

### Quick Fix

**Option A: Check the database**

Run this query in Supabase SQL Editor:

```sql
-- Check if organization_id exists and is valid
SELECT 
  oi.*,
  o.name as org_name
FROM organization_invitations oi
LEFT JOIN organizations o ON oi.organization_id = o.id
WHERE oi.status = 'pending'
ORDER BY oi.created_at DESC
LIMIT 5;
```

**Expected result:**
- Should show your invitation
- `org_name` should NOT be null

**If org_name is null:**
- The organization may have been deleted
- The foreign key relationship is broken
- Create a new invitation from scratch

**Option B: Test with a fresh invitation**

1. Log into your app as the organization owner
2. Go to Organization Settings → Members
3. Send a NEW invitation
4. Click the new invitation link
5. Check if organization name appears

---

## 🐛 Issue 2: "Check Your Email" Screen

### Why It's Happening

The auto-signup serverless function isn't available, so it's falling back to the old magic link flow.

### Fix

1. ✅ **Add `SUPABASE_SERVICE_ROLE_KEY` to Netlify** (see Step 1 above)
2. ✅ **Deploy** (see Step 3 above)
3. ✅ **Verify function exists** (see Step 4 above)

After deploying, you should see in console:
```
[Invite Flow] Serverless function response: {status: 200, ...}
```

Instead of:
```
[Invite Flow] Error creating account: ...
```

---

## 🐛 Issue 3: Magic Link Not Received

If the serverless function isn't working yet, you're falling back to magic link. If the email doesn't arrive:

### Possible Causes

1. **Supabase email not configured**
   - Go to: Supabase Dashboard → Authentication → Email Templates
   - Check: SMTP settings are configured
   
2. **Email in spam**
   - Check spam/junk folder
   
3. **Rate limiting**
   - Supabase has rate limits on auth emails
   - Wait a few minutes and try again

4. **Wrong email configuration**
   - Make sure `VITE_APP_URL` is set correctly in .env
   - Email redirects should point to your actual domain

### Temporary Workaround

Until the serverless function is deployed:
1. Create an account manually first
2. Log in with magic link
3. Then click the invitation link
4. Will auto-accept

---

## ✅ When Everything Works

After deploying with the service_role key:

### Expected Flow

```
1. Click invitation link
   ↓
2. See: "You've been invited to [ORG NAME]" ← org name should show!
   ↓
3. Click: "Accept Invitation"
   ↓
4. Enter your name: "John Smith"
   ↓
5. Click: "Continue"
   ↓
6. [Console logs show serverless function call]
   ↓
7. ✅ IMMEDIATELY LOGGED IN (no email!)
   ↓
8. Welcome tour appears
   ↓
9. You're in the organization!
```

**Total time: ~2 seconds**  
**No email required!** ✅

---

## 🧪 Test After Deploying

### Test 1: Check Console Logs

1. Open browser console (F12 → Console)
2. Click invitation link
3. Enter name and click Continue
4. **Look for:**
   ```
   [Invite Flow] Serverless function response: {status: 200, result: {...}}
   [Invite Flow] User account created and authenticated: [user-id]
   ```

### Test 2: Check You're Logged In

After clicking Continue:
- Should see welcome tour immediately
- Should NOT see "Check your email"
- Should be able to access the dashboard

### Test 3: Check Netlify Function Logs

1. Netlify Dashboard → Functions
2. Click: `accept-invitation-signup`
3. Look for recent invocations
4. Check for errors

---

## 📞 Still Not Working?

### Check These:

1. **Environment variable set?**
   - Netlify → Site settings → Environment variables
   - `SUPABASE_SERVICE_ROLE_KEY` should be there

2. **Redeployed after adding variable?**
   - Must trigger new deploy
   - Old deployments don't have the new variable

3. **Function exists?**
   - Netlify → Functions tab
   - Should see: `accept-invitation-signup`

4. **Check function logs**
   - Click the function
   - Look for error messages
   - Common: "Missing SUPABASE_SERVICE_ROLE_KEY"

---

## 🎯 Quick Summary

### What You Need to Do RIGHT NOW:

```bash
# 1. Get service_role key from Supabase
# 2. Add to Netlify as: SUPABASE_SERVICE_ROLE_KEY
# 3. Deploy
# 4. Test invitation again
```

### What Should Happen After:

- ✅ Organization name appears
- ✅ Auto-login works (no email)
- ✅ ~2 seconds to complete
- ✅ Welcome tour appears

### Time Required:

- **Setup:** 5 minutes
- **Deploy:** 2 minutes
- **Test:** 30 seconds

---

## 📚 Related Docs

- **Setup Guide:** `START_HERE_INVITATION_AUTO_LOGIN.md`
- **Full Details:** `INVITATION_AUTO_LOGIN_FIX.md`
- **Environment Variables:** `SETUP_NETLIFY_ENV_VARS.md`

