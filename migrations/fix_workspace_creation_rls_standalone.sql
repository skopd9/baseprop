-- =====================================================
-- QUICK FIX: Workspace Creation RLS Policy
-- Run this in Supabase SQL Editor if workspace creation fails
-- =====================================================

-- Step 1: Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- Step 2: Create the correct policy
-- This allows authenticated users to create organizations where they are the creator
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = created_by
  );

-- Step 3: Verify the policy was created
-- You should see the policy listed when you run:
-- SELECT * FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Users can create organizations';

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this, try creating a workspace again.
-- The policy ensures that:
-- 1. The user is authenticated (auth.uid() IS NOT NULL)
-- 2. The created_by field matches the authenticated user (auth.uid() = created_by)
--
-- If it still fails, check:
-- 1. Are you logged in? (auth.uid() should not be NULL)
-- 2. Is the created_by field being set correctly in your code?
-- 3. Are there any other conflicting policies?

