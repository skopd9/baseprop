-- =====================================================
-- Fix Organization Members RLS (Remove Recursion)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners can remove members" ON organization_members;
DROP POLICY IF EXISTS "View organization members" ON organization_members;
DROP POLICY IF EXISTS "Insert organization members" ON organization_members;
DROP POLICY IF EXISTS "Update organization members" ON organization_members;
DROP POLICY IF EXISTS "Delete organization members" ON organization_members;

-- Simple non-recursive policy: Users can always see their own memberships
-- and memberships in the same organizations
CREATE POLICY "Users can view organization members"
  ON organization_members FOR SELECT
  USING (
    -- Can always see your own membership records
    user_id = auth.uid()
    OR
    -- Can see other members in organizations you belong to
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Policy for INSERT: Allow owners to add members, or allow accepting invitations
CREATE POLICY "Organization members can be added"
  ON organization_members FOR INSERT
  WITH CHECK (
    -- Owners can add members
    EXISTS (
      SELECT 1 
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.status = 'active'
    )
    OR
    -- Users can add themselves (when accepting invitations)
    user_id = auth.uid()
  );

-- Policy for UPDATE: Owners can update member records
CREATE POLICY "Organization members can be updated"
  ON organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.status = 'active'
    )
  );

-- Policy for DELETE: Owners can remove members
CREATE POLICY "Organization members can be deleted"
  ON organization_members FOR DELETE
  USING (
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

