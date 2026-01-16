-- =====================================================
-- FIX OPTION A: Restore Missing Membership Record
-- =====================================================
-- Use this if the membership record was completely deleted
-- Run this in your Supabase SQL Editor
-- =====================================================

-- IMPORTANT: Replace these placeholders before running:
-- 1. Replace 'YOUR_USER_ID_HERE' with your actual user ID from diagnose_workspace_issue.sql Step 1
-- 2. Verify the organization name matches exactly

-- First, verify the organization exists
SELECT id, name, created_by 
FROM organizations 
WHERE name ILIKE '%resolute%usa%';

-- Insert the missing membership record
-- This restores you as an owner with active status
INSERT INTO organization_members (
  organization_id, 
  user_id, 
  role, 
  status, 
  joined_at,
  invited_at,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM organizations WHERE name ILIKE '%resolute%usa%' LIMIT 1),
  'YOUR_USER_ID_HERE',  -- Replace with your user ID
  'owner',
  'active',
  NOW(),
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (organization_id, user_id) DO UPDATE
SET 
  status = 'active',
  role = 'owner',
  updated_at = NOW();

-- Verify the fix worked
SELECT 
  om.id,
  o.name as organization_name,
  om.role,
  om.status,
  om.joined_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'YOUR_USER_ID_HERE'  -- Replace with your user ID
  AND o.name ILIKE '%resolute%usa%';

-- =====================================================
-- SUCCESS: You should now see your membership record
-- Refresh your application to see the workspace appear
-- =====================================================




