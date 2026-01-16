-- =====================================================
-- PROPERTY DOCUMENTS STORAGE SETUP
-- =====================================================
-- This creates storage for property-specific documents like:
-- - Title deeds, surveys, insurance, mortgages (UK)
-- - Building permits, cadastral docs (Greece)  
-- - Property deeds, title insurance (USA)
-- Separate from compliance certificates and tenant documents
-- =====================================================

-- =====================================================
-- STEP 1: Create property_documents table
-- =====================================================

CREATE TABLE IF NOT EXISTS property_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Document metadata
  document_type_id text NOT NULL, -- e.g., 'title_deeds', 'epc', 'building_permit'
  document_type_name text NOT NULL, -- e.g., 'Title Deeds', 'Energy Performance Certificate'
  
  -- File information
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL, -- MIME type
  storage_path text NOT NULL UNIQUE, -- Path in storage bucket
  
  -- Metadata
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now(),
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_property_documents_property_id ON property_documents(property_id);
CREATE INDEX idx_property_documents_organization_id ON property_documents(organization_id);
CREATE INDEX idx_property_documents_document_type ON property_documents(document_type_id);
CREATE INDEX idx_property_documents_uploaded_at ON property_documents(uploaded_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_property_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_property_documents_updated_at
  BEFORE UPDATE ON property_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_property_documents_updated_at();

-- =====================================================
-- STEP 2: Row Level Security Policies
-- =====================================================

-- Enable RLS
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view property documents in their organization
CREATE POLICY "Users can view property documents in their organization"
  ON property_documents
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can upload property documents for their organization's properties
CREATE POLICY "Users can upload property documents in their organization"
  ON property_documents
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
    AND property_id IN (
      SELECT id FROM properties 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update property documents in their organization
CREATE POLICY "Users can update property documents in their organization"
  ON property_documents
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete property documents in their organization
CREATE POLICY "Users can delete property documents in their organization"
  ON property_documents
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 3: Storage Bucket Policies (run AFTER creating bucket)
-- =====================================================
-- FIRST: Create the bucket in Supabase Dashboard:
-- Name: property-documents
-- Public: NO (Private)
-- File Size Limit: 52428800 (50MB)
--
-- THEN run these policies:
-- =====================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload property documents for their organization
CREATE POLICY "Users can upload property documents for their organization"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can read their organization's property documents
CREATE POLICY "Users can view property documents for their organization"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update their organization's property documents
CREATE POLICY "Users can update property documents for their organization"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete their organization's property documents
CREATE POLICY "Users can delete property documents for their organization"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- STEP 4: Helper Functions
-- =====================================================

-- Get all documents for a property
CREATE OR REPLACE FUNCTION get_property_documents(p_property_id uuid)
RETURNS TABLE (
  id uuid,
  document_type_id text,
  document_type_name text,
  file_name text,
  file_size bigint,
  file_type text,
  uploaded_at timestamptz,
  uploaded_by_email text,
  notes text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.id,
    pd.document_type_id,
    pd.document_type_name,
    pd.file_name,
    pd.file_size,
    pd.file_type,
    pd.uploaded_at,
    COALESCE(up.email, 'Unknown') as uploaded_by_email,
    pd.notes
  FROM property_documents pd
  LEFT JOIN user_profiles up ON pd.uploaded_by = up.id
  WHERE pd.property_id = p_property_id
  ORDER BY pd.uploaded_at DESC;
END;
$$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after setup to verify everything works:
--
-- 1. Check table exists:
-- SELECT * FROM property_documents LIMIT 1;
--
-- 2. Check storage bucket exists:
-- SELECT * FROM storage.buckets WHERE name = 'property-documents';
--
-- 3. Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'property_documents';
--
-- 4. Test the helper function:
-- SELECT * FROM get_property_documents('your-property-id');

