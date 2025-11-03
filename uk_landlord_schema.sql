-- =====================================================
-- UK Landlord Property Management Database Schema
-- Simplified schema for small retail landlords
-- Supports: UK (primary), Greece, USA (placeholders)
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS rent_payments CASCADE;
DROP TABLE IF EXISTS compliance_certificates CASCADE;
DROP TABLE IF EXISTS inspections CASCADE;
DROP TABLE IF EXISTS repairs CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- =====================================================
-- 1. USER PREFERENCES
-- =====================================================
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  country_code TEXT NOT NULL DEFAULT 'UK' CHECK (country_code IN ('UK', 'GR', 'US')),
  user_type TEXT NOT NULL DEFAULT 'direct_landlord' CHECK (user_type IN ('direct_landlord', 'agent_using_landlord', 'property_manager')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. AGENTS (Letting Agents/Property Managers)
-- =====================================================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  
  -- Services provided
  services_tenant_finding BOOLEAN DEFAULT false,
  services_rent_collection BOOLEAN DEFAULT false,
  services_property_management BOOLEAN DEFAULT false,
  services_maintenance BOOLEAN DEFAULT false,
  
  -- Financial
  commission_percentage DECIMAL(5, 2), -- e.g., 10.00 for 10%
  monthly_management_fee DECIMAL(10, 2),
  
  -- Contract
  contract_start_date DATE,
  contract_end_date DATE,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. PROPERTIES
-- =====================================================
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Country support
  country_code TEXT NOT NULL DEFAULT 'UK' CHECK (country_code IN ('UK', 'GR', 'US')),
  
  -- Basic Information
  address TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT,
  county_state TEXT, -- County (UK), State (US), Region (GR)
  postcode TEXT,
  
  -- Property Type
  property_type TEXT NOT NULL DEFAULT 'house' CHECK (property_type IN ('house', 'flat', 'hmo', 'studio', 'other')),
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_meters DECIMAL(10, 2),
  
  -- HMO Support
  is_hmo BOOLEAN DEFAULT false,
  hmo_license_number TEXT,
  hmo_license_expiry DATE,
  units JSONB, -- For HMO: [{name, area, target_rent}]
  
  -- UK-Specific Fields
  council_tax_band TEXT, -- A-H for UK
  council_tax_annual DECIMAL(10, 2),
  
  -- Financial
  purchase_price DECIMAL(15, 2),
  purchase_date DATE,
  current_value DECIMAL(15, 2),
  monthly_rent DECIMAL(10, 2),
  
  -- Agent Information
  agent_id UUID REFERENCES agents(id),
  agent_managed BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance', 'sold')),
  
  -- Tracking
  tenant_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TENANTS
-- =====================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Country support
  country_code TEXT NOT NULL DEFAULT 'UK' CHECK (country_code IN ('UK', 'GR', 'US')),
  
  -- Personal Information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- UK-Specific
  right_to_rent_checked BOOLEAN DEFAULT false,
  right_to_rent_check_date DATE,
  right_to_rent_expiry DATE,
  
  -- Tenancy Details
  lease_start DATE,
  lease_end DATE,
  monthly_rent DECIMAL(10, 2),
  rent_due_day INTEGER DEFAULT 1, -- Day of month rent is due
  
  -- Deposit
  deposit_amount DECIMAL(10, 2),
  deposit_scheme TEXT, -- e.g., 'MyDeposits', 'DPS', 'TDS'
  deposit_protected_date DATE,
  deposit_certificate_number TEXT,
  
  -- Agent Information (if tenant found via agent)
  found_via_agent_id UUID REFERENCES agents(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'notice_given', 'eviction')),
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. RENT PAYMENTS
-- =====================================================
CREATE TABLE rent_payments (
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

-- Indexes for rent_payments
CREATE INDEX idx_rent_payments_tenant_period ON rent_payments(tenant_id, period_start, period_end);
CREATE INDEX idx_rent_payments_due_date ON rent_payments(due_date);
CREATE INDEX idx_rent_payments_status ON rent_payments(status);

-- =====================================================
-- 6. COMPLIANCE CERTIFICATES
-- =====================================================
CREATE TABLE compliance_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Country support
  country_code TEXT NOT NULL DEFAULT 'UK' CHECK (country_code IN ('UK', 'GR', 'US')),
  
  -- Certificate Type
  certificate_type TEXT NOT NULL,
  -- UK: gas_safety, eicr, epc, deposit_protection, right_to_rent, legionella, smoke_alarms, co_alarms, fire_safety_hmo, hmo_license
  -- GR: epc_greece, building_permit, tax_clearance
  -- US: lead_paint, smoke_detectors_us, local_permits
  
  -- Certificate Details
  certificate_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'expiring_soon', 'expired', 'not_required', 'pending')),
  
  -- Contractor/Inspector
  contractor_name TEXT,
  contractor_company TEXT,
  contractor_phone TEXT,
  contractor_email TEXT,
  
  -- Document
  document_url TEXT,
  
  -- Reminder
  reminder_sent BOOLEAN DEFAULT false,
  reminder_date DATE,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. INSPECTIONS
