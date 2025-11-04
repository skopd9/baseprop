# 🚀 Resend Email - Quick Start Guide

## ✅ What's Been Implemented

Resend API has been fully integrated into your application with the following features:

### 📦 Package Installed
- ✅ `resend` npm package installed and configured

### 🔧 Service Updated
- ✅ `EmailNotificationService` now uses Resend API
- ✅ Automatic fallback to mock mode without API key
- ✅ HTML email templates with professional styling
- ✅ Plain text versions for all emails
- ✅ Database logging with Resend message IDs
- ✅ Error handling and retry logic

### 📧 Email Templates
- ✅ **Magic Link Authentication** - Beautiful sign-in email with security info
- ✅ **Inspection Booking** - Beautiful HTML template
- ✅ **Inspection Cancellation** - Professional cancellation notice
- ✅ **Inspection Reminder** - Friendly reminder template
- ✅ **General Emails** - Flexible template for any content

## 🎯 Next Steps (2 Minutes)

### 1. Get Your Resend API Key (1 min)

1. Go to [resend.com](https://resend.com) and sign up (free)
2. Navigate to **API Keys** → **Create API Key**
3. Copy your key (starts with `re_`)

### 2. Add to Environment Variables (1 min)

Create/update your `.env` file in the project root:

```bash
# Required - Your Resend API Key
VITE_RESEND_API_KEY=re_your_actual_key_here

# Optional - From email address
# Use onboarding@resend.dev for testing
# Use your verified domain for production
VITE_FROM_EMAIL=onboarding@resend.dev
```

**That's it!** Your emails will now be sent via Resend.

## 🧪 Test It Out

The easiest way to test is to schedule an inspection in your app:

1. Navigate to **Inspections** in your dashboard
2. Click **Schedule Inspection**
3. Fill in tenant email and inspection details
4. Submit the form

You should see:
- ✅ Console log: "Email sent successfully via Resend"
- ✅ Email delivered to the tenant's inbox
- ✅ Email logged in your Supabase database
- ✅ Email appears in Resend dashboard

## 📊 Monitor Emails

### Resend Dashboard
View all sent emails at: [resend.com/emails](https://resend.com/emails)
- See delivery status
- View open rates
- Check bounce rates
- Debug issues

### Your Database
Check the `email_notifications` table in Supabase:
```sql
SELECT * FROM email_notifications 
ORDER BY sent_at DESC 
LIMIT 10;
```

## 🎨 Development vs Production

### Development (No API Key)
```bash
# Leave VITE_RESEND_API_KEY unset or empty
```
- Emails are mocked (logged to console)
- Visual notification in UI
- Perfect for local development

### Production (With API Key)
```bash
VITE_RESEND_API_KEY=re_live_xxxxxxxxxxxx
VITE_FROM_EMAIL=noreply@yourdomain.com
```
- Real emails sent via Resend
- Requires verified domain for production use
- Full tracking and analytics

## 🏢 Production Setup (5 Minutes)

For production use, verify your domain:

1. **Add Domain** in Resend dashboard
2. **Add DNS Records** (provided by Resend):
   - SPF (TXT)
   - DKIM (CNAME) 
   - DMARC (TXT) - optional
3. **Wait for verification** (few minutes to hours)
4. **Update FROM_EMAIL** to use your domain

Example DNS setup:
```
Type    Name                           Value
TXT     @                              v=spf1 include:resend.com ~all
CNAME   resend._domainkey              resend._domainkey.resend.com
TXT     _dmarc                         v=DMARC1; p=none
```

## 💡 Usage Examples

### Send Magic Link Email
```typescript
import { EmailNotificationService } from './services/EmailNotificationService';

await EmailNotificationService.sendMagicLinkEmail(
  'user@example.com',
  'https://yourapp.com/auth/confirm?token=abc123',
  '1 hour'
);
```

### Send Inspection Booking
```typescript
import { EmailNotificationService } from './services/EmailNotificationService';

await EmailNotificationService.sendInspectionBookingNotification(
  'tenant@example.com',
  'John Smith',
  '123 Main St, London',
  'routine',
  new Date('2025-11-15T10:00:00'),
  'Please ensure all areas are accessible'
);
```

### Send Custom Email
```typescript
await EmailNotificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to Our Platform',
  message: 'Plain text content',
  html: '<h1>Welcome!</h1><p>Rich HTML content</p>',
  type: 'general',
  metadata: { source: 'welcome_flow' }
});
```

### Get Email History
```typescript
// Get all emails
const allEmails = await EmailNotificationService.getNotificationHistory();

// Filter by recipient
const userEmails = await EmailNotificationService.getNotificationHistory(
  'tenant@example.com'
);

// Filter by type
const bookings = await EmailNotificationService.getNotificationHistory(
  undefined,
  'inspection_booking',
  100
);
```

## 🔥 Features

### Automatic Features
- ✅ **HTML & Plain Text** - Both versions sent automatically
- ✅ **Mobile Responsive** - Looks great on all devices
- ✅ **Professional Design** - Modern, clean templates
- ✅ **Error Handling** - Graceful fallbacks on failure
- ✅ **Logging** - All emails logged to database
- ✅ **Resend ID Tracking** - Track messages in Resend dashboard

### Email Templates Include
- 📍 Property details with icons
- 📅 Formatted dates and times
- 📝 Additional notes sections
- 🔗 Call-to-action buttons
- 📱 Mobile-friendly design
- 🎨 Professional branding

## ⚡ Free Tier Limits

Resend free plan includes:
- **3,000 emails/month**
- **100 emails/day**
- **Unlimited API calls**

Perfect for:
- Development and testing
- Small property portfolios
- Getting started

## 🆘 Troubleshooting

### Emails Not Sending?

**Check Console**
```
⚠️ VITE_RESEND_API_KEY not configured. Running in mock mode.
```
→ Add API key to `.env` file

**Check API Key Format**
```
Error: Invalid API key
```
→ Key should start with `re_` (e.g., `re_abc123...`)

**Check From Email**
```
Error: Email not verified
```
→ Use `onboarding@resend.dev` for testing, or verify your domain

### Still Having Issues?

1. Check `.env` file exists in project root
2. Restart development server after adding env variables
3. Check Resend dashboard for error messages
4. Check console logs for detailed error info
5. Review `RESEND_SETUP_GUIDE.md` for full documentation

## 📚 Additional Documentation

- **Full Setup Guide**: `RESEND_SETUP_GUIDE.md`
- **Resend Docs**: [resend.com/docs](https://resend.com/docs)
- **API Reference**: [resend.com/docs/api-reference](https://resend.com/docs/api-reference)

## 🔐 Magic Link Setup

Want beautiful branded magic link emails for authentication?

Check out **MAGIC_LINK_SETUP.md** for:
- Step-by-step Supabase configuration
- Custom SMTP setup with Resend
- Beautiful HTML email template
- Testing and troubleshooting guide

Quick setup: Configure Supabase SMTP to use Resend, then customize the magic link email template in Auth settings!

## ✨ Summary

Your application now has:
- ✅ Professional email sending via Resend
- ✅ Beautiful HTML templates (including magic links!)
- ✅ Development and production modes
- ✅ Complete tracking and logging
- ✅ Error handling and fallbacks
- ✅ Easy to customize and extend

**Ready to send emails!** 🎉

