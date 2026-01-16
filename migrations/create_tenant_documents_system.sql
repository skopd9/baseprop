-- =====================================================
-- TENANT DOCUMENTS SYSTEM
-- Stores personal documents for tenants (country-aware)
-- NOTE: Does NOT duplicate property compliance certificates
-- =====================================================

-- =====================================================
-- 1. TENANT DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Country support - determines which document types are required
  country_code TEXT NOT NULL DEFAULT 'UK' CHECK (country_code IN ('UK', 'GR', 'US')),
  
  -- Document Type (country-specific)
  document_type TEXT NOT NULL,
  -- UK: id_proof, proof_of_address, right_to_rent, bank_statement, employment_reference, landlord_reference, guarantor_id, guarantor_income, tenancy_agreement_signed, inventory_signed, check_in_report
  -- GR: id_proof, tax_clearance, employment_reference, bank_statement, tenancy_agreement_signed, inventory_signed
  -- US: id_proof, ssn_verification, credit_report, employment_verification, pay_stubs, bank_statement, previous_landlord_reference, tenancy_agreement_signed, inventory_signed
  
  -- Document Details
  document_name TEXT NOT NULL,
  description TEXT,
  
  -- File Information
  file_name TEXT NOT NULL,
  file_size BIGINT, -- in bytes
  file_type TEXT, -- MIME type: application/pdf, image/jpeg, etc.
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected', 'expired')),
  is_required BOOLEAN DEFAULT false,
  
  -- Dates
  uploaded_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by TEXT, -- User email who verified
  expiry_date DATE, -- For documents that expire (e.g., ID, right to rent)
  
  -- Metadata
  notes TEXT,
  rejection_reason TEXT,
  
  -- Links
  related_to TEXT, -- 'tenant', 'guarantor', 'onboarding'
  guarantor_name TEXT, -- If document is for a guarantor
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. DOCUMENT REQUIREMENTS TABLE
-- =====================================================
-- Defines which documents are required for each country
CREATE TABLE IF NOT EXISTS tenant_document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL CHECK (country_code IN ('UK', 'GR', 'US')),
  document_type TEXT NOT NULL,
  document_label TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  required_for_onboarding BOOLEAN DEFAULT false, -- Must be collected during onboarding
  required_for_existing BOOLEAN DEFAULT false, -- Should be collected for existing tenants
  can_expire BOOLEAN DEFAULT false,
  typical_expiry_years INTEGER, -- e.g., 5 for passport
  order_index INTEGER DEFAULT 0, -- Display order
  
  UNIQUE(country_code, document_type)
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant ON tenant_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_property ON tenant_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_country ON tenant_documents(country_code);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_type ON tenant_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_status ON tenant_documents(status);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_expiry ON tenant_documents(expiry_date);

-- =====================================================
-- 4. POPULATE DOCUMENT REQUIREMENTS
-- =====================================================

-- UK DOCUMENT REQUIREMENTS
INSERT INTO tenant_document_requirements (country_code, document_type, document_label, description, is_required, required_for_onboarding, required_for_existing, can_expire, typical_expiry_years, order_index) VALUES
-- Identity & Right to Rent (Legal Requirements)
('UK', 'id_proof', 'Photo ID (Passport/Driving License)', 'Valid government-issued photo identification', true, true, true, true, 10, 1),
('UK', 'right_to_rent', 'Right to Rent Document', 'Proof of right to rent in the UK (passport, visa, share code)', true, true, true, true, 5, 2),
('UK', 'proof_of_address', 'Proof of Address', 'Recent utility bill, bank statement, or council tax bill (within 3 months)', true, true, true, false, NULL, 3),

-- Financial Verification
('UK', 'bank_statement', 'Bank Statements (3 months)', 'Last 3 months of bank statements', true, true, true, false, NULL, 4),
('UK', 'employment_reference', 'Employment Reference', 'Letter from employer confirming employment and salary', true, true, false, false, NULL, 5),
('UK', 'landlord_reference', 'Previous Landlord Reference', 'Reference from previous landlord', false, false, false, false, NULL, 6),

