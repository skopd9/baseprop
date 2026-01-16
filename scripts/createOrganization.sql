-- =====================================================
-- Create Organization for Current User
-- Run this in Supabase SQL Editor while logged in
-- =====================================================

DO $$
DECLARE
  current_user_id UUID;
  new_org_id UUID;
  user_email TEXT;
  org_name TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found. Make sure you are logged in.';
  END IF;

  -- Get user email for naming
  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
  
  IF user_email IS NULL THEN
    user_email := 'User';
  END IF;
  
  org_name := user_email || '''s Workspace';
  
  RAISE NOTICE 'Creating organization for user: % (email: %)', current_user_id, user_email;
  
  -- Step 1: Ensure user profile exists
  INSERT INTO user_profiles (id, full_name, has_completed_onboarding, onboarding_data)
  VALUES (
    current_user_id, 
    user_email, 
    true,
    jsonb_build_object(
      'completed_at', NOW(),
      'country', 'UK'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    has_completed_onboarding = true,
    updated_at = NOW();
  
  RAISE NOTICE 'User profile created/updated';
  
  -- Step 2: Create organization
  INSERT INTO organizations (name, created_by, settings)
  VALUES (
    org_name,
    current_user_id,
    jsonb_build_object(
      'country', 'UK',
      'currency', '£',
      'created_via', 'manual_fix'
    )
  )
  RETURNING id INTO new_org_id;
  
  RAISE NOTICE 'Organization created with ID: %', new_org_id;
  
  -- Step 3: Add user as owner in organization_members
  INSERT INTO organization_members (
    organization_id, 
    user_id, 
    role, 
    status, 
    joined_at
  )
  VALUES (
    new_org_id,
    current_user_id,
    'owner',
    'active',
    NOW()
  );
  
  RAISE NOTICE 'User added as owner of organization';
  
  -- Step 4: Verify the setup
  RAISE NOTICE '✓ Setup complete!';
  RAISE NOTICE 'Organization Name: %', org_name;
  RAISE NOTICE 'Organization ID: %', new_org_id;
  RAISE NOTICE 'User ID: %', current_user_id;
  RAISE NOTICE 'Please refresh your app to see the workspace.';
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Organization already exists for this user. Checking membership...';
    
    -- Try to find and fix missing membership
    SELECT id INTO new_org_id 
    FROM organizations 
    WHERE created_by = current_user_id 
    LIMIT 1;
    
    IF new_org_id IS NOT NULL THEN
      -- Ensure membership exists
      INSERT INTO organization_members (
        organization_id, 
        user_id, 
        role, 
        status, 
        joined_at
      )
      VALUES (
        new_org_id,
        current_user_id,
        'owner',
        'active',
        NOW()
      )
      ON CONFLICT (organization_id, user_id) 
      DO UPDATE SET 
        status = 'active',
        updated_at = NOW();
      
      RAISE NOTICE 'Fixed membership for existing organization: %', new_org_id;
    END IF;
    
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating organization: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;

-- Show the result
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.created_at,
  om.role,
  om.status,
  om.joined_at
FROM organizations o
INNER JOIN organization_members om ON om.organization_id = o.id
WHERE om.user_id = auth.uid() AND om.status = 'active';

