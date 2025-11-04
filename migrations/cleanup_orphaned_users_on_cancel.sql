-- =====================================================
-- Clean Up Orphaned Users When Invitation is Cancelled
-- This migration adds support for removing users from the database
-- when their invitation is cancelled and they have no organization memberships
-- =====================================================

-- 1. Add RLS policy to allow deleting own user_profile
-- This is needed for the cleanup process
DROP POLICY IF EXISTS "Users can delete own profile if no memberships" ON user_profiles;
CREATE POLICY "Users can delete own profile if no memberships"
  ON user_profiles FOR DELETE
  USING (
    auth.uid() = id 
    AND NOT EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = id 
      AND status = 'active'
    )
  );

-- 2. Create a function to safely delete orphaned users
-- This function can delete from auth.users (requires SECURITY DEFINER)
CREATE OR REPLACE FUNCTION delete_orphaned_user(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  membership_count INTEGER;
BEGIN
  -- Find user by email
  SELECT id INTO user_record
  FROM auth.users
  WHERE email = user_email;

  -- If user doesn't exist, return false
  IF user_record.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has any organization memberships
  SELECT COUNT(*) INTO membership_count
  FROM organization_members
  WHERE user_id = user_record.id;

  -- Only delete if user has no memberships
  IF membership_count = 0 THEN
    -- Delete from user_profiles first (if exists)
    DELETE FROM user_profiles WHERE id = user_record.id;
    
    -- Delete from auth.users (cascades to related tables)
    DELETE FROM auth.users WHERE id = user_record.id;
    
    RETURN TRUE;
  END IF;

  -- User has memberships, don't delete
  RETURN FALSE;
END;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_orphaned_user(TEXT) TO authenticated;

-- 4. Add comment explaining the function
COMMENT ON FUNCTION delete_orphaned_user IS 
  'Safely deletes a user account if they have no organization memberships. 
   Used when canceling invitations to clean up orphaned accounts.
   Returns TRUE if user was deleted, FALSE otherwise.';

-- 5. Create a view to help identify orphaned users (for debugging)
CREATE OR REPLACE VIEW orphaned_users_view AS
SELECT 
  au.id,
  au.email,
  au.created_at,
  up.has_completed_onboarding,
  COUNT(om.id) as membership_count,
  COUNT(oi.id) as pending_invitation_count
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN organization_members om ON om.user_id = au.id AND om.status = 'active'
LEFT JOIN organization_invitations oi ON oi.email = au.email AND oi.status = 'pending'
GROUP BY au.id, au.email, au.created_at, up.has_completed_onboarding
HAVING COUNT(om.id) = 0;

-- Grant access to authenticated users
GRANT SELECT ON orphaned_users_view TO authenticated;

COMMENT ON VIEW orphaned_users_view IS 
  'Shows users who have no active organization memberships (orphaned accounts).
   Useful for debugging and identifying accounts that were created but never completed onboarding.';

