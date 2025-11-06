-- =====================================================
-- TENANT-PROPERTY ORGANIZATION VALIDATION
-- =====================================================
-- Ensures tenants can only be linked to properties in the SAME organization
-- Prevents cross-organization property assignments
-- =====================================================

-- =====================================================
-- 1. DROP EXISTING TRIGGER AND FUNCTION (if they exist)
-- =====================================================
DROP TRIGGER IF EXISTS check_tenant_property_org_match ON tenants;
DROP FUNCTION IF EXISTS validate_tenant_property_organization();

-- =====================================================
-- 2. CREATE VALIDATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION validate_tenant_property_organization()
RETURNS TRIGGER AS $$
DECLARE
  property_org_id UUID;
BEGIN
  -- Only validate if tenant has a property_id in tenant_data
  IF NEW.tenant_data->>'property_id' IS NOT NULL THEN
    -- Get the organization_id of the property
    SELECT organization_id INTO property_org_id
    FROM properties
    WHERE id = (NEW.tenant_data->>'property_id')::uuid;
    
    -- If property not found, allow (will be caught by foreign key if it exists)
    IF property_org_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Validate that tenant's organization matches property's organization
    IF NEW.organization_id != property_org_id THEN
      RAISE EXCEPTION 'Tenant cannot be linked to a property from a different organization. Tenant org: %, Property org: %', 
        NEW.organization_id, property_org_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE TRIGGER
-- =====================================================
CREATE TRIGGER check_tenant_property_org_match
  BEFORE INSERT OR UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION validate_tenant_property_organization();

-- =====================================================
-- VERIFICATION QUERY (commented out - uncomment to test)
-- =====================================================
-- Check for any existing cross-organization links:
-- SELECT 
--   t.id,
--   t.name,
--   o1.name as tenant_org,
--   p.address as property_address,
--   o2.name as property_org
-- FROM tenants t
-- JOIN organizations o1 ON t.organization_id = o1.id
-- LEFT JOIN properties p ON (t.tenant_data->>'property_id')::uuid = p.id
-- LEFT JOIN organizations o2 ON p.organization_id = o2.id
-- WHERE t.organization_id != p.organization_id
--   AND (t.tenant_data->>'property_id') IS NOT NULL;
-- 
-- Expected result: No rows

-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================
-- To rollback this migration:
-- DROP TRIGGER IF EXISTS check_tenant_property_org_match ON tenants;
-- DROP FUNCTION IF EXISTS validate_tenant_property_organization();

