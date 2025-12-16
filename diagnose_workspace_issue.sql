-- =====================================================
-- Diagnostic Script: Find Missing "Resolute - USA" Workspace
-- =====================================================
-- Run this in your Supabase SQL Editor to diagnose the issue
-- =====================================================

-- STEP 1: Get your current user ID
-- Copy the 'id' value from the result for use in later queries
SELECT 
  id as user_id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your email
-- SAVE THIS USER_ID for the queries below!

-- =====================================================
-- STEP 2: Find the "Resolute - USA" organization
-- =====================================================
SELECT 
  id as organization_id,
  name,
  created_by,
  country_code,
  created_at,
  settings
FROM organizations 
WHERE name ILIKE '%resolute%' 
   OR name ILIKE '%usa%';

-- =====================================================
-- STEP 3: Check your membership in Resolute - USA
-- (Replace USER_ID_HERE with the ID from Step 1)
-- =====================================================
SELECT 
  om.id as membership_id,
  om.organization_id,
  o.name as organization_name,
  om.user_id,
  om.role,
  om.status,  -- Should be 'active'
  om.joined_at,
  om.invited_at,
  om.created_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'USER_ID_HERE'  -- Replace with your user ID
  AND o.name ILIKE '%resolute%usa%';

-- =====================================================
-- STEP 4: Check ALL your memberships (including inactive)
-- This helps identify if the record exists but is inactive
-- =====================================================
SELECT 
  om.id as membership_id,
  o.name as organization_name,
  om.role,
  om.status,
  om.joined_at,
  om.created_at,
  om.updated_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id  
WHERE om.user_id = 'USER_ID_HERE'  -- Replace with your user ID
ORDER BY om.created_at DESC;

-- =====================================================
-- STEP 5: Verify RLS functions are working
-- These should return TRUE if you're a member of any org
-- =====================================================
-- Test is_org_member function
SELECT is_org_member(
  (SELECT id FROM organizations WHERE name ILIKE '%resolute%usa%' LIMIT 1),
  'USER_ID_HERE'  -- Replace with your user ID
) as is_member;

-- Test is_org_owner function
SELECT is_org_owner(
  (SELECT id FROM organizations WHERE name ILIKE '%resolute%usa%' LIMIT 1),
  'USER_ID_HERE'  -- Replace with your user ID
) as is_owner;

-- =====================================================
-- STEP 6: Check if organization exists but has NO members
-- =====================================================
SELECT 
  o.id,
  o.name,
  o.created_by,
  COUNT(om.id) as member_count
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
WHERE o.name ILIKE '%resolute%usa%'
GROUP BY o.id, o.name, o.created_by;

-- =====================================================
-- DIAGNOSIS RESULTS:
-- =====================================================
-- 
-- If STEP 3 returns NO ROWS:
--   → Membership record is missing (use fix_option_a.sql)
--
-- If STEP 3 returns a row but status ≠ 'active':
--   → Status field is wrong (use fix_option_b.sql)
--
-- If STEP 2 returns NO ROWS:
--   → Organization itself is missing (contact support)
--
-- If STEP 5 returns FALSE:
--   → RLS functions not working properly (re-run migration)
--
-- =====================================================




