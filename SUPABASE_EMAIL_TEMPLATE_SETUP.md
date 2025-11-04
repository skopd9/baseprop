# 📧 Setup Supabase Email Template for Invitations

## You need to add the "Invite user" template in Supabase!

I see you have the Supabase Authentication email templates page open. Here's how to set it up:

---

## 🎯 Quick Setup

### Step 1: Go to Supabase Email Templates

You're already there! In the screenshot:
- **Authentication** → **Emails** → **Templates** → **Invite user** tab

### Step 2: Update the Subject

Replace with:
```
Invitation to join {{ .SiteURL }} - {{ .ConfirmationURL }}
```

Or simpler:
```
You have been invited
```

### Step 3: Update the Message Body

Replace the HTML with this:

```html
<h2>You have been invited</h2>

<p>You have been invited to join an organization on {{ .SiteURL }}.</p>

<p><a href="{{ .ConfirmationURL }}">Accept the invitation</a></p>

<p>If the button doesn't work, copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
```

### Step 4: Save

Click **Save** at the bottom of the page.

---

## ⚠️ Important Note

**However**, this Supabase "Invite user" template is for **Supabase Auth invitations**, NOT for your organization invitations!

Your organization invitations are being sent via **Resend** (the Netlify Function we created), which uses our custom HTML template.

---

## 🔀 Two Different Systems

### 1. **Supabase Auth Invite** (what you're looking at)
- Used when: Supabase Admin invites users to authenticate
- Template: Supabase email templates
- Use case: User account creation
- **You probably don't need this**

### 2. **Organization Invite** (what we built)
- Used when: You invite members to your organization
- Template: `netlify/functions/send-invitation-email.ts`
- Sent via: Resend API
- **This is what you're using! ✅**

---

## ✅ What You Need to Do

Since you're using **Resend for organization invitations** (not Supabase Auth invites):

1. **Ignore the Supabase invite template** (unless you want to use Supabase's built-in user invites)
2. **Set up Netlify environment variables** (see `SETUP_NETLIFY_ENV_VARS.md`)
3. **Deploy** and test!

---

## 📧 Your Email Template (Already Created!)

The beautiful invitation email template is already in:
```
netlify/functions/send-invitation-email.ts
```

It includes:
- ✅ Beautiful HTML design
- ✅ Organization details
- ✅ Role information
- ✅ Accept button
- ✅ Mobile responsive
- ✅ Professional styling

**Preview:** Open `INVITATION_EMAIL_PREVIEW.html` in your browser to see it!

---

## 🚀 Next Steps

1. **Close the Supabase email templates** (not needed for org invites)
2. **Set up Netlify environment variables:**
   - `RESEND_API_KEY`
   - `FROM_EMAIL`
3. **Redeploy** your site
4. **Test** sending an invitation

See: `SETUP_NETLIFY_ENV_VARS.md` for detailed instructions.

---

## 🤔 When Would You Use Supabase Email Templates?

Only if you want to:
- Send password reset emails
- Send magic link authentication emails
- Use Supabase's built-in user invitation system (different from org invites)

For **organization member invitations**, you're using **Resend** (which is better!).

