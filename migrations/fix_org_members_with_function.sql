-- =====================================================
-- Fix Organization Members RLS with Security Definer Function
-- =====================================================

-- Step 1: Create a security definer function that bypasses RLS
-- to check if a user belongs to an organization
CREATE OR REPLACE FUNCTION user_belongs_to_org(check_org_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE organization_id = check_org_id
    AND user_id = check_user_id
    AND status = 'active'
  );
$$;

-- Step 2: Create a security definer function to check if user is owner
CREATE OR REPLACE FUNCTION user_is_org_owner(check_org_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE organization_id = check_org_id
    AND user_id = check_user_id
    AND role = 'owner'
    AND status = 'active'
  );
$$;

-- Step 3: Get all organization IDs for a user (security definer)
CREATE OR REPLACE FUNCTION get_user_org_ids(check_user_id UUID)
RETURNS TABLE (organization_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT organization_id 
  FROM organization_members
  WHERE user_id = check_user_id
  AND status = 'active';
$$;

-- Step 4: Drop ALL existing policies on organization_members
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

-- Step 5: Create NEW non-recursive policies using the security definer functions

-- SELECT: Users can see members in organizations they belong to
CREATE POLICY "View organization members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
  );

-- INSERT: Users can add themselves (for accepting invitations)
CREATE POLICY "Insert organization members"
  ON organization_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- UPDATE: Owners can update members in their organization
CREATE POLICY "Update organization members"
  ON organization_members FOR UPDATE
  USING (
    user_is_org_owner(organization_id, auth.uid())
  );

-- DELETE: Owners can remove members from their organization
CREATE POLICY "Delete organization members"
  ON organization_members FOR DELETE
  USING (
    user_is_org_owner(organization_id, auth.uid())
  );

-- Step 6: Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION user_belongs_to_org(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_org_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_org_ids(UUID) TO authenticated;

-- Step 7: Ensure RLS is enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

