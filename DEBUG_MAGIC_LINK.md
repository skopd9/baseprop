# 🔍 Debug: Magic Link Enabled But Not Sending

## Issue

Magic Link email template is **enabled in Supabase**, but emails aren't arriving.

---

## 🔎 Diagnostic Steps

### Step 1: Check Supabase Logs

This will show if emails are actually being sent or failing:

```
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click: "Logs" (in left sidebar)
4. Filter by: "Auth Logs" or "Edge Logs"
5. Look for recent entries when you tried to accept the invitation
```

**Look for:**
- ✅ "Email sent successfully" → Email sent but not received (deliverability issue)
- ❌ "Rate limit exceeded" → Too many emails sent
- ❌ "SMTP error" → Email configuration issue
- ❌ "Failed to send" → SMTP not configured properly

### Step 2: Check SMTP Configuration

```
1. Supabase Dashboard → Project Settings → Authentication
2. Scroll down to: "SMTP Settings"
3. Check status:
```

**Option A: Using Supabase's Default Email**
- Shows: "Using Supabase SMTP"
- Limitation: **Only works in development**
- Production: **Must configure custom SMTP**

**Option B: Custom SMTP Configured**
- Shows your SMTP provider (SendGrid, Resend, etc.)
- Check: Credentials are correct
- Check: Sender email is verified

### Step 3: Test From Main Login Page

Try sending a magic link from your app's main login page:

```
1. Go to: https://base-prop.com
2. Logout if logged in
3. Click "Get Started"
4. Enter: daniel.nehme@recognyte.com
5. Check if magic link arrives
```

**If it arrives:**
- ✅ Supabase email is working
- ❌ Issue is specific to invitation flow (we can fix)

**If it doesn't arrive:**
- ❌ Supabase email NOT working
- Need to configure SMTP

### Step 4: Check Email Deliverability

```
1. Check spam/junk folder
2. Check all folders/filters
3. Search email for "supabase" or "magic"
4. Add noreply@mail.app.supabase.io to contacts
```

### Step 5: Check Rate Limits

Supabase rate limits:
- **4 emails per hour** per email address (default)
- **Resets:** After 1 hour

**To check if rate limited:**
1. Try with a different email address
2. Or wait 1 hour and try again

---

## 🚨 Most Likely Cause: Production SMTP Not Configured

### Supabase Default Email Limitations

Supabase's built-in email service:
- ✅ Works in **development**
- ❌ **Disabled in production** (security reasons)
- Emails silently fail in production

### Solution: Configure Custom SMTP

You need to set up a real email provider:

#### Option 1: Use Resend (You Already Have This!)

You already have `RESEND_API_KEY` set up for invitation emails. Use it for auth emails too:

```
1. Supabase Dashboard → Project Settings → Authentication
2. Scroll to: "SMTP Settings"
3. Click: "Enable Custom SMTP"
4. Configure:
   - Host: smtp.resend.com
   - Port: 465 (or 587)
   - Username: resend
   - Password: [Your RESEND_API_KEY]
   - Sender email: [Your verified email from Resend]
   - Sender name: Base Prop
5. Save
```

#### Option 2: Use SendGrid (Free 100 emails/day)

```
1. Sign up: https://sendgrid.com
2. Get API key
3. Configure in Supabase SMTP settings
4. Verify sender email
```

#### Option 3: Use Gmail (Quick test)

```
1. Enable 2FA on your Gmail account
2. Generate app-specific password
3. Configure in Supabase SMTP settings
   - Host: smtp.gmail.com
   - Port: 587
   - Username: your-email@gmail.com
   - Password: [app-specific password]
```

---

## ✅ Recommended Solution

### Use Resend for All Emails

You're already using Resend for invitation emails. Let's use it for auth emails too:

**Benefits:**
- ✅ Already set up
- ✅ Already have API key
- ✅ Sender email already verified
- ✅ Consistent email experience

**Setup (5 minutes):**

1. **Get Resend SMTP Credentials:**
   ```
   Host: smtp.resend.com
   Port: 465 (SSL) or 587 (TLS)
   Username: resend
   Password: [Your RESEND_API_KEY from Netlify]
   ```

2. **Configure in Supabase:**
   ```
   1. Supabase → Project Settings → Authentication
   2. Scroll to: "SMTP Settings"
   3. Enable Custom SMTP
   4. Fill in Resend details above
   5. Sender: noreply@yourdomain.com (must be verified in Resend)
   6. Save
   ```

3. **Test:**
   ```
   1. Try the invitation flow again
   2. Magic link should arrive!
   ```

---

## 🎯 While You're Fixing SMTP...

### Test the NEW Auto-Signup Feature!

The **main fix** (auto-signup for new users) is already working! Test it:

**Send invitation to a NEW email:**
```
Email: yourname+newtest@gmail.com
       (never used in your app before)
```

**Then:**
```
1. Click invitation link
2. Enter name
3. Click "Continue"
4. ✅ LOGGED IN IMMEDIATELY (no magic link needed!)
```

**This is what we built!** It works perfectly for new users. 🎉

---

## 📋 Action Plan

### Immediate (5 minutes):
1. ✅ **Test with NEW email** (see auto-signup working!)
2. ⏳ Configure Resend SMTP in Supabase
3. ✅ Test magic link for existing users

### Right Now:
```bash
# Test the new feature:
Send invitation to: yourname+test123@gmail.com
Click link → Enter name → INSTANT LOGIN! ✅
```

---

## 🐛 If Still Not Working After SMTP Setup

### Check These:

1. **Sender Email Verified in Resend?**
   - Go to: Resend Dashboard → Domains
   - Your domain must be verified
   - Or use: onboarding@resend.dev (sandbox)

2. **Correct API Key?**
   - Make sure using the right RESEND_API_KEY
   - Should start with: `re_`

3. **Supabase Template Correct?**
   - Check the Magic Link template has `{{ .ConfirmationURL }}`
   - Should redirect to your domain

4. **DNS/Deliverability:**
   - Check SPF/DKIM records for your domain
   - Add in Resend dashboard

---

## 💡 Quick Workaround (While Fixing SMTP)

For existing users who need to accept invitations:

### Option 1: Manual Login First
```
1. Go to app homepage
2. Login normally (request magic link there)
3. Click magic link → Logged in
4. NOW click invitation link
5. Invitation auto-accepts ✅
```

### Option 2: Use Password Auth (If Enabled)
If you have password auth enabled, just login with password, then click invitation link.

---

## 🎉 Summary

### What's Working:
- ✅ Auto-signup function deployed
- ✅ NEW users get instant login (no email!)
- ✅ Invitation acceptance works
- ✅ Organization name appears (should work with fresh invitations)

### What Needs Fix:
- ⏳ SMTP configuration for magic links (existing users)
- Likely cause: Using Supabase default SMTP (doesn't work in production)
- Solution: Configure Resend SMTP (5 min)

### Test NOW:
**Send invitation to:** `yourname+demo@gmail.com`  
**Expected:** Instant login! ✅ (No email needed)

---

## 📞 Next Steps

1. **Test auto-signup with NEW email** (see it working!)
2. **Configure Resend SMTP in Supabase** (for magic links)
3. **Test existing user flow** (magic link should arrive)

The core feature (auto-signup) is working! Just need to fix SMTP for the existing user fallback. 🚀

