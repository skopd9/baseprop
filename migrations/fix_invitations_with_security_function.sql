-- =====================================================
-- Fix Organization Invitations with Security Definer Function
-- =====================================================

-- Step 1: Create a security definer function to check organization ownership
-- This function bypasses RLS and can be used in policies
CREATE OR REPLACE FUNCTION is_organization_owner(org_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = org_id 
    AND organization_members.user_id = is_organization_owner.user_id
    AND role = 'owner' 
    AND status = 'active'
  );
END;
$$;

-- Step 2: Create a security definer function to check organization membership
CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = org_id 
    AND organization_members.user_id = is_organization_member.user_id
    AND status = 'active'
  );
END;
$$;

-- Step 3: Drop ALL existing invitation policies
DROP POLICY IF EXISTS "View organization invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Create organization invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Update organization invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Delete organization invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their organizations" ON organization_invitations;
DROP POLICY IF EXISTS "Owners can create invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Owners can delete invitations" ON organization_invitations;

-- Step 4: Create new policies using the security definer functions
-- Policy 1: SELECT - Users can view invitations for their organizations
CREATE POLICY "Users can view invitations for their organizations"
  ON organization_invitations FOR SELECT
  USING (
    is_organization_member(organization_id, auth.uid())
    OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy 2: INSERT - Organization owners can create invitations
CREATE POLICY "Owners can create invitations"
  ON organization_invitations FOR INSERT
  WITH CHECK (
    is_organization_owner(organization_id, auth.uid())
  );

-- Policy 3: UPDATE - Users can update invitations sent to their email, or owners can update any invitation in their org
CREATE POLICY "Users can update their own invitations"
  ON organization_invitations FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    is_organization_owner(organization_id, auth.uid())
  );

-- Policy 4: DELETE - Owners can delete invitations from their organization
CREATE POLICY "Owners can delete invitations"
  ON organization_invitations FOR DELETE
  USING (
    is_organization_owner(organization_id, auth.uid())
  );

-- Verify RLS is enabled
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Grant execute permissions on the functions to authenticated users
GRANT EXECUTE ON FUNCTION is_organization_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_organization_member(UUID, UUID) TO authenticated;

