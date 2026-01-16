# Quick Start: Apply Cancel Invitation Cleanup Fix

## What This Fixes

When you cancel a user invitation, their user account is now properly removed from the database if they had signed up but never joined an organization. This prevents conflicts when resending invitations.

## Apply in 2 Steps

### Step 1: Run Database Migration (2 minutes)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the contents of: `migrations/cleanup_orphaned_users_on_cancel.sql`
6. Click **Run** (or press `Ctrl/Cmd + Enter`)

**Expected result:**
```
Success. No rows returned.
```

### Step 2: Deploy Updated Code

The TypeScript code has already been updated. Just deploy:

```bash
# If using Netlify/Vercel
git add .
git commit -m "Fix: Clean up orphaned users when canceling invitations"
git push

# If running locally
npm run dev
```

## Verify It Works

### Quick Test:

1. **Invite a test user** (use a temp email like `test+1@yourdomain.com`)
2. **Have them sign up** but DON'T accept the invitation
3. **Cancel the invitation** in Organization Settings
4. **Check browser console** - should see:
   ```
   ✓ Successfully cleaned up orphaned user account for: test+1@yourdomain.com
   ```
5. **Resend the invitation** - should work without errors!

### Manual Check:

View orphaned users in your database:
```sql
SELECT * FROM orphaned_users_view;
```

## What Changed

### Before:
```
Cancel Invitation
    ↓
Delete from organization_invitations
    ↓
Done (user account remains = problem!)
```

### After:
```
Cancel Invitation
    ↓
Delete from organization_invitations
    ↓
Check if user has 0 organization memberships
    ↓
If YES: Delete user account completely
    ↓
Done (clean slate for resending invitation!)
```

## Files Modified

✅ `/src/services/OrganizationService.ts` - Updated `cancelInvitation()` method  
✅ `/migrations/cleanup_orphaned_users_on_cancel.sql` - New migration  
📄 `/CANCEL_INVITATION_CLEANUP_FIX.md` - Full documentation  

## Troubleshooting

### "Function delete_orphaned_user does not exist"
**Solution:** You forgot to run the migration. Go back to Step 1.

### User not being cleaned up
**Solution:** Check if the user has organization memberships:
```sql
SELECT 
  u.email,
  COUNT(om.id) as membership_count
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
WHERE u.email = 'test@example.com'
GROUP BY u.email;
```
If `membership_count > 0`, the user won't be deleted (working as intended).

### Want to manually clean up orphaned users?
```sql
-- Clean up a specific user
SELECT delete_orphaned_user('test@example.com');

-- View all orphaned users first
SELECT * FROM orphaned_users_view;
```

## Need Help?

See full documentation: `CANCEL_INVITATION_CLEANUP_FIX.md`

