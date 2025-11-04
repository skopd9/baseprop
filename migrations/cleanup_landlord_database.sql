-- =====================================================
-- LANDLORD DATABASE CLEANUP MIGRATION
-- =====================================================
-- This migration removes deprecated tables and updates
-- the schema for the multi-tenant organization structure.
--
-- SAFE TO RUN: All tables being dropped have been verified
-- as either empty or containing only test/old data.
--
-- =====================================================

-- =====================================================
-- 1. DROP DEPRECATED TABLES
-- =====================================================

-- Alpha list - No longer needed (waitlist feature deprecated)
DROP TABLE IF EXISTS alpha_list CASCADE;

-- Asset register config - Not needed
DROP TABLE IF EXISTS asset_register_configs CASCADE;

-- Chat messages - Not needed
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Email notifications - Not needed (handled by service now)
DROP TABLE IF EXISTS email_notifications CASCADE;

-- Modules system - Old version, no longer used
DROP TABLE IF EXISTS user_module_access CASCADE;
DROP TABLE IF EXISTS modules CASCADE;

-- Persona system - Old structure, no longer used
DROP TABLE IF EXISTS persona_change_log CASCADE;
DROP TABLE IF EXISTS user_persona_assignments CASCADE;
DROP TABLE IF EXISTS user_personas CASCADE;

-- Waitlist - No longer needed
DROP TABLE IF EXISTS waitlist CASCADE;

-- Workflow system - Old version, no longer used
DROP TABLE IF EXISTS workstreams CASCADE;
DROP TABLE IF EXISTS workflow_instances CASCADE;
DROP TABLE IF EXISTS workflow_templates CASCADE;

-- =====================================================
-- 2. ADD user_id TO EXPENSES TABLE
-- =====================================================
-- Track which user created/entered each expense

ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);

-- Add comment explaining the field
COMMENT ON COLUMN expenses.user_id IS 'User who created/entered this expense record';

-- =====================================================
-- 3. ADD user_id TO INSPECTIONS TABLE
-- =====================================================
-- Track which user created/scheduled each inspection

ALTER TABLE inspections 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON inspections(user_id);

-- Add comment explaining the field
COMMENT ON COLUMN inspections.user_id IS 'User who created/scheduled this inspection';

-- =====================================================
-- 4. VERIFY ORGANIZATION COLUMNS EXIST
-- =====================================================
-- These should already exist from previous migrations,
-- but this ensures they're there

-- Expenses already has organization_id (verified)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE expenses 
      ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX idx_expenses_organization_id ON expenses(organization_id);
  END IF;
END $$;

-- Inspections already has organization_id (verified)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspections' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE inspections 
      ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX idx_inspections_organization_id ON inspections(organization_id);
  END IF;
END $$;

-- =====================================================
-- 5. UPDATE RLS POLICIES FOR EXPENSES
-- =====================================================
-- Ensure expenses are scoped to organization members

-- Enable RLS if not already enabled
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their organization's expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert expenses in their organization" ON expenses;
DROP POLICY IF EXISTS "Users can update their organization's expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete their organization's expenses" ON expenses;

-- Create new policies
CREATE POLICY "Users can view their organization's expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can insert expenses in their organization"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update their organization's expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can delete their organization's expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- =====================================================
-- 6. UPDATE RLS POLICIES FOR INSPECTIONS
-- =====================================================
-- Ensure inspections are scoped to organization members

-- Enable RLS if not already enabled
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their organization's inspections" ON inspections;
DROP POLICY IF EXISTS "Users can insert inspections in their organization" ON inspections;
DROP POLICY IF EXISTS "Users can update their organization's inspections" ON inspections;
DROP POLICY IF EXISTS "Users can delete their organization's inspections" ON inspections;

-- Create new policies
CREATE POLICY "Users can view their organization's inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can insert inspections in their organization"
  ON inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update their organization's inspections"
  ON inspections FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can delete their organization's inspections"
  ON inspections FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Check dropped tables (should return 0 rows)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'alpha_list',
    'asset_register_configs',
    'chat_messages',
    'email_notifications',
    'modules',
    'user_module_access',
    'persona_change_log',
    'user_persona_assignments',
    'user_personas',
    'waitlist',
    'workflow_instances',
    'workflow_templates',
    'workstreams'
  )
ORDER BY table_name;

-- Check that user_id was added (should return 2 rows)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('expenses', 'inspections')
  AND column_name = 'user_id'
ORDER BY table_name;

-- Check that organization_id exists (should return 2 rows)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('expenses', 'inspections')
  AND column_name = 'organization_id'
ORDER BY table_name;

-- List all remaining tables (should show clean structure)
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- CLEANUP COMPLETE!
-- =====================================================

-- Summary of changes:
-- ✅ Dropped 13 deprecated tables
-- ✅ Added user_id to expenses table
-- ✅ Added user_id to inspections table
-- ✅ Verified organization_id columns exist
-- ✅ Updated RLS policies for expenses
-- ✅ Updated RLS policies for inspections
--
-- Remaining tables:
-- - user_profiles (auth extension)
-- - organizations (multi-tenancy)
-- - organization_members (multi-tenancy)
-- - organization_invitations (multi-tenancy)
-- - properties (core feature)
-- - units (core feature)
-- - unit_tenants (core feature)
-- - tenants (core feature)
-- - tenant_onboarding (core feature)
-- - inspections (core feature - now with user_id + org_id)
-- - expenses (core feature - now with user_id + org_id)
--
-- =====================================================

