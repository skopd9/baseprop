# Fix: No Organization Found (0 Workspaces)

## Problem
The app shows "0 workspaces" because your user account doesn't have an organization set up in the database.

## Quick Fix

### Option 1: Using Supabase SQL Editor (Recommended)

1. **Go to your Supabase Dashboard** → SQL Editor
2. **Run this diagnostic query first**:

```sql
-- Check your user profile
SELECT * FROM user_profiles WHERE id = auth.uid();

-- Check if any organizations exist
SELECT * FROM organizations;

-- Check organization memberships
SELECT * FROM organization_members WHERE user_id = auth.uid();
```

3. **If no organizations exist, create one**:

```sql
-- Create an organization for your account
DO $$
DECLARE
  current_user_id UUID;
  new_org_id UUID;
  user_email TEXT;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;

  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
  
  -- Create user profile if it doesn't exist
  INSERT INTO user_profiles (id, full_name, has_completed_onboarding)
  VALUES (current_user_id, COALESCE(user_email, 'User'), true)
  ON CONFLICT (id) DO UPDATE
  SET has_completed_onboarding = true;
  
  -- Create organization
  INSERT INTO organizations (name, created_by, settings)
  VALUES (COALESCE(user_email, 'My Organization') || '''s Workspace', current_user_id, '{}'::jsonb)
  RETURNING id INTO new_org_id;
  
  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
  VALUES (new_org_id, current_user_id, 'owner', 'active', NOW());
  
  RAISE NOTICE 'Created organization % for user %', new_org_id, current_user_id;
END $$;
```

4. **Refresh your app** - You should now see "1 workspace"

### Option 2: Through the App UI

1. Complete the onboarding wizard in the app (it should create an organization)
2. If onboarding doesn't show, the migration might not have run

### Option 3: Re-run the Migration

If the tables don't exist at all:

1. Go to Supabase Dashboard → SQL Editor
2. Open the file: `/Users/re/Projects/reos-2/migrations/add_auth_and_organizations_FIXED.sql`
3. Copy and paste the entire content
4. Run it in SQL Editor
5. Then run the fix from Option 1

## Verify the Fix

After running the fix, check:

```sql
-- Should return your organization(s)
SELECT 
  o.id,
  o.name,
  om.role,
  om.status
FROM organizations o
INNER JOIN organization_members om ON om.organization_id = o.id
WHERE om.user_id = auth.uid() AND om.status = 'active';
```

## Common Issues

### Issue: "No authenticated user found"
- You need to be logged into Supabase SQL Editor
- Or run the SQL while logged into your app

### Issue: Tables don't exist
- Run the migration first: `add_auth_and_organizations_FIXED.sql`

### Issue: RLS Policies blocking
- The policies should allow users to see their own organizations
- If still blocked, temporarily disable RLS to debug:
```sql
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
```

### Issue: Still showing 0 workspaces after fix
- Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)
- Clear localStorage: Open browser console and run `localStorage.clear()` then refresh
- Check browser console for errors

## Prevention

To prevent this in the future, make sure the onboarding wizard completes successfully and creates an organization. The wizard is in the "Get Started" tab.

