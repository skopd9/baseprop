# 🧪 Testing Your Resend Integration

## Quick Test (Browser Console Method)

### 1. Start Your Development Server
```bash
npm run dev
```

### 2. Open Browser Console
- Chrome/Edge: Press `F12` or `Cmd+Option+J` (Mac) / `Ctrl+Shift+J` (Windows)
- Firefox: Press `F12` or `Cmd+Option+K` (Mac) / `Ctrl+Shift+K` (Windows)
- Safari: Press `Cmd+Option+C`

### 3. Run Test Command
In the browser console, type:
```javascript
testResendEmail("your-email@example.com")
```
Replace `your-email@example.com` with your actual email address.

### 4. Check Results
You should see:
```
🧪 Testing Resend Email Integration...
📋 Checking configuration:
   VITE_RESEND_API_KEY: ✅ Set
   VITE_FROM_EMAIL: noreply@yourdomain.com

📧 Sending test email to: your-email@example.com
Test 1: Sending simple welcome email...
✅ Test email sent successfully!

Test 2: Sending inspection booking email...
✅ Inspection booking email sent successfully!

═══════════════════════════════════════════════════════════
📊 Test Summary:
═══════════════════════════════════════════════════════════
   Recipient: your-email@example.com
   Time: 11/4/2025, 10:30:45 AM
   General Email: ✅ Success
   Inspection Email: ✅ Success
```

## What to Check

### ✅ In Your Email Inbox
You should receive **2 test emails**:

1. **Welcome Email** - Green header, general test
2. **Inspection Booking** - Blue header, formatted inspection details

**If not in inbox**: Check spam/junk folder

### ✅ In Resend Dashboard
1. Go to [resend.com/emails](https://resend.com/emails)
2. You should see both test emails listed
3. Check their status:
   - ✅ **Delivered** - Perfect!
   - 🕐 **Queued** - Processing, check in a minute
   - ❌ **Failed** - Click for error details

### ✅ In Supabase Database
Check the `email_notifications` table:
```sql
SELECT * FROM email_notifications 
ORDER BY sent_at DESC 
LIMIT 5;
```

You should see both test emails logged with:
- `status`: 'sent'
- `metadata`: Contains `resend_id`
- `sent_at`: Recent timestamp

## Troubleshooting

### ❌ API Key Not Set
```
⚠️ WARNING: VITE_RESEND_API_KEY not set. Email will be mocked.
```

**Solution:**
1. Make sure `.env` file exists in project root
2. Add: `VITE_RESEND_API_KEY=re_your_key_here`
3. Restart dev server: `npm run dev`

### ❌ Invalid API Key
```
Error: Invalid API key
```

**Solution:**
1. Check API key starts with `re_`
2. Verify no extra spaces in `.env` file
3. Generate new key in Resend dashboard if needed

### ❌ Email Not Verified
```
Error: Email address not verified
```

**Solution:**
1. For testing: Use `VITE_FROM_EMAIL=onboarding@resend.dev`
2. For production: Verify your domain in Resend dashboard
3. Update `.env` with verified email

### ❌ Domain Not Verified
```
Error: Domain not verified
```

**Solution:**
1. Go to [Resend Domains](https://resend.com/domains)
2. Click your domain to see verification status
3. Add DNS records if not verified:
   - SPF (TXT record)
   - DKIM (CNAME records)
4. Wait for verification (can take up to 24 hours)
5. Once verified, try again

### 🟡 Emails Going to Spam

**Solutions:**
1. **Complete DNS setup** - Add all records (SPF, DKIM, DMARC)
2. **Use verified domain** - Don't use onboarding@resend.dev for production
3. **Check content** - Avoid spam trigger words
4. **Warm up domain** - Send to yourself first, then gradually increase volume

## Alternative Test Methods

### Method 2: Test via App UI

1. Navigate to **Inspections** in your app
2. Click **Schedule Inspection**
3. Enter your email as the tenant email
4. Fill in inspection details
5. Submit form
6. Check your email inbox

### Method 3: Test via Component

Create a test component:

```typescript
import { EmailNotificationService } from './services/EmailNotificationService';

function TestEmailButton() {
  const handleTest = async () => {
    await EmailNotificationService.sendEmail({
      to: 'your-email@example.com',
      subject: 'Test Email',
      message: 'This is a test!',
      type: 'general'
    });
  };

  return <button onClick={handleTest}>Send Test Email</button>;
}
```

### Method 4: Test Script (Node.js)

If you want to test outside the browser:

```typescript
// test-email.ts
import { Resend } from 'resend';

const resend = new Resend('re_your_api_key');

async function test() {
  const { data, error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'your-email@example.com',
    subject: 'Test Email',
    html: '<h1>Hello!</h1><p>Test email</p>'
  });

  console.log('Result:', data || error);
}

test();
```

Run with: `npx tsx test-email.ts`

## Expected Results

### ✅ Success Indicators

1. **Console Output**
   ```
   ✅ Email sent successfully via Resend
   ```

2. **Email Received**
   - HTML version looks professional
   - Formatting is correct
   - Images/icons display properly
   - Links work

3. **Resend Dashboard**
   - Email shows as "Delivered"
   - No errors listed

4. **Database Log**
   - Entry in `email_notifications` table
   - Status is 'sent'
   - Contains `resend_id` in metadata

### 🎉 All Tests Passed?

Congratulations! Your Resend integration is working perfectly.

**Next Steps:**
1. ✅ Send real emails to tenants
2. ✅ Monitor delivery rates in Resend dashboard
3. ✅ Customize email templates if needed
4. ✅ Set up domain for production use

## Production Checklist

Before going live:

- [ ] Domain verified in Resend
- [ ] DNS records added (SPF, DKIM, DMARC)
- [ ] `VITE_FROM_EMAIL` uses verified domain
- [ ] Test emails delivered successfully
- [ ] Emails not going to spam
- [ ] Environment variables set in deployment platform
- [ ] Email notifications table exists in production database
- [ ] Monitoring/logging in place

## Need Help?

- **Resend Status**: [status.resend.com](https://status.resend.com)
- **Resend Docs**: [resend.com/docs](https://resend.com/docs)
- **Support**: support@resend.com
- **Community**: [resend.com/discord](https://resend.com/discord)

## Quick Reference

### Environment Variables
```bash
VITE_RESEND_API_KEY=re_your_key_here
VITE_FROM_EMAIL=noreply@yourdomain.com
```

### Test Command
```javascript
testResendEmail("your-email@example.com")
```

### Check Logs
```sql
SELECT * FROM email_notifications ORDER BY sent_at DESC LIMIT 10;
```

### Verify Configuration
```javascript
console.log({
  apiKey: import.meta.env.VITE_RESEND_API_KEY ? 'Set' : 'Not set',
  fromEmail: import.meta.env.VITE_FROM_EMAIL || 'Default'
});
```

---

Happy testing! 📧 🎉

