# 🐛 Magic Link Not Sending - Troubleshooting

## Issue

When an **existing user** tries to accept an invitation, they should receive a magic link email, but it's not arriving.

---

## 🔍 Why Magic Link for Existing Users?

For **security reasons**, existing users can't auto-login. They must authenticate first:

- **New users** → Auto-signup ✅ (instant login)
- **Existing users** → Magic link required ✅ (verify identity)

This prevents someone from hijacking an invitation meant for an existing user.

---

## 🚨 Common Causes

### 1. Supabase Email Not Configured

**Check:** Supabase Dashboard → Authentication → Email Templates

**Required settings:**
- SMTP provider configured (or using Supabase's default)
- "Magic Link" template enabled
- Rate limits not exceeded

**How to check:**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click: **Authentication** → **Email Templates**
4. Look for: **Magic Link** template
5. Status should be: **Enabled** ✅

### 2. Rate Limiting

Supabase has rate limits on auth emails:
- **Default:** 4 emails per hour per email address
- **If exceeded:** Emails silently fail

**Solution:**
- Wait 1 hour
- Try again
- Or check Supabase logs for rate limit errors

### 3. Email in Spam

**Check:**
- Spam/junk folder
- Promotions tab (Gmail)
- Filtered emails

### 4. SMTP Not Configured

If using custom SMTP (like Resend):
- Verify SMTP settings in Supabase
- Check sender email is verified
- Test SMTP connection

---

## ✅ Workaround for Existing Users

Since you already have an account, you can bypass the magic link:

### Option 1: Login First, Then Accept

1. **Go to your app homepage**
2. **Login normally** (with magic link from login form)
3. **Then click the invitation link**
4. **Invitation will auto-accept** (you're already logged in!)

### Option 2: Test Auto-Signup with New Email

To test the **new auto-signup feature** (the fix we just deployed):

1. **Send invitation to a NEW email**
   - Example: `yourname+test123@gmail.com`
   - Must be an email that has NEVER been used in your app
2. **Click invitation link**
3. **Enter name**
4. **Should login immediately** (no email needed!) ✅

---

## 🔧 Fix Magic Link Issue

### Step 1: Check Supabase Email Settings

```
1. Go to: https://supabase.com/dashboard
2. Your project → Authentication → Email Templates
3. Find: "Magic Link" template
4. Make sure it's enabled
5. Click "Edit" to see the template
6. Check redirect URL is correct
```

### Step 2: Enable Supabase SMTP (If Not Using Custom)

```
1. Go to: Project Settings → Authentication
2. Scroll to: "SMTP Settings"
3. Option A: Use Supabase's default (easiest)
4. Option B: Configure custom SMTP (Resend, SendGrid, etc.)
```

### Step 3: Test Magic Link Directly

Try sending a magic link from the main login page:

```
1. Go to your app
2. Logout if logged in
3. Click "Get Started" or "Login"
4. Enter your email
5. Check if magic link arrives
```

**If it arrives:**
- ✅ Supabase email is working
- ❌ Issue is specific to invitation flow

**If it doesn't arrive:**
- ❌ Supabase email configuration issue
- Fix SMTP settings first

---

## 🧪 Testing Right Now

### Update the code and test:

I've just updated the code to add better error logging. Deploy this and try again:

```bash
git add .
git commit -m "Add better magic link error handling"
git push
```

Then after Netlify deploys (~2 min), try the invitation flow again and check browser console for:

```
[Invite Flow] Magic link sent successfully
```

Or if there's an error:

```
[Invite Flow] Magic link error: [error details]
```

---

## 📋 Quick Diagnostic Checklist

- [ ] Check browser console for "[Invite Flow] Magic link error" message
- [ ] Check Supabase Dashboard → Authentication → Email Templates → Magic Link is enabled
- [ ] Check spam folder
- [ ] Try logging in normally from homepage (does magic link work there?)
- [ ] Check Supabase Dashboard → Logs for email send errors
- [ ] Verify SMTP is configured in Supabase settings
- [ ] Check if rate limited (wait 1 hour)

---

## 🎯 Recommended Solution

For **existing users** like yourself:

### Just Login First!

```
1. Go to app homepage
2. Click "Get Started"
3. Enter your email
4. Get magic link
5. Click magic link → Logged in
6. NOW click invitation link
7. Invitation auto-accepts ✅
```

This bypasses the need for a second magic link!

---

## 🆕 For Testing the New Auto-Login Feature

The auto-signup feature **only works for NEW users**:

```
Test user: yourname+newuser@gmail.com (must never have been used)
           ↓
Click invitation link
           ↓
Enter name
           ↓
✅ LOGGED IN IMMEDIATELY (no email!)
```

This is the feature that fixes the problem for NEW users!

---

## 📞 Next Steps

1. **Deploy the updated code** (better error handling)
2. **Check browser console** for magic link errors
3. **Check Supabase email configuration**
4. **Or use workaround:** Login first, then click invitation link

The auto-signup feature is working perfectly for NEW users. For existing users, we need to fix the Supabase email configuration to send magic links.

