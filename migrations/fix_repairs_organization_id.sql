-- Fix repairs to ensure they have organization_id set from their property
-- This migration:
-- 1. Updates any existing repairs that are missing organization_id
-- 2. Ensures the RLS policy works correctly for inserts

-- Update existing repairs to set organization_id from their property
UPDATE repairs
SET organization_id = properties.organization_id
FROM properties
WHERE repairs.property_id = properties.id
  AND repairs.organization_id IS NULL;

-- Create a function to automatically set organization_id on insert/update
CREATE OR REPLACE FUNCTION set_repair_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If organization_id is not set, get it from the property
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM properties
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set organization_id before insert/update
DROP TRIGGER IF EXISTS repairs_set_organization_id ON repairs;
CREATE TRIGGER repairs_set_organization_id
  BEFORE INSERT OR UPDATE ON repairs
  FOR EACH ROW
  EXECUTE FUNCTION set_repair_organization_id();

-- Update the RLS policy to also check via property join if organization_id is missing
-- This provides a fallback mechanism
DROP POLICY IF EXISTS "Users can view their organization's repairs" ON repairs;
CREATE POLICY "Users can view their organization's repairs"
  ON repairs FOR ALL
  USING (
    -- Check organization_id directly
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    -- Or check via property as fallback
    property_id IN (
      SELECT p.id FROM properties p
      INNER JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  )
  WITH CHECK (
    -- For inserts/updates, ensure organization_id matches user's organization
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    -- Or property belongs to user's organization
    property_id IN (
      SELECT p.id FROM properties p
      INNER JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );



