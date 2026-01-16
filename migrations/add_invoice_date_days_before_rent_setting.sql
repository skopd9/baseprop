-- Add invoice_date_days_before_rent column to invoice_settings table
-- This allows landlords to set how many days before the rent period an invoice should be dated

-- Create invoice_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_name TEXT,
  company_address TEXT,
  company_email TEXT,
  company_phone TEXT,
  company_logo_url TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  payment_terms TEXT DEFAULT 'Payment due within 14 days',
  payment_instructions TEXT,
  footer_notes TEXT,
  auto_send_enabled BOOLEAN DEFAULT false,
  days_before_due INTEGER DEFAULT 7,
  send_reminder_enabled BOOLEAN DEFAULT false,
  reminder_days_after INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Add the new column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_settings' 
    AND column_name = 'invoice_date_days_before_rent'
  ) THEN
    ALTER TABLE invoice_settings 
    ADD COLUMN invoice_date_days_before_rent INTEGER DEFAULT 7;
  END IF;
END $$;

-- Add RLS policies if they don't exist
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their organization's invoice settings" ON invoice_settings;
  DROP POLICY IF EXISTS "Users can update their organization's invoice settings" ON invoice_settings;
  DROP POLICY IF EXISTS "Users can insert their organization's invoice settings" ON invoice_settings;

  -- Create new policies
  CREATE POLICY "Users can view their organization's invoice settings"
    ON invoice_settings FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND status = 'active'
      )
    );

  CREATE POLICY "Users can update their organization's invoice settings"
    ON invoice_settings FOR UPDATE
    USING (
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND status = 'active'
      )
    );

  CREATE POLICY "Users can insert their organization's invoice settings"
    ON invoice_settings FOR INSERT
    WITH CHECK (
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND status = 'active'
      )
    );
END $$;
