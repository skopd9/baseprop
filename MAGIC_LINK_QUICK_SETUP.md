# ⚡ Magic Link Custom Email - Quick Setup

## 🎯 The Problem

You're getting a plain, simple email from Supabase instead of your beautiful custom template.

## ✅ The Solution (5 minutes)

### 1️⃣ Configure Supabase SMTP with Resend

Go to: [Supabase Dashboard](https://supabase.com/dashboard) → **Project Settings** → **Auth** → **SMTP Settings**

**Enable Custom SMTP** with these settings:
```
Host: smtp.resend.com
Port: 465
Username: resend
Password: YOUR_RESEND_API_KEY
Sender email: noreply@yourdomain.com
Sender name: Base Prop
```

> Get your Resend API key: https://resend.com/api-keys

---

### 2️⃣ Update Email Template

In the same **Auth** page:
1. Scroll to **Email Templates**
2. Click **Magic Link** tab
3. Update **Subject**: `🔐 Sign in to Base Prop - Magic Link`
4. **Paste this HTML** in Message Body:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Sign In to Base Prop</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f8fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f7f8fa;">
        <tr>
            <td style="padding: 40px 20px;">
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 100%;">
                    
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center;">
                                        <div style="background-color: rgba(255, 255, 255, 0.2); width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 20px;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="64" height="64">
                                                <tr>
                                                    <td style="text-align: center; vertical-align: middle; font-size: 32px; line-height: 64px;">
                                                        🔐
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                            Sign In to Base Prop
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 30px;">
                            
                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Click the button below to sign in to your Base Prop account:
                            </p>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 10px 0 30px;">
                                        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                                            ✨ Sign In to Base Prop
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px;">
                                <tr>
                                    <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px;">
                                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #92400e;">
                                            This link expires in <strong>1 hour</strong> and can only be used once.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.6; color: #6b7280;">
                                If the button doesn't work, copy this link:
                            </p>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px;">
                                <tr>
                                    <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 6px;">
                                        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #475569; word-break: break-all; font-family: 'Courier New', monospace;">
                                            {{ .ConfirmationURL }}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
                            
                            <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: #6b7280; text-align: center;">
                                Sent to <strong style="color: #374151;">{{ .Email }}</strong>. If you didn't request this, you can ignore it.
                            </p>
                            
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                © 2025 Base Prop · Property management made simple
                            </p>
                            
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>
```

5. Click **Save**

---

### 3️⃣ Test It!

1. Sign out of your app
2. Click "Sign In"
3. Enter your email
4. Check your inbox - you should see the beautiful template! 🎉

---

## 🤔 Why This Way?

Unlike organization invitations (which we control), **magic links are generated by Supabase** with secure auth tokens. The only way to customize them is through:
1. SMTP settings (tells Supabase to use Resend)
2. Email template (tells Supabase what HTML to send)

This is **secure by design** - Supabase doesn't expose auth tokens to your code.

---

## ⚠️ Important

**Don't remove these variables from the template:**
- `{{ .ConfirmationURL }}` - The magic link
- `{{ .Email }}` - User's email

---

## 📚 Need More Help?

See: `MAGIC_LINK_CUSTOM_EMAIL_SETUP.md` for detailed instructions and troubleshooting.

---

**That's it!** Your magic link emails will now match your beautiful design. ✨



