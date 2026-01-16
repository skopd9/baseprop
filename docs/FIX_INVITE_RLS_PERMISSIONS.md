# Fix Organization Invitations RLS Permissions

## Problem
Getting **403 Forbidden** errors when trying to invite members:
```
Failed to load resource: the server responded with a status of 403
```

This is a **Row Level Security (RLS)** policy issue in Supabase. The policies on the `organization_invitations` table are preventing you from reading/writing invitations.

## Solution

You need to run a database migration to fix the RLS policies.

### Method 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste this SQL**
   - Open the file: `migrations/fix_organization_invitations_rls.sql`
   - Copy ALL the contents
   - Paste into the SQL editor

4. **Run the migration**
   - Click "Run" or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)
   - You should see "Success. No rows returned"

5. **Refresh your app**
   - Go back to your application
   - Refresh the page
   - Try inviting a member again

### Method 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Apply the migration
supabase db push

# Or run the specific migration file
supabase db execute --file migrations/fix_organization_invitations_rls.sql
```

## What This Migration Does

The migration fixes the RLS policies to:

1. ✅ **SELECT Policy**: Allow organization members to view invitations for their organization
2. ✅ **INSERT Policy**: Allow organization owners to create invitations
3. ✅ **UPDATE Policy**: Allow users to update invitations sent to their email (for accepting)
4. ✅ **DELETE Policy**: Allow organization owners to delete/cancel invitations

The policies use `IN` subqueries instead of `EXISTS` to avoid recursion issues.

## After Running the Migration

You should be able to:
- ✅ View pending invitations in your organization settings
- ✅ Send invitations to new members
- ✅ Accept invitations sent to your email
- ✅ Remove/cancel pending invitations

## Troubleshooting

### Still getting 403 errors?

1. **Check if the migration ran successfully**
   - In Supabase Dashboard → SQL Editor
   - Run: `SELECT * FROM pg_policies WHERE tablename = 'organization_invitations';`
   - You should see 4 policies listed

2. **Verify you're an organization owner**
   - Run in SQL Editor:
   ```sql
   SELECT 
     om.role,
     o.name as organization_name
   FROM organization_members om
   JOIN organizations o ON o.id = om.organization_id
   WHERE om.user_id = auth.uid()
   AND om.status = 'active';
   ```
   - You should see your role as 'owner'

3. **Check for infinite recursion issues**
   - If you see this error, you may need to run: `migrations/fix_organization_members_recursion_v2.sql`

4. **Clear browser cache**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

## Need Help?

If you're still having issues after running the migration, check:
- Are you logged in to Supabase?
- Is your user associated with the organization?
- Do you have the correct organization selected?

Run this debug query in Supabase SQL Editor:
```sql
-- Check your organization membership
SELECT 
  u.email,
  o.name as org_name,
  om.role,
  om.status
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE u.id = auth.uid();
```

