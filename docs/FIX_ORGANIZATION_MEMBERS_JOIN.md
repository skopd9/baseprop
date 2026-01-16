# Organization Members Join Fix

## Problem

The application was throwing a 400 Bad Request error when trying to fetch organization members:

```
GET .../organization_members?select=*,user_profiles!user_id(full_name)&organization_id=eq.xxx&status=eq.active
```

Error: `400 (Bad Request)`

## Root Cause

The `organization_members` table had a foreign key to `auth.users.id`, but the query was trying to join with `user_profiles` using the hint syntax `user_profiles!user_id`. PostgREST couldn't find a foreign key relationship from `organization_members.user_id` to `user_profiles`, causing the join to fail.

## Solution

### 1. Added Foreign Key Constraint

Created migration `add_organization_members_to_user_profiles_fk.sql` that:

- Adds a foreign key from `organization_members.user_id` to `user_profiles.id`
- Drops the old constraint to `auth.users.id` if it existed
- Uses `ON DELETE CASCADE` to maintain referential integrity

```sql
ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES user_profiles(id) 
  ON DELETE CASCADE;
```

### 2. Updated Query in OrganizationService

Modified `getOrganizationMembers` method to:

- Use the simplified join syntax: `user_profiles (full_name, email)` 
- Removed the complex `auth.admin.getUserById` calls (no longer needed)
- Directly fetch email from `user_profiles` table

**Before:**
```typescript
.select(`
  *,
  user_profiles!user_id (
    full_name
  )
`)
// Then manually fetch emails using auth.admin.getUserById
```

**After:**
```typescript
.select(`
  *,
  user_profiles (
    full_name,
    email
  )
`)
// Email is already included in the join
```

## Benefits

1. ✅ **Fixes the 400 error** - PostgREST can now properly join the tables
2. ✅ **Better performance** - Single query instead of multiple auth.admin calls
3. ✅ **Simplified code** - No need for complex Promise.all mapping
4. ✅ **Consistent data model** - All user data flows through user_profiles

## Testing

To verify the fix works:

1. Navigate to Organization Settings in the app
2. Check that the "Team Members" section loads without errors
3. Verify member names and emails display correctly

## Related Files

- `/Users/re/Projects/reos-2/migrations/add_organization_members_to_user_profiles_fk.sql` - New migration
- `/Users/re/Projects/reos-2/src/services/OrganizationService.ts` - Updated query

## Database Schema Change

```
organization_members
├── user_id (UUID)
└── [FK] → user_profiles.id (was: auth.users.id)
```

This change aligns with the pattern where `user_profiles` is the extended profile table for authenticated users, and all application-level relationships should reference `user_profiles` rather than directly referencing `auth.users`.

