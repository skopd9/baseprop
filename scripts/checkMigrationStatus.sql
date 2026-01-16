-- =====================================================
-- Check Migration Status
-- Run this to see if the auth & organization migration ran successfully
-- =====================================================

-- 1. Check if required tables exist
SELECT 
  'user_profiles' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) as exists;

SELECT 
  'organizations' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) as exists;

SELECT 
  'organization_members' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organization_members'
  ) as exists;

-- 2. Check table structures
\d user_profiles
\d organizations
\d organization_members

-- 3. Check current user's data
SELECT 
  'Current User' as info_type,
  auth.uid() as user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as email,
  (SELECT COUNT(*) FROM user_profiles WHERE id = auth.uid()) as has_profile,
  (SELECT COUNT(*) FROM organization_members WHERE user_id = auth.uid()) as org_memberships;

-- 4. Check organizations
SELECT 
  COUNT(*) as total_organizations,
  COUNT(CASE WHEN created_by = auth.uid() THEN 1 END) as my_organizations
FROM organizations;

-- 5. Check organization memberships for current user
SELECT 
  o.id,
  o.name,
  om.role,
  om.status,
  om.joined_at
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
WHERE om.user_id = auth.uid();

-- 6. If no results above, check if RLS is blocking
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'organizations', 'organization_members');

