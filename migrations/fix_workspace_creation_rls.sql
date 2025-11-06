-- =====================================================
-- Fix Workspace Creation RLS Policy
-- Ensures users can create workspaces (organizations)
-- =====================================================

-- Drop existing policy if it exists (in case it's misconfigured)
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- Create the policy with explicit NULL check
-- This ensures authenticated users can create organizations where they are the creator
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = created_by
  );

-- Grant necessary permissions (should already be granted, but ensure it)
GRANT INSERT ON organizations TO authenticated;
GRANT SELECT ON organizations TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This policy allows any authenticated user to create an organization
-- where they are set as the creator (created_by = auth.uid())
-- 
-- To verify the policy works:
-- 1. Make sure you're authenticated (logged in)
-- 2. Try creating a workspace
-- 3. The created_by field must match auth.uid()

