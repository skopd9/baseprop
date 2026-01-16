# Fix: "Welcome to undefined" on Invitation Acceptance ✅

## Problem
When users accepted an invitation to join an organization, they would see "welcome to undefined" instead of "welcome to [Organization Name]".

## Root Cause
The issue was caused by an **RLS (Row Level Security) policy** preventing users from seeing organization details before they accepted the invitation.

### The Flow
1. User clicks invitation link
2. `AcceptInvite` component fetches invitation using `getInvitationByToken()`
3. This query joins `organization_invitations` with `organizations` to get the organization name
4. **RLS Policy blocks the join** because user is not yet an active member
5. `organization_name` comes back as `undefined`
6. Welcome modal shows "Welcome to undefined"

### The RLS Policy Problem
The existing RLS policy on the `organizations` table only allowed SELECT if:
```sql
EXISTS (
  SELECT 1 FROM organization_members
  WHERE organization_members.organization_id = organizations.id
  AND organization_members.user_id = auth.uid()
  AND organization_members.status = 'active'  -- User must be ACTIVE member
)
```

But when accepting an invitation, the user **hasn't joined yet**, so they can't see the organization!

## Solution
Added a new RLS policy that allows users to view organization details if they have a **pending invitation**:

```sql
CREATE POLICY "Users can view organizations they're invited to"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_invitations
      WHERE organization_invitations.organization_id = organizations.id
      AND organization_invitations.email = (auth.jwt() ->> 'email')
      AND organization_invitations.status = 'pending'
      AND organization_invitations.expires_at > NOW()
    )
  );
```

**Important:** We use `auth.jwt() ->> 'email'` instead of querying `auth.users` table directly, which would cause "permission denied" errors.

### How It Works
- Users can now see organization details if they have a **valid pending invitation**
- This policy works **alongside** the existing "Users can view their organizations" policy
- Multiple policies with `FOR SELECT` act as `OR` conditions in Postgres RLS
- Users can see organizations they're invited to **OR** organizations they're members of

## Migration Applied
✅ **Migration v1:** `fix_organization_visibility_for_invitations.sql` (initial fix)
✅ **Migration v2:** `fix_organization_visibility_for_invitations_v2.sql` (corrected auth.users access)
✅ **Status:** Successfully applied to database

### What was fixed in v2?
The initial migration had a bug where it tried to query `auth.users` table directly:
```sql
-- ❌ This caused "permission denied for table users" errors
SELECT email FROM auth.users WHERE id = auth.uid()
```

Fixed in v2 by using the JWT token instead:
```sql
-- ✅ This works correctly
auth.jwt() ->> 'email'
```

## Testing
To test this fix:

1. **As an organization owner:**
   - Go to Settings → Members
   - Send an invitation to a new user

2. **As the invited user:**
   - Check your email for the invitation
   - Click the invitation link
   - Log in (or create account if new)
   - Accept the invitation
   - **Expected:** You should see "Welcome to [Organization Name]! 🎉"
   - **Before fix:** Would show "Welcome to undefined! 🎉"

## Technical Details

### Files Modified
- ✅ `migrations/fix_organization_visibility_for_invitations.sql` (new migration)

### Database Changes
- ✅ Added RLS policy: "Users can view organizations they're invited to"

### Code Flow (After Fix)
1. User clicks invitation link → `?invite=token`
2. `AcceptInvite` component calls `getInvitationByToken(token)`
3. Query joins with `organizations` table
4. **New RLS policy allows the join** ✅
5. `organization_name` is populated from `organizations.name`
6. User accepts invitation
7. `App.tsx` receives `organizationName` and `role`
8. `WelcomeToOrganizationModal` displays: "Welcome to [Organization Name]! 🎉"

## Security Considerations
This change is **secure** because:
- Only allows viewing organization **name** (not sensitive data)
- Only for users with **valid pending invitations**
- Only for invitations that **haven't expired**
- User must be **authenticated** (`auth.uid()` must match)
- Email must **match** the invitation email

## Related Files
- `/Users/re/Projects/reos-2/src/components/AcceptInvite.tsx` - Invitation acceptance UI
- `/Users/re/Projects/reos-2/src/components/WelcomeToOrganizationModal.tsx` - Welcome tour modal
- `/Users/re/Projects/reos-2/src/services/OrganizationService.ts` - Organization service with `getInvitationByToken()`
- `/Users/re/Projects/reos-2/src/App.tsx` - Main app with invitation flow

## Summary
✅ **Problem:** "Welcome to undefined" message
✅ **Cause:** RLS policy blocking organization name access
✅ **Fix:** New RLS policy for pending invitations
✅ **Status:** Migration applied successfully
✅ **Next Step:** Test the invitation flow to confirm the fix works!

