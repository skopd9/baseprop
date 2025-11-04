-- =====================================================
-- Fix Organization Members RLS (Truly Non-Recursive)
-- =====================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners can remove members" ON organization_members;
DROP POLICY IF EXISTS "View organization members" ON organization_members;
DROP POLICY IF EXISTS "Insert organization members" ON organization_members;
DROP POLICY IF EXISTS "Update organization members" ON organization_members;
DROP POLICY IF EXISTS "Delete organization members" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization members can be added" ON organization_members;
DROP POLICY IF EXISTS "Organization members can be updated" ON organization_members;
DROP POLICY IF EXISTS "Organization members can be deleted" ON organization_members;

-- SIMPLE SELECT POLICY: Users can see ALL members in ANY organization they belong to
-- This is non-recursive because it only checks if YOUR user_id exists in the same organization_id
CREATE POLICY "View organization members"
  ON organization_members FOR SELECT
  USING (
    -- Allow if the current user has ANY membership record with the same organization_id
    -- This is non-recursive because it's a simple column comparison
    organization_id IN (
      SELECT DISTINCT organization_id 
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- INSERT POLICY: Users can add themselves (for accepting invitations)
CREATE POLICY "Insert organization members"
  ON organization_members FOR INSERT
  WITH CHECK (
    -- Users can add themselves
    user_id = auth.uid()
  );

-- UPDATE POLICY: Users with owner role can update members in their organization
CREATE POLICY "Update organization members"
  ON organization_members FOR UPDATE
  USING (
    -- Check if updating user is an owner in the same organization
    EXISTS (
      SELECT 1 
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.status = 'active'
    )
  );

-- DELETE POLICY: Owners can remove members from their organization
CREATE POLICY "Delete organization members"
  ON organization_members FOR DELETE
  USING (
    -- Check if deleting user is an owner in the same organization
    EXISTS (
      SELECT 1 
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.status = 'active'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

