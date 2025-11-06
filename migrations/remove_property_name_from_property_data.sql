-- Migration: Remove property_name from property_data JSONB
-- This migration removes the property_name field from the property_data JSONB column
-- since we're no longer using custom property names - properties are identified by address only

-- Remove property_name from all property_data JSONB objects
UPDATE properties
SET property_data = property_data - 'property_name'
WHERE property_data ? 'property_name';

-- Add a comment explaining the change
COMMENT ON COLUMN properties.property_data IS 
'JSONB column containing property details. Note: property_name field has been removed - properties are identified by address only.';

