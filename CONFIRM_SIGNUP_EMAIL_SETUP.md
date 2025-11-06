# ✉️ Confirm Signup Email Template Setup

## 🎯 What This Is For

This template is for the **"Confirm your signup"** email that's sent when users create an account with email + password (not magic link).

---

## 🚀 Quick Setup

### Step 1: Go to Supabase Email Templates

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** → **Auth**
4. Scroll to **Email Templates**
5. Click on **Confirm signup** tab

---

### Step 2: Update Subject Line

Replace with:
```
✨ Welcome to Base Prop - Confirm Your Email
```

Or simpler:
```
Confirm your email address
```

---

### Step 3: Paste the HTML Template

Copy the entire HTML from `SUPABASE_CONFIRM_SIGNUP_TEMPLATE.html` and paste it into the **Message Body** field.

Or copy this:

<details>
<summary>Click to expand: Full HTML Template</summary>

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Confirm Your Email - Base Prop</title>
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
                                                        ✉️
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                            Welcome to Base Prop!
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 30px;">
                            
                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Thanks for signing up! To complete your registration and start managing your properties, please confirm your email address:
                            </p>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 10px 0 30px;">
                                        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                                            ✨ Confirm Your Email
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px;">
                                <tr>
                                    <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px;">
                                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #92400e;">
                                            This link expires in <strong>24 hours</strong> and can only be used once.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px;">
                                <tr>
                                    <td style="background-color: #f0f9ff; border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 8px;">
                                        <h3 style="margin: 0 0 10px; font-size: 16px; color: #10b981;">What's Next?</h3>
                                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">
                                            Once confirmed, you'll be able to:
                                        </p>
                                        <ul style="margin: 10px 0 0; padding-left: 20px; font-size: 14px; color: #374151;">
                                            <li style="margin-bottom: 6px;">Manage your properties and tenants</li>
                                            <li style="margin-bottom: 6px;">Track rent payments and expenses</li>
                                            <li style="margin-bottom: 6px;">Handle repairs and maintenance</li>
                                            <li>Stay compliant with regulations</li>
                                        </ul>
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
                                Sent to <strong style="color: #374151;">{{ .Email }}</strong>. If you didn't create this account, you can ignore this email.
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

</details>

---

### Step 4: Save

Click **Save** button at the bottom.

---

## ✅ Done!

Now when users sign up with email + password, they'll receive a beautiful, branded confirmation email!

---

## 🎨 What Your Users Get

✅ **Green branded header** with envelope icon ✉️
✅ **"Welcome to Base Prop!" greeting**
✅ **Clear "Confirm Your Email" button**
✅ **"What's Next?" section** listing features
✅ **Expiration notice** (24 hours)
✅ **Fallback URL** for accessibility
✅ **Professional footer**
✅ **Mobile responsive**

---

## ⚠️ Important Variables

Make sure these stay in your template:
- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .Email }}` - User's email address

---

## 🎯 All Email Templates

You now have templates for:

1. ✅ **Magic Link** - `MAGIC_LINK_QUICK_SETUP.md`
2. ✅ **Confirm Signup** - This guide
3. ✅ **Organization Invitations** - Already working via Netlify function

---

## 🧪 Test It

1. Sign out of your app
2. Create a new account with email + password
3. Check your inbox
4. See the beautiful email! 🎉

---

**Need the magic link template too?** See `MAGIC_LINK_QUICK_SETUP.md`



