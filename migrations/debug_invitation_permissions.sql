-- =====================================================
-- Debug Organization Invitations Permissions
-- =====================================================

-- 1. Check your current user ID and email
SELECT 
  'Current User' as check_type,
  auth.uid() as user_id,
  u.email as user_email
FROM auth.users u
WHERE u.id = auth.uid();

-- 2. Check your organization memberships
SELECT 
  'Your Organizations' as check_type,
  om.organization_id,
  om.user_id,
  om.role,
  om.status,
  o.name as org_name
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = auth.uid();

-- 3. Check if the subquery in the policy works
SELECT 
  'Policy Subquery Test' as check_type,
  organization_id 
FROM organization_members 
WHERE user_id = auth.uid() 
AND status = 'active';

-- 4. Check RLS policies on organization_members (this might reveal recursion issues)
SELECT 
  'Organization Members Policies' as check_type,
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'organization_members';

-- 5. Try to manually check if the invitation query would work
-- Replace the organization_id below with your actual org ID: 5593efce-282a-4957-8def-8e80698a44be
SELECT 
  'Test Invitation Query' as check_type,
  *
FROM organization_invitations
WHERE organization_id = '5593efce-282a-4957-8def-8e80698a44be'
LIMIT 5;