-- =====================================================
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  
  -- Inspection Details
  type TEXT NOT NULL CHECK (type IN ('routine', 'move_in', 'move_out', 'maintenance', 'compliance')),
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  
  -- Inspector
  inspector_name TEXT,
  inspector_company TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  
  -- Findings
  findings TEXT,
  issues_found TEXT[],
  photos_urls TEXT[],
  
  -- Follow-up
  requires_followup BOOLEAN DEFAULT false,
  followup_notes TEXT,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. REPAIRS & MAINTENANCE
-- =====================================================
CREATE TABLE repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  
  -- Repair Details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- e.g., 'plumbing', 'electrical', 'heating', 'structural', 'appliance', 'other'
  
  -- Priority
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'acknowledged', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  
  -- Dates
  reported_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_date DATE,
  completed_date DATE,
  
  -- Contractor
  contractor_name TEXT,
  contractor_company TEXT,
  contractor_phone TEXT,
  
  -- Cost
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  
  -- Emergency
  is_emergency BOOLEAN DEFAULT false,
  
  -- Photos/Documents
  photos_urls TEXT[],
  invoice_url TEXT,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. EXPENSES
-- =====================================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Expense Details
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'maintenance', 'insurance', 'property_tax', 'mortgage', 'agent_fees', 'utilities', 'other'
  amount DECIMAL(10, 2) NOT NULL,
  expense_date DATE NOT NULL,
  
  -- Tax
  is_tax_deductible BOOLEAN DEFAULT true,
  
  -- Payment
  payment_method TEXT,
  payment_reference TEXT,
  
  -- Document
  receipt_url TEXT,
  invoice_url TEXT,
  
  -- Linked to repair
  repair_id UUID REFERENCES repairs(id),
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Properties
CREATE INDEX idx_properties_country ON properties(country_code);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_agent ON properties(agent_id);
CREATE INDEX idx_properties_is_hmo ON properties(is_hmo);

-- Tenants
CREATE INDEX idx_tenants_property ON tenants(property_id);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_country ON tenants(country_code);

-- Rent Payments
CREATE INDEX idx_rent_payments_tenant ON rent_payments(tenant_id);
CREATE INDEX idx_rent_payments_property ON rent_payments(property_id);
CREATE INDEX idx_rent_payments_status ON rent_payments(status);
CREATE INDEX idx_rent_payments_due_date ON rent_payments(due_date);

-- Compliance
CREATE INDEX idx_compliance_property ON compliance_certificates(property_id);
CREATE INDEX idx_compliance_type ON compliance_certificates(certificate_type);
CREATE INDEX idx_compliance_status ON compliance_certificates(status);
CREATE INDEX idx_compliance_expiry ON compliance_certificates(expiry_date);

-- Inspections
CREATE INDEX idx_inspections_property ON inspections(property_id);
CREATE INDEX idx_inspections_scheduled_date ON inspections(scheduled_date);
CREATE INDEX idx_inspections_status ON inspections(status);

-- Repairs
CREATE INDEX idx_repairs_property ON repairs(property_id);
CREATE INDEX idx_repairs_status ON repairs(status);
CREATE INDEX idx_repairs_priority ON repairs(priority);

-- Expenses
CREATE INDEX idx_expenses_property ON expenses(property_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- =====================================================
-- SAMPLE DATA (Optional - for development)
-- =====================================================

-- Sample UK Property
INSERT INTO properties (
  country_code, address, city, county_state, postcode,
  property_type, bedrooms, bathrooms, square_meters,
  council_tax_band, monthly_rent, status
) VALUES (
  'UK', '123 Oak Street', 'Manchester', 'Greater Manchester', 'M1 2AB',
  'house', 3, 2, 120.5,
  'C', 1200.00, 'vacant'
);

-- Sample Greece Property (Placeholder)
INSERT INTO properties (
  country_code, address, city, county_state, postcode,
  property_type, bedrooms, bathrooms, square_meters,
  monthly_rent, status
) VALUES (
  'GR', '45 Aristotelous Street', 'Athens', 'Attica', '10431',
  'flat', 2, 1, 85.0,
  850.00, 'vacant'
);

-- Sample USA Property (Placeholder)
INSERT INTO properties (
  country_code, address, city, county_state, postcode,
  property_type, bedrooms, bathrooms, square_meters,
  monthly_rent, status
) VALUES (
  'US', '789 Main Street', 'Austin', 'Texas', '78701',
  'house', 3, 2, 150.0,
  2200.00, 'vacant'
);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE properties IS 'Rental properties across UK, Greece, and USA';
COMMENT ON TABLE tenants IS 'Tenants renting properties';
COMMENT ON TABLE rent_payments IS 'Rent payment tracking';
COMMENT ON TABLE compliance_certificates IS 'Safety and legal compliance certificates';
COMMENT ON TABLE inspections IS 'Property inspections';
COMMENT ON TABLE repairs IS 'Maintenance and repair requests';
COMMENT ON TABLE expenses IS 'Property-related expenses';
COMMENT ON TABLE agents IS 'Letting agents and property managers';
COMMENT ON TABLE user_preferences IS 'User country and type preferences';

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================

