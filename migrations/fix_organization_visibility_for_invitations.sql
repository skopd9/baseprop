-- =====================================================
-- Fix Organization Visibility for Pending Invitations
-- =====================================================
-- Problem: When users try to accept an invitation, they can't see
-- the organization name because the RLS policy requires them to be
-- an active member. But they haven't accepted yet!
--
-- Solution: Add a policy that allows users to view organization
-- details if they have a pending invitation to that organization.
-- =====================================================

-- Add policy to allow viewing organization if user has a pending invitation
DROP POLICY IF EXISTS "Users can view organizations they're invited to" ON organizations;
CREATE POLICY "Users can view organizations they're invited to"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_invitations
      WHERE organization_invitations.organization_id = organizations.id
      AND organization_invitations.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
      AND organization_invitations.status = 'pending'
      AND organization_invitations.expires_at > NOW()
    )
  );

-- Note: This policy works alongside the existing "Users can view their organizations" policy
-- Users will be able to see organizations they're invited to OR organizations they're members of









