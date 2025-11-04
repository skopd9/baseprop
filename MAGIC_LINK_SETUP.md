# 🔐 Magic Link Email Setup with Resend

Your application now has a beautiful, professional magic link email template. Here's how to set it up!

## 📧 What's Been Created

✅ Beautiful HTML email template for magic links
✅ Mobile-responsive design with green branding
✅ Clear call-to-action button
✅ Security information and expiration notice
✅ Plain text fallback version

## 🎯 Two Setup Options

You can choose between two approaches:

### Option 1: Custom SMTP (Recommended) ⭐
Configure Supabase to send emails through Resend's SMTP server.

### Option 2: Supabase Edge Function
Intercept auth emails and send custom emails via Resend API.

---

## Option 1: Configure Supabase SMTP (Easiest)

### Step 1: Get Resend SMTP Credentials

1. Go to [Resend SMTP Settings](https://resend.com/settings/smtp)
2. Click **"Create SMTP Credentials"**
3. Copy the credentials:
   ```
   Host: smtp.resend.com
   Port: 587 (or 465 for SSL)
   Username: resend
   Password: re_xxxxxxxxxx (API key format)
   ```

### Step 2: Configure Supabase SMTP

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings** → **Auth**
4. Scroll to **SMTP Settings**
5. Enable **"Enable Custom SMTP"**
6. Enter your Resend SMTP credentials:
   ```
   Host: smtp.resend.com
   Port Number: 587
   Username: resend
   Password: (your Resend API key)
   Sender email: support@base-prop.com
   Sender name: Base Prop
   ```
7. Click **Save**

### Step 3: Customize Email Template

1. In **Auth Settings**, scroll to **Email Templates**
2. Click **"Magic Link"**
3. Replace the default template with custom HTML

**You can use this template:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
    <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🔐 Sign In to Base Prop</h1>
      </div>
      
      <p style="font-size: 16px; margin-bottom: 20px;">Hello!</p>
      
      <p style="margin-bottom: 20px;">You requested a magic link to sign in to your Base Prop account. Click the button below to securely sign in:</p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #10b981; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);">
          Sign In to Base Prop
        </a>
      </div>
      
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          ⏰ <strong>This link will expire in 1 hour.</strong> If you didn't request this email, you can safely ignore it.
        </p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b;"><strong>Account Details:</strong></p>
        <p style="margin: 0; font-size: 14px; color: #334155;">📧 {{ .Email }}</p>
      </div>
      
      <h3 style="color: #3b82f6; font-size: 16px; margin-top: 25px;">Having trouble?</h3>
      <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <div style="background-color: #f8fafc; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #475569; border: 1px solid #e2e8f0;">
        {{ .ConfirmationURL }}
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <div style="text-align: center;">
        <h3 style="color: #10b981; font-size: 18px; margin-bottom: 10px;">What is a Magic Link?</h3>
        <p style="font-size: 14px; color: #64748b; margin: 0;">
          Magic links provide secure, password-free authentication. Simply click the link, and you'll be automatically signed in to your account. No passwords to remember!
        </p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">
        This email was sent to <strong>{{ .Email }}</strong> because a sign-in was requested for Base Prop.
        <br><br>
        If you didn't request this email, please ignore it or contact support if you have concerns.
        <br><br>
        © 2025 Base Prop. All rights reserved.
      </p>
    </div>
  </body>
</html>
```

**Important Supabase Template Variables:**
- `{{ .ConfirmationURL }}` - The magic link URL
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - The token (if needed)
- `{{ .SiteURL }}` - Your site URL

### Step 4: Test It!

1. Run your app: `npm run dev`
2. Click "Sign In" and enter your email
3. Check your inbox for the beautiful magic link email! 🎉

---

## Option 2: Supabase Edge Function (Advanced)

This approach gives you complete control but requires more setup.

### Step 1: Create Edge Function

Create a new file: `supabase/functions/send-magic-link/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  try {
    const { email, confirmation_url } = await req.json()

    const { data, error } = await resend.emails.send({
      from: 'support@base-prop.com',
      to: email,
      subject: '🔐 Sign in to Base Prop - Magic Link',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
            <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">🔐 Sign In to Base Prop</h1>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 20px;">Hello!</p>
              
              <p style="margin-bottom: 20px;">You requested a magic link to sign in to your Base Prop account. Click the button below to securely sign in:</p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${confirmation_url}" style="display: inline-block; background-color: #10b981; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);">
                  Sign In to Base Prop
                </a>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  ⏰ <strong>This link will expire in 1 hour.</strong> If you didn't request this email, you can safely ignore it.
                </p>
              </div>
              
              <div style="background-color: #f8fafc; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b;"><strong>Account Details:</strong></p>
                <p style="margin: 0; font-size: 14px; color: #334155;">📧 ${email}</p>
              </div>
              
              <h3 style="color: #3b82f6; font-size: 16px; margin-top: 25px;">Having trouble?</h3>
              <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">If the button doesn't work, copy and paste this link into your browser:</p>
              <div style="background-color: #f8fafc; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #475569; border: 1px solid #e2e8f0;">
                ${confirmation_url}
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <div style="text-align: center;">
                <h3 style="color: #10b981; font-size: 18px; margin-bottom: 10px;">What is a Magic Link?</h3>
                <p style="font-size: 14px; color: #64748b; margin: 0;">
                  Magic links provide secure, password-free authentication. Simply click the link, and you'll be automatically signed in to your account. No passwords to remember!
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">
                This email was sent to <strong>${email}</strong> because a sign-in was requested for Base Prop.
                <br><br>
                If you didn't request this email, please ignore it or contact support if you have concerns.
                <br><br>
                © 2025 Base Prop. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

### Step 2: Deploy Edge Function

```bash
# Login to Supabase CLI
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set Resend API key secret
supabase secrets set RESEND_API_KEY=re_your_api_key

# Deploy the function
supabase functions deploy send-magic-link
```

### Step 3: Configure Webhook in Supabase

1. Go to **Database** → **Webhooks**
2. Create new webhook:
   - Name: `magic-link-email`
   - Table: `auth.users`
   - Events: `INSERT`
   - Type: `HTTP Request`
   - HTTP URL: Your edge function URL
   - HTTP Method: `POST`

---

## 🎨 Email Template Features

Your new magic link email includes:

✅ **Professional Design**
- Green branding matching your app
- Mobile-responsive layout
- Clean, modern aesthetics

✅ **Security Information**
- Clear expiration notice (1 hour)
- Account details display
- Security best practices

✅ **Great UX**
- Large, prominent CTA button
- Fallback plain URL for copy/paste
- "What is a Magic Link?" explainer
- Troubleshooting section

✅ **Branding**
- Your company name and colors
- Professional footer
- Copyright notice

---

## 🧪 Testing Your Setup

### Quick Test
1. Start your app: `npm run dev`
2. Open browser to `localhost:5173` (or your port)
3. Click "Sign In"
4. Enter your email address
5. Check your inbox!

### What to Check
- ✅ Email arrives within seconds
- ✅ HTML formatting looks professional
- ✅ Button is clickable and styled correctly
- ✅ Magic link works (signs you in)
- ✅ Email doesn't go to spam
- ✅ Mobile version looks good

### Troubleshooting

**Email not arriving?**
- Check spam/junk folder
- Verify SMTP credentials in Supabase
- Check Resend dashboard for delivery status
- Verify `support@base-prop.com` domain is verified

**Email looks plain/unstyled?**
- Make sure you're viewing HTML version (not plain text)
- Some email clients strip styles - test in Gmail, Outlook
- Verify template was saved in Supabase Auth settings

**Magic link not working?**
- Check redirect URL in Supabase Auth settings
- Verify `VITE_APP_URL` environment variable
- Check browser console for errors

---

## 📊 Monitor Delivery

### Resend Dashboard
View all magic link emails at [resend.com/emails](https://resend.com/emails):
- Delivery status
- Open rates
- Click rates
- Bounce rates

### Supabase Logs
Check authentication logs:
1. Go to **Auth** → **Users**
2. Click on a user
3. View sign-in history

---

## 🎯 Best Practices

### Email Deliverability
1. ✅ Verify your domain in Resend
2. ✅ Add SPF, DKIM, DMARC DNS records
3. ✅ Use consistent from address
4. ✅ Monitor bounce rates

### Security
1. ✅ Keep magic links short-lived (1 hour default)
2. ✅ One-time use only (Supabase handles this)
3. ✅ HTTPS only for redirect URLs
4. ✅ Rate limit auth requests

### User Experience
1. ✅ Clear instructions in email
2. ✅ Mobile-friendly design
3. ✅ Fallback URL for copy/paste
4. ✅ Branded, professional appearance

---

## 🔄 Customization

### Change Colors
Edit the HTML template and update:
- Header background: `#10b981` (green)
- Button color: `#10b981` (green)
- Warning box: `#fef3c7` (yellow)

### Change Text
Modify the template text to match your brand voice.

### Add Logo
Add an image tag in the header:
```html
<img src="https://yoursite.com/logo.png" alt="Base Prop" style="height: 40px;">
```

### Change Expiration Time
In Supabase Auth settings:
- **MAILER_OTP_EXP** - Set to desired seconds (default: 3600 = 1 hour)

---

## ✅ Setup Checklist

- [ ] Resend account created
- [ ] Domain verified in Resend
- [ ] SMTP credentials obtained
- [ ] Supabase SMTP configured
- [ ] Email template updated in Supabase
- [ ] Test email sent successfully
- [ ] Email looks good on mobile
- [ ] Magic link works correctly
- [ ] Email deliverability checked
- [ ] Monitoring set up

---

## 🆘 Need Help?

- **Resend Docs**: [resend.com/docs](https://resend.com/docs)
- **Supabase Auth Docs**: [supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)
- **Resend Support**: support@resend.com
- **Supabase Support**: support@supabase.io

---

**Your magic link emails are now beautifully branded and professionally designed!** 🎉

