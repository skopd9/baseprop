-- =====================================================
-- Fix RLS Policies for organization_invitations
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view invitations for their organizations" ON organization_invitations;
DROP POLICY IF EXISTS "Owners can create invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON organization_invitations;

-- Policy 1: Users can view invitations for organizations they belong to, OR invitations sent to their email
CREATE POLICY "Users can view invitations for their organizations"
  ON organization_invitations FOR SELECT
  USING (
    -- Can see invitations for organizations they're a member of
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
    OR 
    -- Can see invitations sent to their email
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy 2: Organization owners can create invitations
CREATE POLICY "Owners can create invitations"
  ON organization_invitations FOR INSERT
  WITH CHECK (
    -- Must be an owner of the organization
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner' 
      AND status = 'active'
    )
  );

-- Policy 3: Users can update invitations sent to their email, or owners can update any invitation in their org
CREATE POLICY "Users can update their own invitations"
  ON organization_invitations FOR UPDATE
  USING (
    -- Can update invitations sent to their email
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    -- Owners can update any invitation in their organization
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner' 
      AND status = 'active'
    )
  );

-- Policy 4: Owners can delete invitations from their organization
DROP POLICY IF EXISTS "Owners can delete invitations" ON organization_invitations;
CREATE POLICY "Owners can delete invitations"
  ON organization_invitations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner' 
      AND status = 'active'
    )
  );

-- Verify RLS is enabled
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

