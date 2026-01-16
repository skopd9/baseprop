# Cancel Pending Invitations - Setup Guide

## Feature Overview

This feature allows organization owners to cancel pending invitations before they are accepted.

## What's Included

### 1. Backend Service (`OrganizationService`)
- ✅ `cancelInvitation(invitationId: string)` - Cancels a pending invitation by ID
- Only allows canceling invitations with `status = 'pending'`

### 2. Context Layer (`OrganizationContext`)
- ✅ `cancelInvitation(invitationId: string)` - Wrapped service method with owner role validation
- Automatically checks that the current user is an owner before allowing cancellation

### 3. UI Component (`OrganizationSettings`)
- ✅ Cancel button appears next to each pending invitation (owner only)
- ✅ Confirmation dialog before canceling
- ✅ Loading state while canceling
- ✅ Success/error messages
- ✅ Automatic refresh of invitation list after cancellation

## Database Setup

### Required RLS Policy

The feature requires a DELETE policy on the `organization_invitations` table. This policy is included in the migration file:

**Migration File:** `migrations/fix_organization_invitations_rls.sql`

The migration includes:
```sql
-- Policy 4: Owners can delete invitations from their organization
DROP POLICY IF EXISTS "Owners can delete invitations" ON organization_invitations;
CREATE POLICY "Owners can delete invitations"
  ON organization_invitations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner' 
      AND status = 'active'
    )
  );
```

### How to Apply the Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Open the file `migrations/fix_organization_invitations_rls.sql`
4. Copy and paste the entire content into the SQL Editor
5. Click **Run** to execute the migration

### Verify the Policy is Applied

Run this query to verify the DELETE policy exists:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename = 'organization_invitations' 
  AND cmd = 'DELETE';
```

Expected result:
```
schemaname | tablename                 | policyname                 | permissive | cmd
-----------+---------------------------+----------------------------+------------+--------
public     | organization_invitations  | Owners can delete...       | PERMISSIVE | DELETE
```

## How to Use

1. **As an Organization Owner:**
   - Open Organization Settings (click organization name in header)
   - Go to the "Pending Invitations" tab
   - Click **Cancel** button next to any invitation
   - Confirm the cancellation in the dialog
   - The invitation will be immediately removed

2. **As a Member:**
   - Members cannot see the Cancel button
   - Only owners have permission to cancel invitations

## Security Features

✅ **Role-based Access Control**: Only organization owners can cancel invitations

✅ **Database-level Security**: RLS policy ensures users can only delete invitations for organizations they own

✅ **Status Validation**: Only invitations with `status = 'pending'` can be canceled

✅ **Confirmation Dialog**: Prevents accidental cancellations

## Testing Checklist

- [ ] Apply the RLS migration to your Supabase database
- [ ] Create a test organization as an owner
- [ ] Invite a user (create a pending invitation)
- [ ] Navigate to Organization Settings → Pending Invitations
- [ ] Click Cancel on the invitation
- [ ] Confirm the invitation is removed
- [ ] Verify non-owners cannot see the Cancel button
- [ ] Try canceling an already-accepted invitation (should fail gracefully)

## Troubleshooting

### Error: "permission denied for table organization_invitations"
**Solution:** Run the migration file `migrations/fix_organization_invitations_rls.sql` in your Supabase SQL Editor

### Cancel button not visible
**Solution:** Ensure you are logged in as an organization owner, not a member

### Error: "Only owners can cancel invitations"
**Solution:** Your user role is not 'owner'. Check your role in the Organization Settings Members tab

## Technical Details

### API Flow
1. User clicks Cancel button
2. `OrganizationSettings.handleCancelInvitation()` is called
3. Confirms user intent via dialog
4. Calls `OrganizationService.cancelInvitation(invitationId)`
5. Executes DELETE query with status check
6. RLS policy validates user is an owner
7. Invitation is deleted
8. UI refreshes to show updated list

### Database Query
```typescript
await supabase
  .from('organization_invitations')
  .delete()
  .eq('id', invitationId)
  .eq('status', 'pending');
```

## Related Files

- `/src/services/OrganizationService.ts` - Service layer with cancelInvitation method
- `/src/contexts/OrganizationContext.tsx` - Context wrapper with role validation
- `/src/components/OrganizationSettings.tsx` - UI component with cancel button
- `/migrations/fix_organization_invitations_rls.sql` - RLS policies including DELETE

## Future Enhancements

Potential improvements for this feature:
- [ ] Bulk cancel multiple invitations at once
- [ ] Audit log of canceled invitations
- [ ] Email notification when invitation is canceled
- [ ] Ability to resend canceled invitations
- [ ] Expiration auto-cancel with notification

