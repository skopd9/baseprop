# Organization Invitations Setup Guide ✉️

## ✅ Setup Complete!

The organization invitation system is now fully integrated with Resend API to send beautiful invitation emails.

---

## 🎯 Features Implemented

### 1. **Email Template** 
Beautiful, responsive HTML email with:
- 🎨 Professional branding (indigo/purple theme)
- 📱 Mobile-responsive design
- 🎉 Clear call-to-action button
- 📋 Organization and role details
- ⏰ Expiration warning
- 🔗 Fallback plain-text link

### 2. **Automatic Email Sending**
- ✅ Emails sent automatically when inviting a member
- ✅ Includes unique invitation token
- ✅ Links directly to app with `?invite={token}` parameter
- ✅ Graceful error handling (invitation still created if email fails)

### 3. **Email Content Includes**
- Organization name
- Inviter's name
- Role (owner/member) with description
- Accept invitation button
- Expiration time (7 days default)
- Instructions for new users

---

## 🚀 How It Works

### For the Inviter (Organization Owner):

1. Go to **Organization Settings**
2. Enter the email address of the person to invite
3. Select their role (Owner or Member)
4. Click **"Send Invitation"**
5. ✅ Email is automatically sent via Resend!

### For the Invitee:

1. Receives beautiful email invitation
2. Clicks **"Accept Invitation"** button
3. If not logged in → prompted to sign in/sign up
4. If logged in → immediately added to organization
5. ✅ Redirected to the app with access to the organization!

---

## 📧 Email Setup

### Required Environment Variables

Make sure these are set in your `.env` or Netlify environment:

```bash
# Resend API Key (required for sending emails)
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxx

# From email (must be verified in Resend)
VITE_FROM_EMAIL=noreply@yourdomain.com
```

### Get Your Resend API Key

1. Sign up at https://resend.com
2. Go to **API Keys**
3. Create a new API key
4. Copy and add to your environment variables

### Verify Your Domain (Recommended)

For production use, verify your domain in Resend:
1. Go to https://resend.com/domains
2. Click **"Add Domain"**
3. Add your DNS records
4. Wait for verification
5. Update `VITE_FROM_EMAIL` to use your domain

**Why verify?**
- ✅ Send up to 100 emails/day (vs 3 in sandbox)
- ✅ Professional sender address
- ✅ Better deliverability
- ✅ No "via resend.dev" label

---

## 📝 Email Template Preview

### Subject Line
```
📨 Invitation to join [Organization Name] on Base Prop
```

### Key Sections
1. **Header** - "🎉 You've Been Invited!" (indigo background)
2. **Personal greeting** - "[Inviter] has invited you..."
3. **Organization details box** - Name, role, email (blue background)
4. **Role description** - What permissions they'll have (yellow background)
5. **Accept button** - Large, prominent CTA
6. **Expiration warning** - Red border box
7. **Product info** - What is Base Prop?
8. **Next steps** - Numbered list
9. **Troubleshooting** - Plain text link fallback
10. **Footer** - Privacy & contact info

---

## 🔧 Code Flow

### 1. Invitation Creation
```typescript
// src/services/OrganizationService.ts
static async inviteUser(
  orgId: string,
  email: string,
  role: 'owner' | 'member',
  invitedBy: string
): Promise<OrganizationInvitation>
```

**What happens:**
1. Checks for duplicate pending invitations
2. Gets organization name
3. Gets inviter's name
4. Creates invitation in database (with unique token)
5. **Sends email via Resend** ✨
6. Returns invitation object

### 2. Email Sending
```typescript
// src/services/EmailNotificationService.ts
static async sendOrganizationInvitationEmail(
  invitedEmail: string,
  organizationName: string,
  inviterName: string,
  role: 'owner' | 'member',
  invitationToken: string,
  expiresIn: string = '7 days'
): Promise<EmailSendResult>
```

**What happens:**
1. Constructs accept link: `${baseUrl}/?invite=${token}`
2. Generates HTML email from template
3. Generates plain-text fallback
4. Sends via Resend API
5. Returns success/failure result

### 3. Invitation Acceptance
```typescript
// src/components/AcceptInvite.tsx
// Automatically shown when URL has ?invite={token}
```

**What happens:**
1. App detects `invite` URL parameter
2. Shows AcceptInvite modal
3. Validates invitation token
4. Checks if user's email matches invitation
5. Adds user to organization_members
6. Marks invitation as accepted
7. Redirects to organization dashboard

---

## 🎨 Customization

### Change Email Colors
Edit `createOrganizationInvitationHtml()` in `EmailNotificationService.ts`:

```typescript
// Main accent color (indigo)
background-color: #6366f1

// Warning color (red)
background-color: #ef4444

// Info color (yellow)
background-color: #fef3c7
```

### Change Expiration Time
When calling `inviteUser()`, the default is 7 days:

