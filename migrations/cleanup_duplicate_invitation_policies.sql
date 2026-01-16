-- =====================================================
-- Cleanup Duplicate RLS Policies for organization_invitations
-- =====================================================

-- Drop ALL existing policies (including old ones)
DROP POLICY IF EXISTS "View organization invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Create organization invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Update organization invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Delete organization invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their organizations" ON organization_invitations;
DROP POLICY IF EXISTS "Owners can create invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Owners can delete invitations" ON organization_invitations;

-- Now create ONLY the correct policies
-- Policy 1: SELECT - Users can view invitations for their organizations
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

-- Policy 2: INSERT - Organization owners can create invitations
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

-- Policy 3: UPDATE - Users can update invitations sent to their email, or owners can update any invitation in their org
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

-- Policy 4: DELETE - Owners can delete invitations from their organization
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

