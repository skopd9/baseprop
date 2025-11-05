-- Migration: Add HMO occupancy tracking
-- This migration adds support for tracking which HMO unit/room each tenant occupies
-- and enables proper occupancy calculation for HMOs

-- Step 1: Add HMO unit assignment to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS hmo_unit_name TEXT;

-- Step 2: Add comment explaining HMO unit tracking
COMMENT ON COLUMN tenants.hmo_unit_name IS 
'For HMO properties: the name of the specific unit/room this tenant occupies. 
Must match a unit name in the property.units JSONB array.
For non-HMO properties, this should be NULL.';

-- Step 3: Update the property status check constraint to support partial occupancy
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE properties 
ADD CONSTRAINT properties_status_check 
CHECK (status IN ('vacant', 'occupied', 'partially_occupied', 'maintenance', 'sold'));

-- Step 4: Create a function to calculate property occupancy
CREATE OR REPLACE FUNCTION calculate_property_occupancy(property_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  property_record RECORD;
  total_units INTEGER;
  occupied_units INTEGER;
  result JSONB;
BEGIN
  -- Get property details
  SELECT 
    is_hmo,
    units,
    tenant_count
  INTO property_record
  FROM properties 
  WHERE id = property_uuid;
  
  -- If not HMO, simple calculation
  IF NOT property_record.is_hmo THEN
    RETURN jsonb_build_object(
      'type', 'standard',
      'total_capacity', 1,
      'occupied_count', CASE WHEN property_record.tenant_count > 0 THEN 1 ELSE 0 END,
      'vacancy_rate', CASE WHEN property_record.tenant_count > 0 THEN 0 ELSE 100 END,
      'occupancy_status', CASE WHEN property_record.tenant_count > 0 THEN 'occupied' ELSE 'vacant' END
    );
  END IF;
  
  -- For HMO properties
  total_units := jsonb_array_length(COALESCE(property_record.units, '[]'::jsonb));
  
  -- Count occupied units (tenants with active status)
  SELECT COUNT(DISTINCT hmo_unit_name)
  INTO occupied_units
  FROM tenants
  WHERE property_id = property_uuid
    AND status = 'active'
    AND hmo_unit_name IS NOT NULL;
  
  -- Build result
  result := jsonb_build_object(
    'type', 'hmo',
    'total_capacity', total_units,
    'occupied_count', occupied_units,
    'vacant_count', total_units - occupied_units,
    'vacancy_rate', CASE 
      WHEN total_units > 0 THEN ROUND((total_units - occupied_units)::numeric / total_units * 100, 1)
      ELSE 0 
    END,
    'occupancy_rate', CASE 
      WHEN total_units > 0 THEN ROUND(occupied_units::numeric / total_units * 100, 1)
      ELSE 0 
    END,
    'occupancy_status', CASE 
      WHEN occupied_units = 0 THEN 'vacant'
      WHEN occupied_units = total_units THEN 'occupied'
      ELSE 'partially_occupied'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a function to get available HMO units
CREATE OR REPLACE FUNCTION get_available_hmo_units(property_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  all_units JSONB;
  occupied_units TEXT[];
  available_units JSONB;
  unit JSONB;
  unit_name TEXT;
BEGIN
  -- Get all units from property
  SELECT units INTO all_units
  FROM properties 
  WHERE id = property_uuid AND is_hmo = true;
  
  IF all_units IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  
  -- Get occupied unit names
  SELECT ARRAY_AGG(DISTINCT hmo_unit_name)
  INTO occupied_units
  FROM tenants
  WHERE property_id = property_uuid
    AND status = 'active'
    AND hmo_unit_name IS NOT NULL;
  
  -- Build available units array
  available_units := '[]'::jsonb;
  
  FOR unit IN SELECT * FROM jsonb_array_elements(all_units)
  LOOP
    unit_name := unit->>'name';
    
    -- Add unit if not occupied
    IF occupied_units IS NULL OR unit_name != ALL(occupied_units) THEN
      available_units := available_units || jsonb_build_array(unit);
    END IF;
  END LOOP;
  
  RETURN available_units;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tenants_hmo_unit 
ON tenants(property_id, hmo_unit_name) 
WHERE hmo_unit_name IS NOT NULL;

-- Step 7: Create a trigger to automatically update property status based on occupancy
CREATE OR REPLACE FUNCTION update_property_occupancy_status()
RETURNS TRIGGER AS $$
DECLARE
  occupancy JSONB;
BEGIN
  -- Calculate occupancy for the affected property
  occupancy := calculate_property_occupancy(
    COALESCE(NEW.property_id, OLD.property_id)
  );
  
  -- Update property status and tenant_count
  UPDATE properties 
  SET 
    status = CASE 
      WHEN status = 'maintenance' OR status = 'sold' THEN status
      ELSE (occupancy->>'occupancy_status')::TEXT
    END,
    tenant_count = (
      SELECT COUNT(*) 
      FROM tenants 
      WHERE property_id = COALESCE(NEW.property_id, OLD.property_id)
        AND status = 'active'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.property_id, OLD.property_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_property_occupancy ON tenants;

-- Create trigger on tenant changes
CREATE TRIGGER trigger_update_property_occupancy
AFTER INSERT OR UPDATE OR DELETE ON tenants
FOR EACH ROW
EXECUTE FUNCTION update_property_occupancy_status();

-- Step 8: Initial update of all property statuses based on current occupancy
DO $$
DECLARE
  prop RECORD;
  occupancy JSONB;
BEGIN
  FOR prop IN SELECT id FROM properties WHERE is_hmo = true
  LOOP
    occupancy := calculate_property_occupancy(prop.id);
    
    UPDATE properties 
    SET status = CASE 
      WHEN status IN ('maintenance', 'sold') THEN status
      ELSE (occupancy->>'occupancy_status')::TEXT
    END
    WHERE id = prop.id;
  END LOOP;
END $$;

