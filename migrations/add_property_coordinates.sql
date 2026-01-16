-- Migration: Add latitude and longitude columns to properties table
-- This allows storing geocoded coordinates to avoid repeated API calls when loading maps

-- Add latitude and longitude columns
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Add comment to document the columns
COMMENT ON COLUMN properties.latitude IS 'Geocoded latitude coordinate for property location';
COMMENT ON COLUMN properties.longitude IS 'Geocoded longitude coordinate for property location';

-- Create index for efficient map queries
CREATE INDEX IF NOT EXISTS idx_properties_coordinates ON properties (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment to document the index
COMMENT ON INDEX idx_properties_coordinates IS 'Index for efficient querying of properties with valid coordinates for map display';

