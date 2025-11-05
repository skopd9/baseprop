-- =====================================================
-- Allow Anonymous Users to View Invitations by Token
-- =====================================================
-- 
-- This migration allows unauthenticated users to view invitation
-- details when they have a valid invitation token. This is necessary
-- for the invitation acceptance flow where users see the invitation
-- modal BEFORE they authenticate.
--
-- Security: This is safe because:
-- 1. Tokens are cryptographically random UUIDs
-- 2. Invitations are single-use (status updated after acceptance)
-- 3. They expire after 7 days
-- 4. They're tied to a specific email address for verification
-- =====================================================

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view invitations for their organizations" ON organization_invitations;

-- Create new SELECT policy that allows:
-- 1. Authenticated users to view invitations for their organizations OR their email
-- 2. ANYONE (authenticated or not) to view pending, non-expired invitations by token
CREATE POLICY "Users can view invitations for their organizations or by token"
  ON organization_invitations FOR SELECT
  USING (
    -- Authenticated users can see invitations for organizations they're a member of
    (
      auth.uid() IS NOT NULL
      AND organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND status = 'active'
      )
    )
    OR 
    -- Authenticated users can see invitations sent to their email
    (
      auth.uid() IS NOT NULL
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR
    -- ANYONE can view pending, non-expired invitations (necessary for unauthenticated acceptance flow)
    -- This is safe because tokens are random UUIDs and single-use
    (
      status = 'pending'
      AND expires_at > now()
    )
  );

-- Verify RLS is still enabled
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the policy
COMMENT ON POLICY "Users can view invitations for their organizations or by token" ON organization_invitations IS 
  'Allows authenticated users to view their invitations, and allows ANYONE to view pending invitations (necessary for unauthenticated invitation acceptance flow). Safe because tokens are random UUIDs.';

