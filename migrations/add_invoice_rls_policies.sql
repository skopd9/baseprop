-- Add RLS policies for invoices table
-- This allows organization members to manage invoices

-- Enable RLS on invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their organization's invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices for their organization" ON invoices;
DROP POLICY IF EXISTS "Users can update their organization's invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete their organization's invoices" ON invoices;

-- Create policies for invoices

-- SELECT: Users can view invoices for their organization
CREATE POLICY "Users can view their organization's invoices"
  ON invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- INSERT: Users can create invoices for their organization
CREATE POLICY "Users can create invoices for their organization"
  ON invoices FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- UPDATE: Users can update invoices for their organization
CREATE POLICY "Users can update their organization's invoices"
  ON invoices FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- DELETE: Users can delete invoices for their organization
CREATE POLICY "Users can delete their organization's invoices"
  ON invoices FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- Add similar policies for invoice_recipients table
ALTER TABLE invoice_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view recipients for their organization's tenants" ON invoice_recipients;
DROP POLICY IF EXISTS "Users can create recipients for their organization's tenants" ON invoice_recipients;
DROP POLICY IF EXISTS "Users can update recipients for their organization's tenants" ON invoice_recipients;
DROP POLICY IF EXISTS "Users can delete recipients for their organization's tenants" ON invoice_recipients;

-- SELECT: Users can view recipients for tenants in their organization
CREATE POLICY "Users can view recipients for their organization's tenants"
  ON invoice_recipients FOR SELECT
  USING (
    tenant_id IN (
      SELECT t.id 
      FROM tenants t
      JOIN organization_members om ON t.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- INSERT: Users can create recipients for tenants in their organization
CREATE POLICY "Users can create recipients for their organization's tenants"
  ON invoice_recipients FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT t.id 
      FROM tenants t
      JOIN organization_members om ON t.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- UPDATE: Users can update recipients for tenants in their organization
CREATE POLICY "Users can update recipients for their organization's tenants"
  ON invoice_recipients FOR UPDATE
  USING (
    tenant_id IN (
      SELECT t.id 
      FROM tenants t
      JOIN organization_members om ON t.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- DELETE: Users can delete recipients for tenants in their organization
CREATE POLICY "Users can delete recipients for their organization's tenants"
  ON invoice_recipients FOR DELETE
  USING (
    tenant_id IN (
      SELECT t.id 
      FROM tenants t
      JOIN organization_members om ON t.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );
