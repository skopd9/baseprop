-- Check the actual policy definitions for organization_members
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies 
WHERE tablename = 'organization_members'
ORDER BY cmd, policyname;

