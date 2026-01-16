# Cancel Invitation User Cleanup Fix

## Problem Summary

When you cancel a user invitation, the invitation was removed from the `organization_invitations` table, but if that person had already created an account (signed up), their user record remained in the database (`auth.users` and `user_profiles`). This caused issues when trying to resend the invitation because:

1. The email already exists in the system
2. The user has an account but no organization memberships
3. Resending the invite could lead to confusion or errors

## Solution

The fix implements a comprehensive cleanup process that:

1. **Deletes the invitation** from `organization_invitations`
2. **Checks for orphaned user accounts** - users who signed up but never joined an organization
3. **Automatically removes orphaned accounts** so the invitation can be resent cleanly

## Changes Made

### 1. Updated TypeScript Service (`src/services/OrganizationService.ts`)

The `cancelInvitation` method now:
- Retrieves the invitation email before deleting
- Deletes the invitation
- Calls a database function to clean up any orphaned user account

```typescript
static async cancelInvitation(invitationId: string): Promise<void> {
  // Get invitation email
  const invitation = await fetch invitation details
  
  // Delete invitation
  await delete from organization_invitations
  
  // Clean up orphaned user account (if exists)
  await supabase.rpc('delete_orphaned_user', { user_email: invitedEmail })
}
```

### 2. New Database Migration (`migrations/cleanup_orphaned_users_on_cancel.sql`)

Adds:

#### a) RLS Policy for Profile Deletion
Allows users to delete their own profile if they have no active memberships:
```sql
CREATE POLICY "Users can delete own profile if no memberships"
  ON user_profiles FOR DELETE
  USING (
    auth.uid() = id 
    AND NOT EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = id AND status = 'active'
    )
  );
```

#### b) Database Function: `delete_orphaned_user(email)`
Safely deletes user accounts that have no organization memberships:
```sql
CREATE FUNCTION delete_orphaned_user(user_email TEXT)
RETURNS BOOLEAN
```

**What it does:**
- Finds the user by email
- Checks if they have any organization memberships
- If no memberships exist, deletes from `user_profiles` and `auth.users`
- Returns `TRUE` if deleted, `FALSE` if not

**Security:**
- Uses `SECURITY DEFINER` to have permission to delete from `auth.users`
- Only deletes users with zero organization memberships
- Safe to call even if user doesn't exist

#### c) Debugging View: `orphaned_users_view`
Lists all users who have no active organization memberships:
```sql
SELECT * FROM orphaned_users_view;
```

Shows:
- User ID and email
- When they signed up
- Onboarding completion status
- Number of memberships (always 0 for orphaned users)
- Number of pending invitations

## How to Apply This Fix

### Step 1: Apply Database Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `migrations/cleanup_orphaned_users_on_cancel.sql`
5. Paste and click **Run**

You should see:
```
Success. No rows returned.
```

### Step 2: Verify Migration

Run this query to verify the function exists:
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'delete_orphaned_user';
```

You should see:
| proname | prosecdef |
|---------|-----------|
| delete_orphaned_user | t |

### Step 3: Test the Fix

1. **Invite a test user:**
   - Go to Organization Settings
   - Invite: `test@example.com`

2. **Have them partially sign up:**
   - User clicks invitation link
   - User signs up (creates account)
   - User does NOT accept the invitation (close browser)

3. **Cancel the invitation:**
   - Go to Organization Settings → Pending Invitations
   - Click "Cancel" on the test invitation

4. **Verify cleanup:**
   - Check console logs - should see: `✓ Successfully cleaned up orphaned user account for: test@example.com`
   - Try inviting the same email again - should work without errors!

## How It Works

### Flow Diagram
```
User clicks Cancel
        ↓
Fetch invitation details (get email)
        ↓
Delete invitation record
        ↓
Call delete_orphaned_user(email)
        ↓
    Function checks:
    - Does user exist?
    - Has 0 memberships?
        ↓
    If YES: Delete from auth.users + user_profiles
    If NO:  Do nothing
        ↓
Return success
```

### Safety Features

1. **Only deletes truly orphaned users** - Users with active organization memberships are never deleted
2. **Non-blocking** - If cleanup fails, the invitation is still canceled (doesn't throw errors)
3. **Idempotent** - Safe to call multiple times with the same email
4. **Secure** - Uses database-level security with `SECURITY DEFINER`

## Debugging Orphaned Users

### List all orphaned users:
```sql
SELECT * FROM orphaned_users_view;
```

### Manually clean up a specific user:
```sql
SELECT delete_orphaned_user('user@example.com');
```
Returns `TRUE` if deleted, `FALSE` if not (has memberships or doesn't exist)

### Check if a user has memberships:
```sql
SELECT 
  u.email,
  COUNT(om.id) as membership_count
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id AND om.status = 'active'
WHERE u.email = 'user@example.com'
GROUP BY u.email;
```

## Benefits

✅ **Clean invitations** - Can resend invitations without conflicts  
✅ **No orphaned accounts** - Database stays clean and organized  
✅ **Better UX** - Users won't see "email already exists" errors  
✅ **Automatic cleanup** - No manual intervention needed  
✅ **Safe deletion** - Only removes truly orphaned accounts  

## Related Files

- `/src/services/OrganizationService.ts` - Service layer with updated cancelInvitation
- `/migrations/cleanup_orphaned_users_on_cancel.sql` - Database migration
- `/src/components/OrganizationSettings.tsx` - UI for canceling invitations
- `/CANCEL_INVITATIONS_SETUP.md` - Original cancel feature documentation

## Notes

- The database function uses `SECURITY DEFINER` to have permission to delete from `auth.users`
- Deleting from `auth.users` automatically cascades to `user_profiles` due to `ON DELETE CASCADE`
- The cleanup is "best effort" - if it fails, the invitation is still canceled
- Console logs provide visibility into whether cleanup occurred

## Future Enhancements

Potential improvements:
- [ ] Add scheduled job to clean up old orphaned users (older than 30 days)
- [ ] Send notification to user when their account is cleaned up
- [ ] Admin dashboard showing orphaned users count
- [ ] Audit log of cleaned up accounts

