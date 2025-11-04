-- =====================================================
-- Add Foreign Key from organization_members to user_profiles
-- This allows PostgREST to properly join the tables
-- =====================================================

-- First, ensure all user_ids in organization_members have corresponding user_profiles
-- If not, this will fail and we need to create the missing profiles
DO $$
BEGIN
  -- Check if there are any orphaned user_ids
  IF EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE NOT EXISTS (
      SELECT 1 FROM user_profiles up WHERE up.id = om.user_id
    )
  ) THEN
    RAISE EXCEPTION 'Found organization_members with user_ids that do not exist in user_profiles. Please ensure all users have profiles.';
  END IF;
END $$;

-- Add foreign key from organization_members.user_id to user_profiles.id
-- This allows PostgREST to join the tables properly
ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES user_profiles(id) 
  ON DELETE CASCADE;

