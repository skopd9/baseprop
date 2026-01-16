-- Add Saudi Arabia (SA) support to constraints

-- 1. Update properties table constraint
-- First drop existing constraint if it exists
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_country_code_check;
-- Add new constraint including 'SA'
ALTER TABLE properties ADD CONSTRAINT properties_country_code_check 
  CHECK (country_code IN ('UK', 'GR', 'US', 'SA'));

-- 2. Update organizations table constraint
-- This constraint was likely added in add_organization_country_lock.sql
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_country_code_check;
-- Also check if there's a different name for the constraint (sometimes named by postgres)
-- We will try to add the new constraint. If one exists with a different name, it might conflict if it enforces strict values.
-- But usually explicit naming is best.
ALTER TABLE organizations ADD CONSTRAINT organizations_country_code_check 
  CHECK (country_code IN ('UK', 'GR', 'US', 'SA'));

-- 3. Update user_preferences table constraint (Safely)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_preferences'
  ) THEN
    ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_country_code_check;
    ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_country_code_check 
      CHECK (country_code IN ('UK', 'GR', 'US', 'SA'));
  END IF;
END $$;
