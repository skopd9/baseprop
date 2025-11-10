# 📧 All Email Templates Setup - Complete Guide

## 🎯 Overview

Set up **all your beautiful email templates** in one go! This guide covers every authentication email your users will receive.

**Time required:** 10 minutes total
**Skill level:** Copy/paste

---

## 📋 What You'll Set Up

### 1. **Magic Link Email** 🔐
When users sign in with email (passwordless)

### 2. **Confirm Signup Email** ✉️
When users create an account with password

### 3. **Organization Invitations** 📨
Already working! (via Netlify function + Resend)

---

## 🚀 Quick Setup (All Templates)

### Prerequisites

Make sure you have:
- ✅ Resend account with API key
- ✅ Supabase SMTP configured (see below)
- ✅ Domain verified in Resend (optional for production)

---

## Step 1: Configure Supabase SMTP (One Time)

This enables **all** custom email templates.

### 1.1 Get Your Resend API Key

Go to: https://resend.com/api-keys

Copy your API key (starts with `re_`)

### 1.2 Configure Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** (⚙️) → **Auth**
4. Scroll to **SMTP Settings**
5. Click **Enable Custom SMTP**
6. Fill in:

```
Host: smtp.resend.com
Port: 465
Username: resend
Password: re_your_api_key_here
Sender email: noreply@yourdomain.com
Sender name: Base Prop
```

> **Note:** Use `onboarding@resend.dev` for testing, or your verified domain for production.

7. Click **Save**

✅ **Done!** Now Supabase will send all emails via Resend.

---

## Step 2: Set Up Magic Link Template

For passwordless sign-in emails.

### 2.1 Navigate to Template

In same **Auth** page:
1. Scroll to **Email Templates**
2. Click **Magic Link** tab

### 2.2 Update Subject

```
🔐 Sign in to Base Prop - Magic Link
```

### 2.3 Paste HTML

Copy from `SUPABASE_MAGIC_LINK_TEMPLATE.html` or use the template in `MAGIC_LINK_QUICK_SETUP.md`

Key features:
- 🔐 Lock icon
- "Sign In to Base Prop" heading
- Green branded button
- Expires in 1 hour notice

### 2.4 Save

Click **Save**

✅ **Done!** Magic link emails are now branded.

---

## Step 3: Set Up Confirm Signup Template

For new account confirmation emails.

### 3.1 Navigate to Template

In same **Email Templates** section:
1. Click **Confirm signup** tab

### 3.2 Update Subject

```
✨ Welcome to Base Prop - Confirm Your Email
```

### 3.3 Paste HTML

Copy from `SUPABASE_CONFIRM_SIGNUP_TEMPLATE.html` or use the template in `CONFIRM_SIGNUP_EMAIL_SETUP.md`

Key features:
- ✉️ Envelope icon
- "Welcome to Base Prop!" greeting
- Green branded button
- "What's Next?" feature list
- Expires in 24 hours notice

### 3.4 Save

Click **Save**

✅ **Done!** Signup confirmation emails are now branded.

---

## Step 4: Test Everything! 🧪

### Test Magic Link
1. Sign out
2. Click "Sign In"
3. Enter email, request magic link
4. Check inbox → Should see beautiful email!

### Test Confirm Signup
1. Sign out
2. Create new account with email + password
3. Check inbox → Should see welcome email!

### Test Organization Invitations
Already working via Netlify function! ✅

---

## 📚 Template Files Reference

All your templates are saved in the project root:

| Email Type | Template File | Setup Guide |
|------------|---------------|-------------|
| Magic Link | `SUPABASE_MAGIC_LINK_TEMPLATE.html` | `MAGIC_LINK_QUICK_SETUP.md` |
| Confirm Signup | `SUPABASE_CONFIRM_SIGNUP_TEMPLATE.html` | `CONFIRM_SIGNUP_EMAIL_SETUP.md` |
| Org Invitations | `netlify/functions/send-invitation-email.ts` | Already working ✅ |

---

## 🎨 What Your Users Will See

### Magic Link Email
```
┌─────────────────────────────────────┐
│  ╔═══════════════════════════════╗  │
│  ║        🔐                     ║  │
│  ║  Sign In to Base Prop         ║  │
│  ╚═══════════════════════════════╝  │
│                                     │
│  Click to sign in...                │
│                                     │
│  [ ✨ Sign In to Base Prop ]        │
│                                     │
│  ⚠️ Expires in 1 hour               │
└─────────────────────────────────────┘
```

