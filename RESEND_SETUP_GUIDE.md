# Resend Email Integration Setup Guide

This guide will help you set up Resend API for sending emails in your application.

## 📋 Prerequisites

- A Resend account (sign up at [resend.com](https://resend.com))
- A verified domain (for production use)

## 🚀 Quick Start

### 1. Get Your Resend API Key

1. Sign up or log in to [Resend](https://resend.com)
2. Navigate to **API Keys** in your dashboard
3. Click **Create API Key**
4. Give it a name (e.g., "Production" or "Development")
5. Copy the API key (it will only be shown once!)

### 2. Configure Environment Variables

Create or update your `.env` file in the project root with the following variables:

```bash
# Resend API Configuration
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FROM_EMAIL=noreply@yourdomain.com
```

**Important Notes:**
- Replace `re_xxxxxxxxxxxxxxxxxxxxxxxxxx` with your actual Resend API key
- Replace `noreply@yourdomain.com` with your verified email address
- For development/testing, you can use `onboarding@resend.dev` as the from email
- Never commit your `.env` file to version control!

### 3. Domain Verification (Production)

For production use, you need to verify your domain:

1. Go to **Domains** in your Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the provided DNS records to your domain registrar:
   - **SPF Record** (TXT)
   - **DKIM Records** (CNAME)
   - **DMARC Record** (TXT) - optional but recommended
5. Wait for verification (usually takes a few minutes to a few hours)
6. Once verified, you can send emails from `*@yourdomain.com`

### 4. Test the Integration

The service will automatically work in two modes:

#### Development Mode (No API Key)
```bash
# Don't set VITE_RESEND_API_KEY or leave it empty
```
- Emails will be mocked (logged to console)
- Visual notification will appear in the UI
- Useful for local development

#### Production Mode (With API Key)
```bash
VITE_RESEND_API_KEY=re_your_actual_key
VITE_FROM_EMAIL=noreply@yourdomain.com
```
- Emails will be sent via Resend API
- Delivery tracked in Resend dashboard
- Logs stored in Supabase database

## 📧 Email Features

### Available Email Templates

1. **Inspection Booking** - Sent when a property inspection is scheduled
2. **Inspection Cancellation** - Sent when an inspection is cancelled
3. **Inspection Reminder** - Sent 24 hours before an inspection
4. **General Notifications** - For custom messages

### Example Usage

```typescript
import { EmailNotificationService } from './services/EmailNotificationService';

// Send inspection booking email
await EmailNotificationService.sendInspectionBookingNotification(
  'tenant@example.com',
  'John Doe',
  '123 Main St, London',
  'routine',
  new Date('2025-11-15T10:00:00'),
  'Please ensure all rooms are accessible'
);

// Send custom email
await EmailNotificationService.sendEmail({
  to: 'recipient@example.com',
  subject: 'Welcome to Our Platform',
  message: 'Plain text message content',
  html: '<h1>Welcome!</h1><p>HTML content</p>', // Optional
  type: 'general',
  metadata: { userId: '123' }
});
```

## 🎨 Email Template Customization

All emails are sent with both HTML and plain text versions. The HTML templates include:

- **Responsive design** - Works on mobile and desktop
- **Professional styling** - Clean, modern appearance
- **Brand colors** - Blue theme (customizable)
- **Clear CTAs** - Action buttons for tenant portal
- **Mobile-friendly** - Optimized for all devices

To customize templates, edit the HTML generation methods in:
```
src/services/EmailNotificationService.ts
```

## 🔍 Monitoring & Debugging

### View Sent Emails

1. **Resend Dashboard**: View all sent emails, delivery status, and opens
2. **Supabase Database**: Check the `email_notifications` table for logs

### Get Email History

```typescript
// Get all notifications
const history = await EmailNotificationService.getNotificationHistory();

// Filter by recipient
const userEmails = await EmailNotificationService.getNotificationHistory(
  'tenant@example.com'
);

// Filter by type
const bookings = await EmailNotificationService.getNotificationHistory(
  undefined,
  'inspection_booking'
);
```

### Console Logging

All email operations are logged to the console:
- ✅ Success: Email sent via Resend
- ⚠️ Warning: Running in mock mode (no API key)
- ❌ Error: Failed to send email

## 🔒 Security Best Practices

1. **Never expose your API key**
   - Keep it in `.env` file
   - Add `.env` to `.gitignore`
   - Use different keys for development and production

2. **Verify your domain**
   - Prevents emails from being marked as spam
   - Builds trust with recipients
   - Required for production use

3. **Rate limiting**
   - Resend has rate limits based on your plan
   - Monitor usage in your dashboard
   - Implement retry logic for failed sends

4. **Email validation**
   - Always validate email addresses before sending
   - Handle bounces and complaints
   - Maintain a clean email list

## 💰 Pricing

Resend offers a generous free tier:
- **Free Plan**: 3,000 emails/month, 100 emails/day
- **Pro Plan**: Starting at $20/month for 50,000 emails
- Check [resend.com/pricing](https://resend.com/pricing) for current rates

## 🆘 Troubleshooting

### Emails Not Sending

1. **Check API Key**: Ensure `VITE_RESEND_API_KEY` is set correctly
2. **Domain Verification**: Verify your domain in Resend dashboard
3. **From Email**: Must match verified domain
4. **Console Errors**: Check browser/server console for error messages

### Emails Going to Spam

1. **Verify Domain**: Complete SPF, DKIM, and DMARC setup
2. **Email Content**: Avoid spam trigger words
3. **Sender Reputation**: Use consistent from address
4. **Test First**: Send test emails to yourself

### API Rate Limits

```
Error: Too many requests
```

**Solution**: 
- Implement retry logic with exponential backoff
- Upgrade your Resend plan
- Batch emails when possible

## 📚 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Email Best Practices](https://resend.com/docs/best-practices)

## 🔄 Migration from Other Services

If you're migrating from another email service (SendGrid, Mailgun, etc.):

1. Update the `EmailNotificationService` to use Resend
2. Verify your domain with Resend
3. Update environment variables
4. Test with a small batch of emails
5. Monitor delivery rates
6. Gradually migrate all email sending

## ✅ Checklist

Before going to production:

- [ ] Resend account created
- [ ] API key generated and added to `.env`
- [ ] Domain verified in Resend dashboard
- [ ] DNS records (SPF, DKIM) configured
- [ ] From email updated to verified domain
- [ ] Test emails sent successfully
- [ ] Email notifications table exists in Supabase
- [ ] Environment variables set in deployment platform (Vercel/Netlify)
- [ ] Error handling and logging tested
- [ ] Rate limits understood and monitored

## 📞 Support

- **Resend Support**: support@resend.com
- **Documentation**: https://resend.com/docs
- **Status Page**: https://status.resend.com

