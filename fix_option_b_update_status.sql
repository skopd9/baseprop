-- =====================================================
-- FIX OPTION B: Update Membership Status to Active
-- =====================================================
-- Use this if the membership record exists but status is not 'active'
-- Run this in your Supabase SQL Editor
-- =====================================================

-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with your actual user ID

-- Check current status before fix
SELECT 
  om.id,
  o.name as organization_name,
  om.role,
  om.status,  -- This should show something other than 'active'
  om.joined_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'YOUR_USER_ID_HERE'  -- Replace with your user ID
  AND o.name ILIKE '%resolute%usa%';

-- Update the status to 'active'
UPDATE organization_members
SET 
  status = 'active',
  updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with your user ID
  AND organization_id = (
    SELECT id FROM organizations 
    WHERE name ILIKE '%resolute%usa%' 
    LIMIT 1
  );

-- Verify the fix worked
SELECT 
  om.id,
  o.name as organization_name,
  om.role,
  om.status,  -- Should now be 'active'
  om.joined_at,
  om.updated_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'YOUR_USER_ID_HERE'  -- Replace with your user ID
  AND o.name ILIKE '%resolute%usa%';

-- =====================================================
-- SUCCESS: Status should now be 'active'
-- Refresh your application to see the workspace appear
-- =====================================================




