-- =====================================================
-- TENANT COUNTRY VALIDATION
-- =====================================================
-- Ensures tenants always match their organization's country
-- Prevents mixing tenants from different countries in same workspace
-- 
-- This migration adds:
-- 1. Validation function to check tenant-organization country match
-- 2. Triggers for INSERT and UPDATE on tenants table
-- 3. Index on tenants(country_code) for performance
-- =====================================================

-- =====================================================
-- 1. ADD COUNTRY_CODE COLUMN TO TENANTS TABLE (if not exists)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE tenants 
    ADD COLUMN country_code TEXT NOT NULL DEFAULT 'UK' CHECK (country_code IN ('UK', 'GR', 'US'));
    
    CREATE INDEX IF NOT EXISTS idx_tenants_country ON tenants(country_code);
  END IF;
END $$;

-- =====================================================
-- 2. DROP EXISTING TRIGGERS AND FUNCTION (if they exist)
-- =====================================================
DROP TRIGGER IF EXISTS check_tenant_org_country_insert ON tenants;
DROP TRIGGER IF EXISTS check_tenant_org_country_update ON tenants;
DROP FUNCTION IF EXISTS validate_tenant_organization_country();

-- =====================================================
-- 3. CREATE VALIDATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION validate_tenant_organization_country()
RETURNS TRIGGER AS $$
DECLARE
  org_country TEXT;
BEGIN
  -- Get the organization's country code
  SELECT country_code INTO org_country
  FROM organizations
  WHERE id = NEW.organization_id;
  
  -- If organization not found, allow (will be caught by foreign key constraint)
  IF org_country IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Set tenant country to organization country if not set
  IF NEW.country_code IS NULL THEN
    NEW.country_code := org_country;
  END IF;
  
  -- Validate that tenant country matches organization country
  IF NEW.country_code != org_country THEN
    RAISE EXCEPTION 'Tenant country (%) does not match organization country (%). Tenants can only be added to workspaces in the same country.', 
      NEW.country_code, org_country;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE TRIGGERS
-- =====================================================
-- Trigger for INSERT operations
CREATE TRIGGER check_tenant_org_country_insert
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION validate_tenant_organization_country();

-- Trigger for UPDATE operations
CREATE TRIGGER check_tenant_org_country_update
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  WHEN (NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.country_code IS DISTINCT FROM OLD.country_code)
  EXECUTE FUNCTION validate_tenant_organization_country();

-- =====================================================
-- 5. CREATE INDEX FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tenants_country_org ON tenants(organization_id, country_code);

-- =====================================================
-- 6. UPDATE EXISTING TENANTS TO MATCH THEIR ORGANIZATION'S COUNTRY
-- =====================================================
-- This is a data migration to fix any existing mismatches
UPDATE tenants t
SET country_code = o.country_code
FROM organizations o
WHERE t.organization_id = o.id
  AND (t.country_code IS NULL OR t.country_code != o.country_code);

-- =====================================================
-- VERIFICATION QUERIES (commented out - uncomment to test)
-- =====================================================
-- Check that all tenants match their organization country:
-- SELECT 
--   t.id,
--   t.name,
--   t.country_code as tenant_country,
--   o.country_code as org_country,
--   o.name as organization_name
-- FROM tenants t
-- JOIN organizations o ON t.organization_id = o.id
-- WHERE t.country_code != o.country_code;
-- 
-- Expected result: No rows (all tenants match their organization)

-- Test the validation (should fail):
-- INSERT INTO tenants (name, tenant_type, organization_id, country_code)
-- VALUES ('Test Tenant', 'individual', 'your-org-id-here', 'US');
-- 
-- Expected: Error message about country mismatch

-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================
-- To rollback this migration:
-- DROP TRIGGER IF EXISTS check_tenant_org_country_insert ON tenants;
-- DROP TRIGGER IF EXISTS check_tenant_org_country_update ON tenants;
-- DROP FUNCTION IF EXISTS validate_tenant_organization_country();
-- DROP INDEX IF EXISTS idx_tenants_country_org;