-- Guarantor Documents (if applicable)
('UK', 'guarantor_id', 'Guarantor Photo ID', 'Guarantor''s government-issued photo ID', false, false, false, true, 10, 7),
('UK', 'guarantor_income', 'Guarantor Income Proof', 'Guarantor''s proof of income (payslips, bank statements)', false, false, false, false, NULL, 8),

-- Tenancy Documents
('UK', 'tenancy_agreement_signed', 'Signed Tenancy Agreement', 'Fully executed tenancy agreement', true, true, true, false, NULL, 9),
('UK', 'inventory_signed', 'Signed Inventory', 'Signed inventory check-in report', true, true, true, false, NULL, 10),
('UK', 'check_in_report', 'Check-In Report', 'Property condition report at move-in', true, false, false, false, NULL, 11),
('UK', 'deposit_receipt', 'Deposit Receipt', 'Proof of deposit payment and protection', true, true, true, false, NULL, 12);

-- GREECE DOCUMENT REQUIREMENTS
INSERT INTO tenant_document_requirements (country_code, document_type, document_label, description, is_required, required_for_onboarding, required_for_existing, can_expire, typical_expiry_years, order_index) VALUES
-- Identity
('GR', 'id_proof', 'Photo ID (ID Card/Passport)', 'Valid Greek ID card or passport', true, true, true, true, 10, 1),
('GR', 'tax_number', 'Tax Identification Number (ΑΦΜ)', 'Greek tax identification number', true, true, true, false, NULL, 2),
('GR', 'tax_clearance', 'Tax Clearance Certificate', 'Recent tax clearance certificate', false, false, false, true, 1, 3),

-- Financial
('GR', 'bank_statement', 'Bank Statements (3 months)', 'Last 3 months of bank statements', true, true, true, false, NULL, 4),
('GR', 'employment_reference', 'Employment Verification', 'Employment contract or employer letter', true, true, false, false, NULL, 5),
('GR', 'income_declaration', 'Income Declaration (E1)', 'Most recent income tax declaration', false, true, false, false, NULL, 6),

-- Tenancy Documents
('GR', 'tenancy_agreement_signed', 'Signed Tenancy Agreement', 'Signed rental contract', true, true, true, false, NULL, 7),
('GR', 'inventory_signed', 'Signed Inventory', 'Signed inventory check-in report', true, true, true, false, NULL, 8);

-- USA DOCUMENT REQUIREMENTS
INSERT INTO tenant_document_requirements (country_code, document_type, document_label, description, is_required, required_for_onboarding, required_for_existing, can_expire, typical_expiry_years, order_index) VALUES
-- Identity & Legal
('US', 'id_proof', 'Photo ID (Driver''s License/Passport)', 'Valid government-issued photo ID', true, true, true, true, 10, 1),
('US', 'ssn_verification', 'Social Security Number', 'SSN card or verification letter', true, true, true, false, NULL, 2),

-- Financial & Credit
('US', 'credit_report', 'Credit Report', 'Recent credit report from major bureau', true, true, false, false, NULL, 3),
('US', 'bank_statement', 'Bank Statements (2-3 months)', 'Recent bank statements', true, true, true, false, NULL, 4),
('US', 'pay_stubs', 'Pay Stubs (2-3 months)', 'Recent pay stubs from employer', true, true, true, false, NULL, 5),
('US', 'employment_verification', 'Employment Verification Letter', 'Letter from employer confirming employment', true, true, false, false, NULL, 6),
('US', 'tax_return', 'Tax Return (W-2)', 'Most recent tax return or W-2', false, false, false, false, NULL, 7),

-- References
('US', 'previous_landlord_reference', 'Previous Landlord Reference', 'Contact information and reference from previous landlord', true, true, false, false, NULL, 8),

