-- Migration: Add deposit_amount column and auto-calculation
-- This migration adds the deposit_amount column and sets up auto-calculation
-- based on monthly_rent and deposit_weeks (UK max is 5 weeks)

-- Step 1: Add deposit_amount column if it doesn't exist
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10, 2);

-- Step 2: Add deposit_weeks column if it doesn't exist (from previous migration)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS deposit_weeks INTEGER DEFAULT 4 CHECK (deposit_weeks >= 1 AND deposit_weeks <= 5);

-- Step 3: Create function to calculate deposit amount
-- UK standard: deposit = monthly_rent * (weeks / 4.33) where 4.33 is average weeks per month
CREATE OR REPLACE FUNCTION calculate_deposit_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if monthly_rent and deposit_weeks are set
  IF NEW.monthly_rent IS NOT NULL AND NEW.monthly_rent > 0 
     AND NEW.deposit_weeks IS NOT NULL AND NEW.deposit_weeks > 0 THEN
    -- Calculate: monthly_rent * (weeks / 4.33)
    -- Round to 2 decimal places
    NEW.deposit_amount := ROUND((NEW.monthly_rent * NEW.deposit_weeks / 4.33)::numeric, 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to auto-calculate deposit_amount on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_deposit_amount ON tenants;
CREATE TRIGGER trigger_calculate_deposit_amount
  BEFORE INSERT OR UPDATE OF monthly_rent, deposit_weeks, deposit_amount ON tenants
  FOR EACH ROW
  WHEN (NEW.monthly_rent IS NOT NULL AND NEW.deposit_weeks IS NOT NULL)
  EXECUTE FUNCTION calculate_deposit_amount();

-- Step 5: Update existing tenants to calculate their deposit_amount
UPDATE tenants
SET deposit_amount = ROUND((monthly_rent * COALESCE(deposit_weeks, 4) / 4.33)::numeric, 2)
WHERE monthly_rent IS NOT NULL 
  AND monthly_rent > 0
  AND (deposit_amount IS NULL OR deposit_amount = 0);

-- Step 6: Add comment explaining the calculation
COMMENT ON COLUMN tenants.deposit_amount IS 
'Automatically calculated from monthly_rent and deposit_weeks. Formula: monthly_rent * (deposit_weeks / 4.33). UK maximum is 5 weeks.';

COMMENT ON COLUMN tenants.deposit_weeks IS 
'Number of weeks rent as deposit. UK maximum is 5 weeks. Default is 4 weeks.';

