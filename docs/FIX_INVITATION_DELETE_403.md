# Fix 403 Error When Deleting Invitations

## Problem

When trying to cancel/delete an invitation, you get:
```
403 Error: Failed to load resource
```

## Root Cause

The DELETE policy on `organization_invitations` is using a function `user_is_org_owner()` which might not be working correctly. We need to replace it with an inline query like the other policies.

## Quick Fix

### Go to Supabase SQL Editor and run:

```sql
-- Fix DELETE policy for organization_invitations
DROP POLICY IF EXISTS "Owners can delete invitations" ON organization_invitations;

CREATE POLICY "Owners can delete invitations"
  ON organization_invitations FOR DELETE
  USING (
    -- User must be an owner of the organization
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner' 
      AND status = 'active'
    )
  );

ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
```

This uses the same inline query pattern as the other working policies.

## Test After Applying

1. Go to Organization Settings
2. Try to cancel a pending invitation
3. Should work without 403 error

---

**Run this SQL in Supabase to fix the delete issue!** 🔧

