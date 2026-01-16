-- =====================================================
-- Supabase Auth & Multi-Tenant Organizations Migration
-- Adds organization support with proper RLS
-- =====================================================

-- =====================================================
-- 1. USER PROFILES (extends auth.users)
-- =====================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  has_completed_onboarding BOOLEAN DEFAULT false,
  onboarding_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_user_profiles_onboarding ON user_profiles(has_completed_onboarding);

-- RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. ORGANIZATIONS (tenant isolation)
-- =====================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_organizations_created_by ON organizations(created_by);

-- RLS for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can view organizations they're members of
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

-- Users can create organizations
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only owners can update organizations
CREATE POLICY "Owners can update organizations"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
      AND organization_members.status = 'active'
    )
  );

-- =====================================================
-- 3. ORGANIZATION MEMBERS (user-org relationships)
-- =====================================================
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Indexes for faster lookups
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_status ON organization_members(status);

-- RLS for organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of their organizations
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Owners can insert new members
CREATE POLICY "Owners can add members"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_members.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
      AND organization_members.status = 'active'
    )
    OR auth.uid() = user_id -- Allow users to join when accepting invitations
  );

-- Owners can update members
CREATE POLICY "Owners can update members"
  ON organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.status = 'active'
    )
  );

-- Owners can delete members
CREATE POLICY "Owners can remove members"
  ON organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.status = 'active'
    )
  );

-- =====================================================
-- 4. ORGANIZATION INVITATIONS (pending invites)
-- =====================================================
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token UUID UNIQUE DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX idx_org_invitations_status ON organization_invitations(status);

-- RLS for organization_invitations
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations for their organizations
CREATE POLICY "Users can view invitations for their organizations"
  ON organization_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Owners can create invitations
CREATE POLICY "Owners can create invitations"
  ON organization_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
      AND organization_members.status = 'active'
    )
  );

-- Anyone can update invitations they received (to accept them)
CREATE POLICY "Users can update their own invitations"
  ON organization_invitations FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
      AND organization_members.status = 'active'
    )
  );

-- =====================================================
-- 5. UPDATE EXISTING TABLES - Add organization_id
-- =====================================================

-- Add organization_id to properties
ALTER TABLE properties 
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_properties_organization_id ON properties(organization_id);

-- Add organization_id to tenants
ALTER TABLE tenants 
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_tenants_organization_id ON tenants(organization_id);

-- Add organization_id to expenses (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
  END IF;
END $$;

-- Add organization_id to rent_payments (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rent_payments') THEN
    ALTER TABLE rent_payments 
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_rent_payments_organization_id ON rent_payments(organization_id);
  END IF;
END $$;

-- Add organization_id to repairs (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repairs') THEN
    ALTER TABLE repairs 
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_repairs_organization_id ON repairs(organization_id);
  END IF;
END $$;

-- Add organization_id to inspections (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections') THEN
    ALTER TABLE inspections 
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_inspections_organization_id ON inspections(organization_id);
  END IF;
END $$;

-- Add organization_id to compliance_certificates (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_certificates') THEN
    ALTER TABLE compliance_certificates 
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_compliance_certificates_organization_id ON compliance_certificates(organization_id);
  END IF;
END $$;

-- =====================================================
-- 6. ROW LEVEL SECURITY for existing tables
-- =====================================================

-- Properties RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's properties" ON properties;
CREATE POLICY "Users can view their organization's properties"
  ON properties FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can insert properties in their organization" ON properties;
CREATE POLICY "Users can insert properties in their organization"
  ON properties FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can update their organization's properties" ON properties;
CREATE POLICY "Users can update their organization's properties"
  ON properties FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can delete their organization's properties" ON properties;
CREATE POLICY "Users can delete their organization's properties"
  ON properties FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Tenants RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's tenants" ON tenants;
CREATE POLICY "Users can view their organization's tenants"
  ON tenants FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can insert tenants in their organization" ON tenants;
CREATE POLICY "Users can insert tenants in their organization"
  ON tenants FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can update their organization's tenants" ON tenants;
CREATE POLICY "Users can update their organization's tenants"
  ON tenants FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can delete their organization's tenants" ON tenants;
CREATE POLICY "Users can delete their organization's tenants"
  ON tenants FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Apply RLS to other tables if they exist
DO $$ 
BEGIN
  -- Expenses RLS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their organization's expenses" ON expenses;
    CREATE POLICY "Users can view their organization's expenses"
      ON expenses FOR ALL
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;

  -- Rent Payments RLS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rent_payments') THEN
    ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their organization's rent payments" ON rent_payments;
    CREATE POLICY "Users can view their organization's rent payments"
      ON rent_payments FOR ALL
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;

  -- Repairs RLS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repairs') THEN
    ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their organization's repairs" ON repairs;
    CREATE POLICY "Users can view their organization's repairs"
      ON repairs FOR ALL
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;

  -- Inspections RLS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections') THEN
    ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their organization's inspections" ON inspections;
    CREATE POLICY "Users can view their organization's inspections"
      ON inspections FOR ALL
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;

  -- Compliance Certificates RLS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_certificates') THEN
    ALTER TABLE compliance_certificates ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their organization's compliance certificates" ON compliance_certificates;
    CREATE POLICY "Users can view their organization's compliance certificates"
      ON compliance_certificates FOR ALL
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_id_param UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  role TEXT,
  joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    om.role,
    om.joined_at
  FROM organizations o
  INNER JOIN organization_members om ON om.organization_id = o.id
  WHERE om.user_id = user_id_param AND om.status = 'active'
  ORDER BY om.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is organization owner
CREATE OR REPLACE FUNCTION is_organization_owner(org_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id_param
    AND user_id = user_id_param
    AND role = 'owner'
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. TRIGGERS for updated_at
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all new tables
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_invitations_updated_at
  BEFORE UPDATE ON organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Note: After running this migration:
-- 1. Existing data will have NULL organization_id
-- 2. You'll need to either:
--    a) Assign existing data to organizations
--    b) Allow NULL organization_id temporarily with custom RLS
-- 3. Configure Supabase Auth email templates for magic links
-- 4. Update application code to use new auth flow

