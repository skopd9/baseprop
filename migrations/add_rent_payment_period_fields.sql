-- Migration: Add payment period and invoice fields to rent_payments table
-- Date: 2024

ALTER TABLE rent_payments
ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly', 'quarterly', 'annual')),
ADD COLUMN IF NOT EXISTS period_start DATE,
ADD COLUMN IF NOT EXISTS period_end DATE,
ADD COLUMN IF NOT EXISTS is_pro_rated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pro_rate_days INTEGER,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMP WITH TIME ZONE;

-- Update existing records to have period_start/period_end based on due_date
-- For existing records, assume period_start is 1 month before due_date and period_end is due_date
UPDATE rent_payments
SET 
  period_start = (due_date - INTERVAL '1 month')::DATE,
  period_end = due_date
WHERE period_start IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant_period ON rent_payments(tenant_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_rent_payments_due_date ON rent_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_rent_payments_status ON rent_payments(status);

