-- Migration: Create rent_payments table
-- Date: 2024
-- Description: Creates the rent_payments table for tracking rent payments and invoices

-- Create rent_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Payment Details
  payment_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount_due DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2),
  
  -- Payment Period
  payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly', 'quarterly', 'annual')),
  period_start DATE,
  period_end DATE,
  is_pro_rated BOOLEAN DEFAULT false,
  pro_rate_days INTEGER,
  
  -- Invoice
  invoice_number TEXT,
  invoice_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'partial', 'missed')),
  
  -- Payment Method
  payment_method TEXT, -- e.g., 'bank_transfer', 'standing_order', 'cash', 'cheque'
  
  -- Reference
  payment_reference TEXT,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for rent_payments
CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant_period ON rent_payments(tenant_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_rent_payments_due_date ON rent_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_rent_payments_status ON rent_payments(status);

-- Enable RLS
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rent_payments
-- Landlords can see all rent payments for properties in their organization
CREATE POLICY "Landlords can view rent payments in their organization"
  ON rent_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = rent_payments.property_id
        AND om.user_id = auth.uid()
    )
  );

-- Landlords can insert rent payments for properties in their organization
CREATE POLICY "Landlords can insert rent payments in their organization"
  ON rent_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = rent_payments.property_id
        AND om.user_id = auth.uid()
    )
  );

-- Landlords can update rent payments for properties in their organization
CREATE POLICY "Landlords can update rent payments in their organization"
  ON rent_payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = rent_payments.property_id
        AND om.user_id = auth.uid()
    )
  );

-- Landlords can delete rent payments for properties in their organization
CREATE POLICY "Landlords can delete rent payments in their organization"
  ON rent_payments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = rent_payments.property_id
        AND om.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_rent_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rent_payments_updated_at
  BEFORE UPDATE ON rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_rent_payments_updated_at();

