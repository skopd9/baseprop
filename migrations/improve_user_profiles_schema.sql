-- =====================================================
-- Improve User Profiles Schema
-- Add email column for easier queries
-- Add helper view for user organizations
-- =====================================================

-- 1. Add email column to user_profiles for easier access
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 2. Create a trigger to sync email from auth.users
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

-- 4. Create a convenient view for user organizations
CREATE OR REPLACE VIEW user_organizations_view AS
SELECT 
  up.id as user_id,
  up.email as user_email,
  up.full_name,
  o.id as organization_id,
  o.name as organization_name,
  om.role,
  om.status,
  om.joined_at,
  o.settings as organization_settings,
  o.created_by = up.id as is_creator
FROM user_profiles up
INNER JOIN organization_members om ON om.user_id = up.id
INNER JOIN organizations o ON o.id = om.organization_id
WHERE om.status = 'active';

-- Grant access to authenticated users
GRANT SELECT ON user_organizations_view TO authenticated;

-- 5. Create helper function to get user's primary organization
CREATE OR REPLACE FUNCTION get_user_primary_organization(user_id_param UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    om.role
  FROM organizations o
  INNER JOIN organization_members om ON om.organization_id = o.id
  WHERE om.user_id = user_id_param 
    AND om.status = 'active'
  ORDER BY 
    CASE WHEN om.role = 'owner' THEN 1 ELSE 2 END,
    om.joined_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a function to get complete user profile with organizations
CREATE OR REPLACE FUNCTION get_complete_user_profile(user_id_param UUID DEFAULT auth.uid())
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  has_completed_onboarding BOOLEAN,
  onboarding_data JSONB,
  organizations JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.full_name,
    up.has_completed_onboarding,
    up.onboarding_data,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'role', om.role,
          'joined_at', om.joined_at,
          'settings', o.settings
        )
        ORDER BY om.joined_at ASC
      ) FILTER (WHERE o.id IS NOT NULL),
      '[]'::jsonb
    ) as organizations
  FROM user_profiles up
  LEFT JOIN organization_members om ON om.user_id = up.id AND om.status = 'active'
  LEFT JOIN organizations o ON o.id = om.organization_id
  WHERE up.id = user_id_param
  GROUP BY up.id, up.email, up.full_name, up.has_completed_onboarding, up.onboarding_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_primary_organization TO authenticated;
GRANT EXECUTE ON FUNCTION get_complete_user_profile TO authenticated;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check the improved schema
SELECT 
  'User Profile' as info,
  id,
  email,
  full_name,
  has_completed_onboarding
FROM user_profiles
WHERE id = auth.uid();

-- Use the new view
SELECT * FROM user_organizations_view WHERE user_id = auth.uid();

-- Use the helper function
SELECT * FROM get_complete_user_profile();

-- Test primary organization function
SELECT * FROM get_user_primary_organization(auth.uid());