-- Tenancy Documents
('US', 'tenancy_agreement_signed', 'Signed Lease Agreement', 'Fully executed lease agreement', true, true, true, false, NULL, 9),
('US', 'inventory_signed', 'Signed Move-In Checklist', 'Signed move-in condition checklist', true, true, true, false, NULL, 10),
('US', 'renter_insurance', 'Renter''s Insurance', 'Proof of renter''s insurance policy', false, false, false, true, 1, 11);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_document_requirements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see documents for their organization's tenants
CREATE POLICY "Users can view tenant documents in their organization"
  ON tenant_documents
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      INNER JOIN properties p ON t.property_id = p.id
      WHERE p.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can insert documents for their organization's tenants
CREATE POLICY "Users can upload tenant documents in their organization"
  ON tenant_documents
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT t.id FROM tenants t
      INNER JOIN properties p ON t.property_id = p.id
      WHERE p.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update documents for their organization's tenants
CREATE POLICY "Users can update tenant documents in their organization"
  ON tenant_documents
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      INNER JOIN properties p ON t.property_id = p.id
      WHERE p.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can delete documents for their organization's tenants
CREATE POLICY "Users can delete tenant documents in their organization"
  ON tenant_documents
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      INNER JOIN properties p ON t.property_id = p.id
      WHERE p.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Everyone can read document requirements (reference data)
CREATE POLICY "Anyone can read document requirements"
  ON tenant_document_requirements
  FOR SELECT
  USING (true);

-- =====================================================
-- 6. STORAGE BUCKET SETUP
-- =====================================================
-- NOTE: Storage buckets must be created via Supabase Dashboard or API
-- This is documentation of what needs to be created:

-- Bucket Name: tenant-documents
-- Public: No (private)
-- File Size Limit: 50MB
-- Allowed MIME types: 
--   - application/pdf
--   - image/jpeg, image/jpg, image/png
--   - application/msword
--   - application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- Storage Path Structure:
-- tenant-documents/
--   ├── {organization_id}/
--   │   ├── {tenant_id}/
--   │   │   ├── id_proof/
--   │   │   ├── right_to_rent/
--   │   │   ├── bank_statements/
--   │   │   ├── references/
--   │   │   ├── guarantor/
--   │   │   └── tenancy/

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to check if tenant has all required documents
CREATE OR REPLACE FUNCTION check_tenant_required_documents(
  p_tenant_id UUID,
  p_country_code TEXT
) RETURNS TABLE (
  document_type TEXT,
  document_label TEXT,
  is_required BOOLEAN,
  is_uploaded BOOLEAN,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    req.document_type,
    req.document_label,
    req.is_required,
    CASE 
      WHEN doc.id IS NOT NULL THEN true 
      ELSE false 
    END as is_uploaded,
    COALESCE(doc.status, 'pending') as status
  FROM tenant_document_requirements req
  LEFT JOIN tenant_documents doc 
    ON doc.tenant_id = p_tenant_id 
    AND doc.document_type = req.document_type
  WHERE req.country_code = p_country_code
    AND (req.required_for_onboarding = true OR req.required_for_existing = true)
  ORDER BY req.order_index;
END;
$$ LANGUAGE plpgsql;

-- Function to get document expiry alerts
CREATE OR REPLACE FUNCTION get_expiring_tenant_documents(
  p_days_ahead INTEGER DEFAULT 30
) RETURNS TABLE (
  document_id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  document_type TEXT,
  document_name TEXT,
  expiry_date DATE,
  days_until_expiry INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    td.id as document_id,
    td.tenant_id,
    t.name as tenant_name,
    td.document_type,
    td.document_name,
    td.expiry_date,
    (td.expiry_date - CURRENT_DATE) as days_until_expiry
  FROM tenant_documents td
  INNER JOIN tenants t ON td.tenant_id = t.id
  WHERE td.expiry_date IS NOT NULL
    AND td.expiry_date <= CURRENT_DATE + p_days_ahead
    AND td.expiry_date >= CURRENT_DATE
    AND td.status = 'verified'
  ORDER BY td.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tenant_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_documents_updated_at
  BEFORE UPDATE ON tenant_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_documents_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- To verify the migration:
-- SELECT * FROM tenant_document_requirements WHERE country_code = 'UK';
-- SELECT check_tenant_required_documents('tenant-uuid-here', 'UK');

