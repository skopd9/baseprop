# Organization Invite Bug Fix

## Problem
When trying to invite a member to an organization with 0 members, you got the error:
```
User is already a member of this organization
```

## Root Cause
In `OrganizationService.ts`, the `inviteUser` method had a critical bug on line 205:

```typescript
// WRONG - Was checking if the CURRENT USER is a member
.eq('user_id', (await supabase.auth.getUser()).data.user?.id)
```

This was checking if **you** (the person sending the invite) were already a member, instead of checking if the **email being invited** was already a member.

## Solution

### 1. Fixed `inviteUser` method
Simplified the logic to:
- ✅ Only check for duplicate pending invitations
- ✅ Remove the problematic user lookup that was causing permission errors
- ✅ Let the membership check happen during invitation acceptance (proper place)

**New logic:**
```typescript
static async inviteUser(orgId, email, role, invitedBy) {
  // Check if there's already a pending invitation for this email
  const { data: existingInvites } = await supabase
    .from('organization_invitations')
    .select('id, status')
    .eq('organization_id', orgId)
    .eq('email', email)
    .eq('status', 'pending');

  if (existingInvites && existingInvites.length > 0) {
    throw new Error('An invitation has already been sent to this email');
  }

  // Create invitation (no user lookup needed)
  // ...
}
```

### 2. Enhanced `acceptInvitation` method
Added proper membership check when accepting invitations:
- ✅ Checks if user is already a member before adding them
- ✅ Gracefully handles duplicate acceptance attempts
- ✅ Still marks invitation as accepted even if already a member

**New logic:**
```typescript
static async acceptInvitation(token, userId) {
  // ... validate invitation and email ...
  
  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', invitation.organization_id)
    .eq('user_id', userId)
    .single();

  if (existingMember) {
    // Already a member - just mark invitation as accepted
    await supabase
      .from('organization_invitations')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('token', token);
    return; // Nothing more to do
  }

  // Add user to organization
  // ...
}
```

## Benefits
1. ✅ Fixed the immediate bug - you can now invite members when you have 0 members
2. ✅ Prevented permission errors from trying to access protected user tables
3. ✅ Added duplicate invitation checking
4. ✅ Made invitation acceptance idempotent (safe to call multiple times)
5. ✅ Cleaner separation of concerns (membership check happens at acceptance time)

## Testing
Try inviting a member now - it should work! You can:
- ✅ Invite users to your organization
- ✅ Send multiple invites to different emails
- ✅ Get proper error if you try to send duplicate invites to the same email
- ✅ Accept invitations without errors even if somehow already a member

