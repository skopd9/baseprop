-- =====================================================
-- Fix Infinite Recursion in organization_members RLS Policies (v2)
-- =====================================================
-- Better approach: Use security definer functions to bypass RLS
-- and simpler policies that don't query the same table
-- =====================================================

-- Create a security definer function to check organization membership
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE organization_id = org_id
    AND user_id = user_id_param
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a security definer function to check if user is org owner
CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE organization_id = org_id
    AND user_id = user_id_param
    AND role = 'owner'
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get list of organization IDs user belongs to
CREATE OR REPLACE FUNCTION user_organization_ids(user_id_param UUID)
RETURNS TABLE (organization_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = user_id_param
  AND om.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Drop all existing policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members where they belong" ON organization_members;
DROP POLICY IF EXISTS "Owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Users can insert their own membership or owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners can update organization members" ON organization_members;
DROP POLICY IF EXISTS "Owners can remove members" ON organization_members;
DROP POLICY IF EXISTS "Owners can remove organization members" ON organization_members;

-- =====================================================
-- NEW POLICIES - Using Security Definer Functions
-- =====================================================

-- SELECT: Users can view members of organizations they belong to
CREATE POLICY "View organization members"
  ON organization_members FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

-- INSERT: Users can add themselves OR owners can add others
CREATE POLICY "Insert organization members"
  ON organization_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    OR 
    is_org_owner(organization_id, auth.uid())
  );

-- UPDATE: Only owners can update memberships
CREATE POLICY "Update organization members"
  ON organization_members FOR UPDATE
  USING (is_org_owner(organization_id, auth.uid()));

-- DELETE: Only owners can remove members
CREATE POLICY "Delete organization members"
  ON organization_members FOR DELETE
  USING (is_org_owner(organization_id, auth.uid()));

-- =====================================================
-- Update Organizations Policies to use helper functions
-- =====================================================

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;

-- SELECT: Users can view organizations they belong to
CREATE POLICY "View organizations"
  ON organizations FOR SELECT
  USING (is_org_member(id, auth.uid()));

-- INSERT: Any authenticated user can create an organization
CREATE POLICY "Create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- UPDATE: Only owners can update
CREATE POLICY "Update organizations"
  ON organizations FOR UPDATE
  USING (is_org_owner(id, auth.uid()));

-- DELETE: Only owners can delete
CREATE POLICY "Delete organizations"
  ON organizations FOR DELETE
  USING (is_org_owner(id, auth.uid()));

-- =====================================================
-- Update Organization Invitations Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view invitations for their organizations" ON organization_invitations;
DROP POLICY IF EXISTS "Owners can create invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON organization_invitations;

-- SELECT: Members can view invitations OR invited user can view their own
CREATE POLICY "View organization invitations"
  ON organization_invitations FOR SELECT
  USING (
    is_org_member(organization_id, auth.uid())
    OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- INSERT: Only owners can create invitations
CREATE POLICY "Create organization invitations"
  ON organization_invitations FOR INSERT
  WITH CHECK (is_org_owner(organization_id, auth.uid()));

-- UPDATE: Owners or invited users can update
CREATE POLICY "Update organization invitations"
  ON organization_invitations FOR UPDATE
  USING (
    is_org_owner(organization_id, auth.uid())
    OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- DELETE: Only owners can delete invitations
DROP POLICY IF EXISTS "Delete organization invitations" ON organization_invitations;
CREATE POLICY "Delete organization invitations"
  ON organization_invitations FOR DELETE
  USING (is_org_owner(organization_id, auth.uid()));

-- =====================================================
-- Migration Complete
-- =====================================================
-- All policies now use SECURITY DEFINER functions which bypass RLS
-- This completely eliminates the infinite recursion problem!

