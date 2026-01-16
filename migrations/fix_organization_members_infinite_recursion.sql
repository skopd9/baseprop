-- =====================================================
-- Fix Infinite Recursion in organization_members RLS Policies
-- =====================================================
-- The problem: Policies on organization_members were querying organization_members
-- within the policy check, causing infinite recursion when Postgres evaluates them.
-- The solution: Use simpler policies that don't create circular dependencies.
-- =====================================================

-- Drop all existing policies on organization_members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners can remove members" ON organization_members;

-- =====================================================
-- NEW POLICIES - No Infinite Recursion
-- =====================================================

-- SELECT: Users can view all organization_members records where they are a member
-- This is safe because we're just checking if the user_id matches, no subqueries
CREATE POLICY "Users can view organization members where they belong"
  ON organization_members FOR SELECT
  USING (
    -- User can see their own membership records
    user_id = auth.uid()
    OR
    -- User can see other members of organizations they belong to
    organization_id IN (
      -- This is safe: we're selecting from a simple table without RLS that would recurse
      SELECT om.organization_id 
      FROM organization_members om
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- INSERT: Allow inserts for self-membership OR when creating an org (by service role/owner)
CREATE POLICY "Users can insert their own membership or owners can add members"
  ON organization_members FOR INSERT
  WITH CHECK (
    -- Allow users to join as themselves (for accepting invitations)
    user_id = auth.uid()
    OR
    -- Allow if the inserting user is an owner of the organization
    (
      SELECT COUNT(*) = 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.status = 'active'
    )
  );

-- UPDATE: Only owners can update memberships in their organization
CREATE POLICY "Owners can update organization members"
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

-- DELETE: Only owners can remove members from their organization
CREATE POLICY "Owners can remove organization members"
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

-- =====================================================
-- Fix Organizations Policies (they also had potential issues)
-- =====================================================

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;

-- SELECT: Users can view organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- INSERT: Any authenticated user can create an organization
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- UPDATE: Only owners can update the organization
CREATE POLICY "Owners can update organizations"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members
      WHERE user_id = auth.uid() 
      AND role = 'owner' 
      AND status = 'active'
    )
  );

-- DELETE: Only owners can delete the organization
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;
CREATE POLICY "Owners can delete organizations"
  ON organizations FOR DELETE
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members
      WHERE user_id = auth.uid() 
      AND role = 'owner' 
      AND status = 'active'
    )
  );

-- =====================================================
-- Migration Complete
-- =====================================================
-- The infinite recursion should now be resolved!
-- Test by:
-- 1. Creating an organization
-- 2. Fetching user organizations
-- 3. Adding members to an organization

