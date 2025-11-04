-- =====================================================
-- Fix User Profiles Visibility for Organization Members
-- Allow organization members to view each other's profiles
-- =====================================================

-- 1. Ensure email column exists in user_profiles
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 2. Create/update trigger to sync email from auth.users
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Get email from auth.users
  NEW.email := (SELECT email FROM auth.users WHERE id = NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger on insert and update
DROP TRIGGER IF EXISTS sync_user_email_on_insert ON user_profiles;
CREATE TRIGGER sync_user_email_on_insert
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

DROP TRIGGER IF EXISTS sync_user_email_on_update ON user_profiles;
CREATE TRIGGER sync_user_email_on_update
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- 3. Backfill existing user profiles with emails
UPDATE user_profiles up
SET email = (SELECT email FROM auth.users WHERE id = up.id)
WHERE email IS NULL;

-- 4. Create security definer function to check if two users share an organization
CREATE OR REPLACE FUNCTION users_share_organization(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = user1_id
      AND om2.user_id = user2_id
      AND om1.status = 'active'
      AND om2.status = 'active'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION users_share_organization TO authenticated;

-- 5. Add RLS policy to allow organization members to view each other's profiles
DROP POLICY IF EXISTS "Organization members can view each other's profiles" ON user_profiles;
CREATE POLICY "Organization members can view each other's profiles"
  ON user_profiles FOR SELECT
  USING (
    -- Can view your own profile
    auth.uid() = id
    OR
    -- Can view profiles of users in the same organization
    users_share_organization(auth.uid(), id)
  );

-- 6. Remove the old restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check user profiles have emails
SELECT 
  'User profiles with emails' as check_name,
  COUNT(*) as count
FROM user_profiles
WHERE email IS NOT NULL;

-- Check if current user can see organization members' profiles
SELECT 
  'Visible member profiles' as check_name,
  up.id,
  up.email,
  up.full_name
FROM user_profiles up
JOIN organization_members om ON om.user_id = up.id
WHERE om.organization_id IN (
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = auth.uid() 
  AND status = 'active'
);

