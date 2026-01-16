# Fix 406 Error on Invitation Acceptance

## Problem

Users clicking invitation links get a 406 error:
```
Failed to load resource: the server responded with a status of 406
Error getting invitation: Object
```

## Root Cause

The RLS (Row Level Security) policy on `organization_invitations` table requires users to be authenticated to view invitations. But the new invitation flow shows the AcceptInvite modal to **unauthenticated users** (before they log in), so they can't read the invitation data.

## Solution

Update the RLS policy to allow **anyone** (authenticated or not) to view pending invitations by token.

### Why This is Safe

1. ✅ Tokens are cryptographically random UUIDs (impossible to guess)
2. ✅ Invitations are single-use (status changes to 'accepted' after use)
3. ✅ They expire after 7 days
4. ✅ They're tied to a specific email address
5. ✅ Only pending, non-expired invitations are visible

---

## How to Fix

### Step 1: Apply Database Migration

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New query**

3. **Copy and paste this SQL:**

```sql
-- =====================================================
-- Allow Anonymous Users to View Invitations by Token
-- =====================================================

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view invitations for their organizations" ON organization_invitations;

-- Create new SELECT policy that allows anyone to view pending invitations by token
CREATE POLICY "Users can view invitations for their organizations or by token"
  ON organization_invitations FOR SELECT
  USING (
    -- Authenticated users can see invitations for organizations they're a member of
    (
      auth.uid() IS NOT NULL
      AND organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND status = 'active'
      )
    )
    OR 
    -- Authenticated users can see invitations sent to their email
    (
      auth.uid() IS NOT NULL
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR
    -- ANYONE can view pending, non-expired invitations
    (
      status = 'pending'
      AND expires_at > now()
    )
  );

-- Verify RLS is still enabled
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
```

4. **Click "Run"** (or press Cmd+Enter / Ctrl+Enter)

5. **Verify success:**
   - You should see: `Success. No rows returned`
   - This means the policy was updated successfully

### Step 2: Test the Invitation Flow

1. Click your invitation link again: https://base-prop.com/?invite=67b8f5e7-3d3a-486b-9825-a57ade150747

2. **You should now see:**
   - ✅ AcceptInvite modal appears immediately
   - ✅ Shows organization name and role
   - ✅ No 406 error in console
   - ✅ "Accept Invitation" button works

3. **Complete the flow:**
   - Click "Accept Invitation"
   - Enter your name
   - Magic link sent to your email
   - Click magic link
   - Invitation auto-accepted
   - Welcome tour appears
   - You're in the app with organization access

---

## What Changed

### Before ❌
```
RLS Policy: Only authenticated users with matching email or organization membership can view invitations
↓
Unauthenticated user clicks invite link
↓
AcceptInvite modal tries to load invitation
↓
406 Error: Permission denied (user not authenticated)
```

### After ✅
```
RLS Policy: Anyone can view pending, non-expired invitations
↓
Unauthenticated user clicks invite link
↓
AcceptInvite modal successfully loads invitation
↓
User sees organization details and can accept
```

---

## Verification

After applying the migration, check:

1. **In Browser Console (F12):**
   - No 406 errors
   - Should see: `[Invite Flow] Token found in URL: ...`

2. **In Supabase Dashboard:**
   - Go to **Authentication** → **Policies**
   - Find `organization_invitations` table
   - Verify the new policy exists

---

## Rollback (If Needed)

If you need to revert this change:

```sql
-- Restore original policy (requires authentication)
DROP POLICY IF EXISTS "Users can view invitations for their organizations or by token" ON organization_invitations;

CREATE POLICY "Users can view invitations for their organizations"
  ON organization_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
    OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
```

---

## Status

- [x] Migration created: `migrations/allow_anonymous_invitation_lookup.sql`
- [ ] Migration applied to Supabase
- [ ] Tested invitation flow
- [ ] Verified no 406 errors

---

**Apply the migration now and test your invitation link!** 🚀

