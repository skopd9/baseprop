-- =====================================================
-- Fix Organization Visibility for Pending Invitations (v2)
-- =====================================================
-- Problem: The previous version tried to query auth.users directly,
-- which causes "permission denied for table users" errors.
--
-- Solution: Use auth.jwt() to get the user's email from the JWT token
-- instead of querying the auth.users table.
-- =====================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view organizations they're invited to" ON organizations;

-- Recreate with proper auth.jwt() usage
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

-- Note: auth.jwt() ->> 'email' extracts the email from the JWT token
-- This is the correct way to get user email in RLS policies without querying auth.users