```typescript
// In database migration, default is:
expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')

// In email, pass custom value:
EmailNotificationService.sendOrganizationInvitationEmail(
  email,
  orgName,
  inviterName,
  role,
  token,
  '14 days' // ← Change here
);
```

### Customize Email Content
Edit the template in `EmailNotificationService.ts` around line 592:

```typescript
private static createOrganizationInvitationHtml(
  invitedEmail: string,
  organizationName: string,
  inviterName: string,
  role: 'owner' | 'member',
  acceptLink: string,
  expiresIn: string = '7 days'
): string {
  // Customize HTML here
}
```

---

## 📊 Database Schema

### organization_invitations table
```sql
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token UUID UNIQUE DEFAULT gen_random_uuid(),  -- ← Used in email link
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🧪 Testing

### Test Invitation Flow

1. **Send Test Invitation:**
   ```typescript
   // In Organization Settings UI:
   // - Enter: test@example.com
   // - Role: Member
   // - Click: Send Invitation
   ```

2. **Check Console:**
   ```
   📧 Sending organization invitation email...
   ✅ Invitation email sent successfully!
   ```

3. **Check Email:**
   - Open inbox for test@example.com
   - Should receive email with subject: "📨 Invitation to join..."
   - Click "Accept Invitation" button

4. **Verify Acceptance:**
   - User should be added to organization_members
   - Invitation status should change to 'accepted'
   - User should see organization in their dashboard

### Test in Development (No Resend API Key)

Without `VITE_RESEND_API_KEY`, the system will:
- ✅ Still create the invitation in database
- ⚠️ Log warning: "VITE_RESEND_API_KEY not configured. Running in mock mode."
- ✅ Show visual notification in dev mode
- ✅ Invitation link can still be copied manually from database

### Check Resend Dashboard

View sent emails at: https://resend.com/emails
- See delivery status
- View email content
- Check bounces/failures
- Monitor sending limits

---

## ⚠️ Troubleshooting

### Email Not Sending

**Issue:** Email not being sent

**Solutions:**
1. Check `VITE_RESEND_API_KEY` is set correctly
2. Check `VITE_FROM_EMAIL` is verified in Resend
3. Check console for error messages
4. Verify Resend API key is active
5. Check you haven't hit rate limits (3 in sandbox, 100/day with verified domain)

### Invitation Not Appearing

**Issue:** Invitee doesn't receive email

**Solutions:**
1. Check spam/junk folder
2. Verify email address is correct
3. Check Resend dashboard for delivery status
4. Try resending invitation
5. Copy invitation link manually from database

### Email Goes to Spam

**Issue:** Email ends up in spam folder

**Solutions:**
1. ✅ Verify your domain in Resend (most important!)
2. Add SPF, DKIM records to your domain
3. Don't use free email providers (Gmail, Yahoo) as sender
4. Avoid spam trigger words in email content

### Rate Limit Errors

**Issue:** "Rate limit exceeded" or "Sandbox mode" error

**Solutions:**
1. Verify your domain in Resend to unlock 100 emails/day
2. Upgrade Resend plan for higher limits
3. Wait for limits to reset (midnight UTC)
4. Use rate limiting service (already implemented!)

---

## 🔒 Security Features

### ✅ Implemented Safeguards

1. **Unique Tokens** - Each invitation has a UUID token
2. **Expiration** - Invitations expire after 7 days
3. **Email Verification** - Only the invited email can accept
4. **Status Tracking** - Prevents duplicate acceptances
5. **RLS Policies** - Database-level access control
6. **Single Use** - Token becomes invalid after acceptance

---

## 📈 Rate Limits

### Current Limits (with verified domain):
- **100 emails per day** (Resend free tier)
- **10 emails per minute** (client-side rate limiting)
- **5 emails per hour per recipient** (client-side rate limiting)

### Upgrade for More:
- Resend Pro: 10,000 emails/month - $20/month
- Resend Business: 50,000 emails/month - $85/month
- See: https://resend.com/pricing

---

## 📚 Related Files

- `src/services/EmailNotificationService.ts` - Email sending logic & templates
- `src/services/OrganizationService.ts` - Invitation creation & management
- `src/components/AcceptInvite.tsx` - Invitation acceptance UI
- `src/components/OrganizationSettings.tsx` - Invitation sending UI
- `src/App.tsx` - URL parameter handling

---

## ✅ Next Steps

1. **Set up Resend account** → https://resend.com
2. **Add API key to environment variables**
3. **Verify your domain** (recommended for production)
4. **Test invitation flow**
5. **Customize email template** (optional)
6. **Monitor sending in Resend dashboard**

---

## 🎉 You're All Set!

Your organization invitation system is now fully functional with:
- ✅ Beautiful email templates
- ✅ Automatic sending via Resend
- ✅ Secure token-based acceptance
- ✅ Rate limiting & error handling
- ✅ Production-ready code

Invite your first team member now! 🚀

