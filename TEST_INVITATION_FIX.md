# 🧪 Quick Test Guide - Invitation Fix

## What Was Fixed

**Problem:** Users were being taken to the landing page after clicking invitation links.

**Root Cause:** The invite token (`?invite=abc123`) was being lost when the magic link redirected users back to the app.

**Solution:** The invite token is now preserved in the magic link redirect URL.

---

## Quick Test (5 minutes)

### Before Deploying to Production

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Login and send invitation:**
   - Login to the app
   - Go to Organization Settings
   - Send invitation to a test email (or your own email)

3. **Accept invitation (NEW INCOGNITO WINDOW):**
   - Open the invitation email
   - Copy the invitation link (should have `?invite=token`)
   - Open new incognito/private browser window
   - Paste the link and hit enter
   - You should see the landing page with green banner: "You have an invitation!"

4. **Complete magic link flow:**
   - Click "Get Started"
   - Enter the email address (same as invitation)
   - Check email for magic link
   - Click the magic link

5. **VERIFY THIS:**
   - ✅ After clicking magic link, URL should **still contain** `?invite=token`
   - ✅ AcceptInvite modal should appear automatically
   - ✅ Modal should show organization name and role
   - ✅ Click "Accept Invitation"
   - ✅ Welcome tour should appear
   - ✅ Complete/skip tour → main app loads with new organization

---

## What to Look For (Success Indicators)

### ✅ URL Check
After clicking the magic link, look at the browser address bar:
```
Good: https://localhost:5173/?invite=abc123def456...
Bad:  https://localhost:5173/
```

### ✅ Console Logs
Open browser console (F12) and look for:
```
[Invite Flow] Token found in URL: abc123def4...
[Invite Flow] Invitation accepted! Org: YourOrgName Role: member
```

### ✅ Modal Flow
1. AcceptInvite modal appears (with org name, role, email)
2. After accepting → WelcomeToOrganizationModal appears
3. After completing tour → main app with new org loaded

---

## If Something Goes Wrong

### Scenario 1: No AcceptInvite Modal After Magic Link

**Check:**
1. Open browser console (F12)
2. Look for `[Invite Flow]` messages
3. If you see: `Token found in URL` or `Token restored from localStorage` → code is working
4. If not → the token was lost

**Possible causes:**
- `VITE_APP_URL` not set correctly
- Browser blocking cookies/localStorage
- Code not deployed properly

### Scenario 2: "Invalid or expired invitation" Error

**Check:**
1. Invitation token might be expired (7 days)
2. Invitation might already be accepted
3. Email address doesn't match invitation

**Solution:**
- Send a new invitation
- Use same email as invitation was sent to

### Scenario 3: Redirect to Landing Page

**Check:**
1. Open console and look for logs
2. Check if token is in URL after redirect
3. Check if localStorage has `pendingInviteToken`

**Solution:**
- Make sure `VITE_APP_URL` is set in production
- Make sure you deployed the latest code

---

## Deploy to Production

Once local testing passes:

```bash
# Commit the fix
git add .
git commit -m "Fix: Preserve invite token in magic link redirect URL"

# Push to production
git push origin main
```

Then test in production the same way (using a real email).

---

## Quick Rollback (If Needed)

If invitations are still broken after deploy:

```bash
# Revert the changes
git revert HEAD
git push origin main
```

Then investigate further before trying again.

---

## Questions?

Check `INVITATION_REDIRECT_FIX.md` for full technical details and debugging steps.