### Confirm Signup Email
```
┌─────────────────────────────────────┐
│  ╔═══════════════════════════════╗  │
│  ║        ✉️                      ║  │
│  ║  Welcome to Base Prop!        ║  │
│  ╚═══════════════════════════════╝  │
│                                     │
│  Thanks for signing up...           │
│                                     │
│  [ ✨ Confirm Your Email ]          │
│                                     │
│  📋 What's Next?                    │
│  • Manage properties                │
│  • Track rent payments              │
│  • Handle repairs                   │
│                                     │
│  ⚠️ Expires in 24 hours             │
└─────────────────────────────────────┘
```

### Organization Invitation Email
```
┌─────────────────────────────────────┐
│  ╔═══════════════════════════════╗  │
│  ║  🎉 You've Been Invited!      ║  │
│  ╚═══════════════════════════════╝  │
│                                     │
│  John invited you to join...        │
│                                     │
│  🏢 Organization: Acme Properties   │
│  👤 Your Role: Member               │
│                                     │
│  [ Accept Invitation ]              │
│                                     │
│  ⚠️ Expires in 7 days               │
└─────────────────────────────────────┘
```

All matching your beautiful green brand! ✨

---

## ⚠️ Required Variables

Never remove these from templates:

### Magic Link & Confirm Signup
- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your site URL (optional)

### Organization Invitations
These are handled in code (Netlify function), not in Supabase templates.

---

## 🎯 Checklist

Use this to track your setup:

### SMTP Configuration
- [ ] Got Resend API key
- [ ] Configured Supabase SMTP settings
- [ ] Saved SMTP settings
- [ ] Tested SMTP connection (send test email)

### Magic Link Template
- [ ] Updated subject line
- [ ] Pasted HTML template
- [ ] Verified `{{ .ConfirmationURL }}` is present
- [ ] Saved template
- [ ] Tested by requesting magic link

### Confirm Signup Template
- [ ] Updated subject line
- [ ] Pasted HTML template
- [ ] Verified `{{ .ConfirmationURL }}` is present
- [ ] Saved template
- [ ] Tested by creating new account

### Organization Invitations
- [ ] Already working ✅ (no setup needed)

---

## 🆘 Troubleshooting

### Emails not arriving?
1. Check spam/junk folder
2. Verify SMTP settings are correct
3. Check Resend dashboard: https://resend.com/emails
4. Verify sender email domain is verified
5. Use `onboarding@resend.dev` for testing

### Emails look plain/unstyled?
1. Make sure you saved the HTML template (not just subject)
2. View in HTML mode (not plain text)
3. Try different email client (Gmail, Outlook)
4. Check that `{{ .ConfirmationURL }}` is still present

### Template variables not working?
1. Make sure you're using Supabase variables: `{{ .ConfirmationURL }}`
2. Don't use custom variables - only Supabase's built-in ones work
3. Check Supabase docs for available variables

### Still stuck?
- Check Supabase logs: Dashboard → Logs → Auth Logs
- Check Resend logs: https://resend.com/emails
- Verify SMTP is enabled and active
- Try sending a test email from Supabase

---

## 🎉 All Done!

You now have:
- ✅ Beautiful magic link emails
- ✅ Professional signup confirmation emails
- ✅ Branded organization invitations
- ✅ Consistent design across all emails
- ✅ Mobile responsive templates
- ✅ Secure, reliable delivery via Resend

**Your users will love the professional experience!** 🚀

---

## 📖 Additional Resources

- `MAGIC_LINK_QUICK_SETUP.md` - Magic link setup details
- `CONFIRM_SIGNUP_EMAIL_SETUP.md` - Signup confirmation details
- `MAGIC_LINK_BEFORE_AFTER.md` - Visual comparisons
- `START_HERE_MAGIC_LINK_SETUP.md` - Overview and explanation
- `RESEND_SETUP_GUIDE.md` - General Resend setup

---

## 🔄 Optional: Password Reset Template

Want to customize the password reset email too?

1. In **Email Templates**, click **Reset Password** tab
2. Use similar HTML structure
3. Change icon to 🔑 and heading to "Reset Your Password"
4. Keep the same green branding

Let me know if you need that template! 🙂

---

**Questions? All guides are in your project root folder!** 📚





