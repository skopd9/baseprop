-- =====================================================
-- CLEANUP SCRIPT: Remove Landlord Tables from Wrong Database
-- =====================================================
-- This script removes all landlord property management tables
-- and policies that were accidentally created in the nutrition database.
--
-- INSTRUCTIONS:
-- 1. Make sure you're connected to the NUTRITION database (the wrong one)
-- 2. Run this entire script in Supabase SQL Editor
-- 3. Verify the cleanup with the verification queries at the end
-- 4. Then reconnect MCP to the correct landlord database
--
-- =====================================================

-- =====================================================
-- 1. DROP ALL LANDLORD-RELATED POLICIES
-- =====================================================

-- Drop user_profiles policies
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Drop organization_members policies
DROP POLICY IF EXISTS "org_members_select_own" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert" ON organization_members;
DROP POLICY IF EXISTS "org_members_update" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete" ON organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners can remove members" ON organization_members;

-- Drop organizations policies
DROP POLICY IF EXISTS "orgs_select" ON organizations;
DROP POLICY IF EXISTS "orgs_insert" ON organizations;
DROP POLICY IF EXISTS "orgs_update" ON organizations;
DROP POLICY IF EXISTS "orgs_delete" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;

-- Drop organization_invitations policies
DROP POLICY IF EXISTS "Users can view invitations for their organizations" ON organization_invitations;
DROP POLICY IF EXISTS "Owners can create invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON organization_invitations;

-- Drop rent_payments policies (if any)
DROP POLICY IF EXISTS "Users can view their organization's rent payments" ON rent_payments;

-- Drop tenants policies (if any)
DROP POLICY IF EXISTS "Users can view their organization's tenants" ON tenants;
DROP POLICY IF EXISTS "Users can insert tenants in their organization" ON tenants;
DROP POLICY IF EXISTS "Users can update their organization's tenants" ON tenants;
DROP POLICY IF EXISTS "Users can delete their organization's tenants" ON tenants;

-- Drop properties policies (if any)
DROP POLICY IF EXISTS "Users can view their organization's properties" ON properties;
DROP POLICY IF EXISTS "Users can insert properties in their organization" ON properties;
DROP POLICY IF EXISTS "Users can update their organization's properties" ON properties;
DROP POLICY IF EXISTS "Users can delete their organization's properties" ON properties;

-- =====================================================
-- 2. DROP ALL LANDLORD-RELATED TABLES
-- =====================================================

-- Drop in reverse dependency order (child tables first)
DROP TABLE IF EXISTS rent_payments CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS organization_invitations CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- =====================================================
-- 3. DROP HELPER FUNCTIONS (if they exist)
-- =====================================================

DROP FUNCTION IF EXISTS get_user_organizations(UUID);
DROP FUNCTION IF EXISTS is_organization_owner(UUID, UUID);

-- =====================================================
-- 4. REMOVE MIGRATION RECORDS
-- =====================================================

-- Remove migration history entries (if they exist)
DELETE FROM supabase_migrations.schema_migrations 
WHERE name IN (
  'fix_infinite_recursion_in_organization_policies',
  'comprehensive_fix_all_rls_policies',
  'add_auth_and_organizations',
  'add_auth_and_organizations_FIXED'
);

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Check if tables still exist (should return no rows)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_profiles',
    'organizations', 
    'organization_members',
    'organization_invitations',
    'properties',
    'tenants',
    'rent_payments'
  )
ORDER BY table_name;

-- Check if policies still exist (should return no rows)
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN (
  'user_profiles',
  'organizations',
  'organization_members', 
  'organization_invitations',
  'properties',
  'tenants',
  'rent_payments'
)
ORDER BY tablename;

-- Check if functions still exist (should return no rows)
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_organizations',
    'is_organization_owner',
    'update_updated_at_column'
  );

-- =====================================================
-- CLEANUP COMPLETE!
-- =====================================================

-- If all verification queries return 0 rows, the cleanup was successful.
-- 
-- NEXT STEPS:
-- 1. Reconnect your MCP to the CORRECT landlord database
-- 2. Run the landlord migrations in the correct database
-- 3. Test your landlord app
--
-- =====================================================


