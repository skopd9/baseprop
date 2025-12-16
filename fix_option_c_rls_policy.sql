-- =====================================================
-- FIX OPTION C: Re-apply RLS Policies and Functions
-- =====================================================
-- Use this if membership records exist but RLS is blocking access
-- This re-applies the security definer functions that prevent infinite recursion
-- =====================================================

-- Step 1: Create security definer function to check organization membership
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Step 2: Create security definer function to check if user is org owner
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Step 3: Get list of organization IDs user belongs to
CREATE OR REPLACE FUNCTION user_organization_ids(user_id_param UUID)
RETURNS TABLE (organization_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = user_id_param
  AND om.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Step 4: Drop all existing policies on organization_members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members where they belong" ON organization_members;
DROP POLICY IF EXISTS "Owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Users can insert their own membership or owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners can update organization members" ON organization_members;
DROP POLICY IF EXISTS "Owners can remove members" ON organization_members;
DROP POLICY IF EXISTS "Owners can remove organization members" ON organization_members;
DROP POLICY IF EXISTS "View organization members" ON organization_members;
DROP POLICY IF EXISTS "Insert organization members" ON organization_members;
DROP POLICY IF EXISTS "Update organization members" ON organization_members;
DROP POLICY IF EXISTS "Delete organization members" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization members can be added" ON organization_members;
DROP POLICY IF EXISTS "Organization members can be updated" ON organization_members;
DROP POLICY IF EXISTS "Organization members can be deleted" ON organization_members;

-- Step 5: Create new policies using security definer functions
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

-- Step 6: Update Organizations Policies to use helper functions
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;
DROP POLICY IF EXISTS "View organizations" ON organizations;
DROP POLICY IF EXISTS "Create organizations" ON organizations;
DROP POLICY IF EXISTS "Update organizations" ON organizations;
DROP POLICY IF EXISTS "Delete organizations" ON organizations;

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
-- Test the fix
-- Replace YOUR_USER_ID_HERE with your actual user ID
-- =====================================================

-- This should return TRUE if you're a member
SELECT is_org_member(
  (SELECT id FROM organizations WHERE name ILIKE '%resolute%usa%' LIMIT 1),
  'YOUR_USER_ID_HERE'
) as is_member;

-- This should return TRUE if you're an owner
SELECT is_org_owner(
  (SELECT id FROM organizations WHERE name ILIKE '%resolute%usa%' LIMIT 1),
  'YOUR_USER_ID_HERE'
) as is_owner;

-- =====================================================
-- SUCCESS: RLS policies have been re-applied
-- Refresh your application to see the workspace appear
-- =====================================================




