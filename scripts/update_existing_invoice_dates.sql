-- Update existing invoice dates to be X days before the rent period
-- This is a one-time fix for invoices created before the invoice_date_days_before_rent setting was implemented

-- Step 1: Check current invoice dates
SELECT 
  i.invoice_number,
  i.tenant_name,
  i.period_start,
  i.invoice_date,
  i.due_date,
  i.period_start::date - i.invoice_date::date as days_difference
FROM invoices i
WHERE i.period_start IS NOT NULL
ORDER BY i.period_start;

-- Step 2: Update invoice dates to be 7 days before the rent period start
-- (Adjust the number 7 to match your organization's setting)
UPDATE invoices
SET 
  invoice_date = (period_start::date - INTERVAL '7 days')::date,
  updated_at = NOW()
WHERE 
  period_start IS NOT NULL
  AND invoice_date >= period_start; -- Only update if invoice date is not already before period start

-- Step 3: Verify the update
SELECT 
  i.invoice_number,
  i.tenant_name,
  i.period_start,
  i.invoice_date,
  i.due_date,
  i.period_start::date - i.invoice_date::date as days_before_rent
FROM invoices i
WHERE i.period_start IS NOT NULL
ORDER BY i.period_start;

-- Optional: Update for a specific tenant only
-- UPDATE invoices
-- SET 
--   invoice_date = (period_start::date - INTERVAL '7 days')::date,
--   updated_at = NOW()
-- WHERE 
--   tenant_id = 'your-tenant-id-here'
--   AND period_start IS NOT NULL
--   AND invoice_date >= period_start;

-- Optional: Update with different days before rent per organization
-- First, ensure the invoice_settings table has the column
-- Then use this query:
-- UPDATE invoices i
-- SET 
--   invoice_date = (i.period_start::date - (s.invoice_date_days_before_rent || ' days')::interval)::date,
--   updated_at = NOW()
-- FROM invoice_settings s
-- WHERE 
--   i.organization_id = s.organization_id
--   AND i.period_start IS NOT NULL
--   AND i.invoice_date >= i.period_start;
